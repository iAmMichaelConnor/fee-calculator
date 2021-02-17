import { subscribe, query, mutate } from './subscription-observable.mjs';
import {
  NEW_BLOCK_SUBSCRIPTION,
  NEXT_BLOCK_PRODUCTION_TIME_QUERY,
  CONSENSUS_DATA_QUERY,
  SYNC_STATUS_QUERY,
  SET_SNARK_WORKER_MUTATION,
  STOP_SNARK_WORKER_MUTATION,
  SET_SNARK_WORK_FEE_MUTATION,
} from './queries.mjs';

export async function getSyncStatus() {
  console.log('Calling getSyncStatus...');
  return query(
    { query: SYNC_STATUS_QUERY },
    data => {
      console.log('Received the following syncStatus:', data);
      const {
        data: {
          daemonStatus: { syncStatus },
        },
      } = data;

      return syncStatus;
    },
    error => {
      console.error('SYNC_STATUS query errored with:', error);
      return error;
    },
  );
}
/** @returns {object} a single time object */
export async function getConsensusData() {
  console.log('Calling getConsensusData...');
  return query(
    {
      query: CONSENSUS_DATA_QUERY,
    },
    data => {
      const {
        data: {
          daemonStatus: { consensusTimeNow, consensusConfiguration },
        },
      } = data;

      return { consensusTimeNow, consensusConfiguration };
    },
    error => {
      console.error('QUERY getConsensusData errored with:', error);
      return error;
    },
  );
}

/** @returns {array} of time objects */
export async function getNextBlockProductionTimes() {
  console.log('Calling getNextBlockProductionTimes...');
  return query(
    {
      query: NEXT_BLOCK_PRODUCTION_TIME_QUERY,
    },
    data => {
      const {
        data: {
          daemonStatus: {
            nextBlockProduction: { times },
          },
        },
      } = data;

      return times;
    },
    error => {
      console.error('QUERY getNextBlockProductionTimes errored with:', error);
      return error;
    },
  );
}

export async function setSnarkWorkFee(fee) {
  console.log(`Calling setSnarkWorkFee(${fee})...`);
  return mutate(
    {
      query: SET_SNARK_WORK_FEE_MUTATION,
      variables: { fee },
    },
    data => console.log('SUCCESSFULLY SET SNARK WORK FEE with returned data:', data),
    error => console.error('MUTATION SetSnarkWorkFee errored with:', error),
  );
}

export async function setSnarkWorker(publicKey) {
  console.log(`Calling setSnarkWorker(${publicKey})...`);
  return mutate(
    {
      query: SET_SNARK_WORKER_MUTATION,
      variables: { publicKey },
    },
    data => console.log('SUCCESSFULLY SET SNARK WORKER with returned data:', data),
    error => console.error('MUTATION SetSnarkWorker errored with:', error),
  );
}

export function stopSnarkWorker() {
  console.log(`Calling stopSnarkWorker...`);
  return mutate(
    { query: STOP_SNARK_WORKER_MUTATION },
    data => {
      console.log('SUCCESSFULLY STOPPED SNARK WORKER with returned data:', data);
      return data;
    },
    error => {
      console.error('MUTATION StopSnarkWorker errored with:', error);
      return error;
    },
  );
}

export function subscribeToNewBlocks(responder) {
  console.log(`Calling subscribeToNewBlocks...`);
  const subscription = subscribe(
    {
      query: NEW_BLOCK_SUBSCRIPTION, // Subscription query
      // {id: 1} // Query variables
    },
    {
      next: data => {
        console.log(`NewBlock subscription received new data: ${JSON.stringify(data, null, 2)}`);
        responder(data);
      },
      error: error => console.log(`received error ${error}`),
      complete: () => console.log(`complete`),
    },
  );

  console.log('Subscribed to newBlocks...');
  console.log('subscription:', subscription);
  return subscription;
}
