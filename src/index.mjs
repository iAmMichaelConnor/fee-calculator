import config from 'config';
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

const { RETRY_INTERVAL, STOP_SNARK_WORKER_BEFORE, BLOCK_PRODUCTION_WINDOW } = config;
let { LATEST_FEE } = config;
let subscription;
let PK;

const newBlockResponder = data => {
  const {
    data: {
      newBlock: { snarkJobs },
    },
  } = data;
  console.log('SNARK JOBSSSS:', snarkJobs);
  if (!snarkJobs?.length) {
    // empty array
    console.log('No snarks were added to the block!');
  } else {
    const feeArr = snarkJobs.map(job => Number(job.fee));
    const arrayAverage = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const avg = arrayAverage(feeArr);
    const min = Math.min(feeArr);
    const max = Math.max(feeArr);
    LATEST_FEE = max.toString();
    setSnarkWorkFee(LATEST_FEE);
  }
};

/** @param {Boolean} synced: true: poll until synced or false: poll until NOT synced */
async function pollSyncStatus(synced) {
  console.log(`Polling until ${synced ? 'synced' : 'NOT synced anymore...'}`);
  const syncStatus = await getSyncStatus();
  switch (syncStatus) {
    case 'SYNCED':
    case 'CATCHUP': {
      // TODO: REMOVE THIS!!!!
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

  while (true) {
    await poll(pollSyncStatus, RETRY_INTERVAL, { args: true }); // polls until synced

    blockProducerCountdown();

    await poll(pollSyncStatus, RETRY_INTERVAL, { args: false }); // polling until NOT synced

    pauseSnarkWorker(); // because we must have lost sync
  }
}
