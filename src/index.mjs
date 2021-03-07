/* eslint-disable no-constant-condition */

import logTimestamp from 'log-timestamp'; // eslint-disable-line no-unused-vars
// ^^^ it doesn't need to be used; simply importing it has the effect we need.
import config from './config.cjs';
import poll from './utils-poll.mjs';
import { sleep, formatTime } from './utils-time.mjs';
import {
  getSyncStatus,
  getConsensusData,
  getNextBlockProductionTimes,
  setSnarkWorkFee,
  setSnarkWorker,
  stopSnarkWorker,
  subscribeToNewBlocks,
} from './query-wrappers.mjs';
import { mean, median, q75, quantile, max, min } from './stats.mjs';

const {
  RETRY_INTERVAL,
  STOP_SNARK_WORKER_BEFORE,
  BLOCK_PRODUCTION_WINDOW,
  MIN_FEE_THRESHOLD,
  ONE_BILLION,
} = config;
let { LATEST_FEE } = config;
let subscription;
let PK;

// This might not be the best strategy, if the top prover has loads of nodes running for a single public key (because lots of tiny fees might sum to a lot for them, but not for my single node).
// TODO: maybe basing the fee on others isn't possible, since we don't know their setup, and so can't calibrate to be profitable with our setup. We'd need to be able to gauge how many snarks per hour they can produce vs us. Bleurgh.
const getTopProverFee = snarkJobs => {
  const snarkWorkers = snarkJobs.reduce((acc, cur) => {
    const { prover } = cur;
    let { fee } = cur;
    fee = Number(fee);
    const obj = acc[prover];
    if (obj) {
      obj.fees.push(fee);
      obj.totalFees += fee;
    } else {
      acc[prover] = {
        fees: [fee],
        totalFees: fee,
      };
    }
    return acc;
  }, {});
  const feeObj = Object.values(snarkWorkers).reduce((acc, cur) => {
    return acc.totalFees > cur.totalFees ? acc : cur;
  });
  const avgFee = mean(feeObj.fees);
  console.log(`top prover's fees:`, feeObj.fees.toString());
  console.log(`top prover's avg fee:`, avgFee);
  return avgFee;
};

const newBlockResponder = data => {
  const {
    data: {
      newBlock: { snarkJobs },
    },
  } = data;

  console.log('# snark jobs included last block:', snarkJobs?.length);
  if (!snarkJobs?.length) {
    // empty array
    console.log('No snarks were added to the block!');
  } else {
    const fee = getTopProverFee(snarkJobs); // TODO: replace with method you want.

    const feeArr = snarkJobs.map(job => Number(job.fee));
    console.log('feeArr:', feeArr.toString());
    console.log('avg fee:', mean(feeArr));
    console.log('min fee:', min(feeArr));
    console.log('max fee:', max(feeArr));
    console.log('upper quartile fee:', q75(feeArr));
    console.log('95th percentile fee:', quantile(feeArr, 0.95));
    LATEST_FEE = Math.max(quantile(feeArr, 0.95), MIN_FEE_THRESHOLD);
    setSnarkWorkFee(LATEST_FEE.toString());
  }
};

/** @param {Boolean} synced: true: poll until synced or false: poll until NOT synced */
async function pollSyncStatus(synced) {
  console.log(`Polling until ${synced ? 'synced' : 'NOT synced anymore...'}`);
  const syncStatus = await getSyncStatus();
  switch (syncStatus) {
    // case 'CATCHUP': // TODO: REMOVE THIS!!!!
    case 'SYNCED': {
      console.log('SYNC STATUS:', syncStatus);
      return synced;
    }
    default:
      console.log('SYNC STATUS:', syncStatus);
      return !synced;
  }
}

async function pauseSnarkWorker() {
  console.log(`Pausing snark worker...`);
  console.log('Unsubscribing...');
  subscription?.unsubscribe();
  stopSnarkWorker();
}

async function startSnarkWorker() {
  console.log(`Starting snark worker...`);
  await setSnarkWorkFee(LATEST_FEE);
  await setSnarkWorker(PK);
  subscription = subscribeToNewBlocks(newBlockResponder);
}

// all in milliseconds
const estimateTimeUntilNextEpoch = async () => {
  try {
    const {
      consensusTimeNow: { endTime, globalSlot },
      consensusConfiguration: { epochDuration, slotsPerEpoch, slotDuration },
    } = await getConsensusData();
    const slotsUntilNextEpoch = Number(slotsPerEpoch) - Number(globalSlot);
    const timeUntilNextEpoch = slotsUntilNextEpoch * Number(slotDuration);
    return timeUntilNextEpoch;
  } catch (error) {
    console.log('Error estimating time until next epoch.');
    return null;
  }
};

const getNextBlockProductionTime = async () => {
  const times = await getNextBlockProductionTimes();
  console.log('Next block production times:', times);
  console.log('Time now, for reference:', Date.now());
  // An array of times is given, but we only care about the next...
  return times?.[0];
};

async function blockProducerCountdown() {
  while (true) {
    const { startTime, endTime } = (await getNextBlockProductionTime()) ?? {};
    let timeUntilNextBlock;
    if (!startTime) {
      console.log('No more blocks this epoch...');
      const timeUntilNextEpoch = await estimateTimeUntilNextEpoch();
      console.log('Time until next epoch:', formatTime(timeUntilNextEpoch));
      // When we reach the start of the next epoch, we could be the very first block producer. In such cases, we don't want the snark worker to be running, so we'll approach the next epoch tentatively, in the same way as we approach the next block.
      timeUntilNextBlock = timeUntilNextEpoch ?? RETRY_INTERVAL;
    } else {
      timeUntilNextBlock = startTime - Date.now();
    }
    console.log('Time until next block:', formatTime(timeUntilNextBlock), timeUntilNextBlock);

    // by now, we have a time for the next block (or epoch)...
    if (Date.now() >= startTime && Date.now() <= endTime) {
      // we're in the block - try to get it!
      console.log('The next block is happening right now!');
      console.log('Pausing snark work for', formatTime(BLOCK_PRODUCTION_WINDOW));
      pauseSnarkWorker();
      await sleep(BLOCK_PRODUCTION_WINDOW);
    } else if (timeUntilNextBlock < STOP_SNARK_WORKER_BEFORE) {
      // We're close to creating a block!
      const timeUntilRestart = timeUntilNextBlock + BLOCK_PRODUCTION_WINDOW;
      console.log('Pausing snark work for', formatTime(timeUntilRestart));
      pauseSnarkWorker();
      await sleep(timeUntilRestart);
    }

    startSnarkWorker();

    const timeUntilRecalibration = Math.max(
      (timeUntilNextBlock - STOP_SNARK_WORKER_BEFORE) / 2,
      60000,
    ); // approach the time we need to turn off the snark worker, a half interval at a time, up to the last 1 minute, because the timingd
    console.log('Rechecking in ', formatTime(timeUntilRecalibration));
    await sleep(timeUntilRecalibration);
  }
}

export default async function start(pk) {
  PK = pk;
  console.log('CONFIG:', config);

  while (true) {
    await poll(pollSyncStatus, RETRY_INTERVAL, { args: true }); // polls until synced

    blockProducerCountdown();

    await poll(pollSyncStatus, RETRY_INTERVAL * 15, { args: false }); // polling until NOT synced

    pauseSnarkWorker(); // because we must have lost sync
  }
}
