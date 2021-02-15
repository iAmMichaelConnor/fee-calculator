/**
 ********* Sample usage from your nodejs code *****************************
 */

// const gql = require('graphql-tag');
// const { createSubscriptionObservable } = require('./subscription-observable.js');

import config from 'config';
import gql from 'graphql-tag';
import { subscribe, query, mutate } from './subscription-observable.mjs';
import poll from './utils-poll.mjs';

let PK = config.BLOCK_PRODUCER_PK; // default

const NEW_BLOCK_SUBSCRIPTION_QUERY = gql`
  subscription NewBlock {
    newBlock {
      stateHash
      stateHashField
      creator
      snarkJobs {
        fee
        prover
        workIds
      }
      transactions {
        feeTransfer
        userCommands
      }
    }
  }
`;

const SYNC_STATUS_QUERY = gql`
  query SyncStatus {
    daemonStatus {
      syncStatus
    }
  }
`;

const SET_SNARK_WORKER_MUTATION = gql`
  mutation SetSnarkWorker($publicKey: String!) {
    setSnarkWorker(input: { publicKey: $publicKey }) {
      lastSnarkWorker
    }
  }
`;

const STOP_SNARK_WORKER_MUTATION = gql`
  mutation StopSnarkWorker {
    setSnarkWorker(input: {}) {
      lastSnarkWorker
    }
  }
`;

const SET_SNARK_WORK_FEE_MUTATION = gql`
  mutation SetSnarkWorkFee($fee: String!) {
    setSnarkWorkFee(input: { fee: $fee }) {
      lastFee
    }
  }
`;

function setSnarkWorkFee(fee) {
  mutate(
    {
      query: SET_SNARK_WORK_FEE_MUTATION,
      variables: { fee },
    },
    data => console.log('SUCCESSFULLY SET SNARK WORK FEE with returned data:', data),
    error => console.error('MUTATION SetSnarkWorkFee errored with:', error),
  );
}

function setSnarkWorker(publicKey) {
  mutate(
    {
      query: SET_SNARK_WORKER_MUTATION,
      variables: { publicKey },
    },
    data => console.log('SUCCESSFULLY SET SNARK WORKER with returned data:', data),
    error => console.error('MUTATION SetSnarkWorker errored with:', error),
  );
}

function stopSnarkWorker() {
  mutate(
    { query: STOP_SNARK_WORKER_MUTATION },
    data => console.log('SUCCESSFULLY STOPPED SNARK WORKER with returned data:', data),
    error => console.error('MUTATION StopSnarkWorker errored with:', error),
  );
}

const newBlockResponder = data => {
  const {
    data: {
      newBlock: { snarkJobs },
    },
  } = data;
  console.log('SNARK JOBSSSS:', snarkJobs);
  if (snarkJobs === [] || snarkJobs === undefined) {
    console.log('No snarks were added to the block!');
  } else {
    const arrayAverage = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const avg = arrayAverage(snarkJobs);
    const min = Math.min(snarkJobs);
    const max = Math.max(snarkJobs);
    setSnarkWorkFee(max.toString());
  }
};

function subscribeToNewBlocks() {
  const subscription = subscribe(
    {
      query: NEW_BLOCK_SUBSCRIPTION_QUERY, // Subscription query
      // {id: 1} // Query variables
    },
    {
      next: data => {
        console.log(`received data: ${JSON.stringify(data, null, 2)}`);
        newBlockResponder(data);
      },
      error: error => console.log(`received error ${error}`),
      complete: () => console.log(`complete`),
    },
  );

  console.log('Subscribed to newBlocks...');
  console.log('subscription:', subscription);
  return subscription;
}

const syncStatusResponder = (data, resolve, synced) => {
  const {
    data: {
      daemonStatus: { syncStatus },
    },
  } = data;
  console.log('SYNC STATUS:', syncStatus);
  switch (syncStatus) {
    case 'SYNCED': {
      resolve(synced);
      break;
    }
    default:
      console.log(`syncStatus = ${syncStatus}...`);
      resolve(!synced);
      break;
  }
};

/** @param {Boolean} synced: true: poll until synced or false: poll until NOT synced */
function pollSyncStatus(synced) {
  console.log(`Polling until ${synced ? 'synced' : 'NOT synced anymore...'}`);
  const queryPromise = async (resolve, reject) => {
    // we wrap the query in a promise, so that the polling function
    // can receive 'false' response upon error.
    query(
      { query: SYNC_STATUS_QUERY },
      data => {
        console.log('Received the following syncStatus:', data);
        syncStatusResponder(data, resolve, synced);
      },
      error => {
        console.error('SYNC_STATUS query errored with:', error);
        resolve(!synced);
      },
    );
  };
  return new Promise(queryPromise);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default async function start(pk) {
  if (pk) PK = pk;
  console.log("PK:", PK);
  while(true) {
    await poll(pollSyncStatus, 20000, true); // arg true gets passed to polling function
    setSnarkWorker(PK);
    setSnarkWorkFee(10);
    const subscription = subscribeToNewBlocks();
    await sleep(5000);
    await poll(pollSyncStatus, 20000, false); // polling until NOT synced
    console.log(`We're not synced anymore!!!`);
    console.log('Unsubscribing...');
    subscription.unsubscribe();
    stopSnarkWorker();
  }
}
