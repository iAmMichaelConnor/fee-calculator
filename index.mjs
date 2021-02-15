/**
 ********* Sample usage from your nodejs code *****************************
 */

// const gql = require('graphql-tag');
// const { createSubscriptionObservable } = require('./subscription-observable.js');

import gql from 'graphql-tag';
import { subscribe, query, mutate } from './subscription-observable.mjs';

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

const SANDBOX_PK = 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g';

const SET_SNARK_WORKER_MUTATION = gql`
  mutation SetSnarkWorker($publicKey: String!) {
    setSnarkWorker(input: { publicKey: $publicKey }) {
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

const arrayAverage = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

async function setSnarkWorkFee(fee) {
  const promise = await mutate(
    {
      query: SET_SNARK_WORK_FEE_MUTATION,
      variables: { fee },
    },
    data => console.log('SUCCESSFULLY SET SNARK WORK FEE with returned data:', data),
    error => console.error('MUTATION SetSnarkWorkFee errored with:', error),
  );
  console.log('promissseeee:', promise)
}

async function setSnarkWorker(publicKey) {
  const promise = await mutate(
    {
      query: SET_SNARK_WORKER_MUTATION,
      variables: { publicKey },
    },
    data => console.log('SUCCESSFULLY SET SNARK WORKER with returned data:', data),
    error => console.error('MUTATION SetSnarkWorker errored with:', error),
  );
  console.log('promissseeee:', promise)
}

function newBlockResponder(data) {
  const {
    data: {
      newBlock: { snarkJobs },
    },
  } = data;
  console.log('SNARK JOBSSSS:', snarkJobs)
  if (snarkJobs === [] || snarkJobs === undefined) {
    console.log('No snarks were added to the block!');
  } else {
    const avg = arrayAverage(snarkJobs);
    const min = Math.min(snarkJobs);
    const max = Math.max(snarkJobs);
    setSnarkWorkFee(max.toString());
  }
}

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

  console.log('subscription:', subscription)
}

// setSnarkWorker(SANDBOX_PK);
setSnarkWorkFee(200);
subscribeToNewBlocks();

//
//
// // import gql from 'graphql-tag';
// import { gql, useSubscription, useMutation } from '@apollo/react-hooks';
//
// // websocket needed for subscriptions
// // See here: https://www.apollographql.com/docs/react/data/subscriptions/
// import wsPackage from '@apollo/client/link/ws/index.js';
//
// const { WebSocketLink } = wsPackage;
//
// const wsLink = new WebSocketLink({
//   uri: 'ws://localhost:3085/graphql',
//   options: {
//     reconnect: true,
//   },
// });
//
// // async function fetchGraphQL(operationsDoc, operationName, variables) {
// //   const result = await fetch(
// //     "http://localhost:3085/graphql",
// //     {
// //       method: "POST",
// //       body: JSON.stringify({
// //         query: operationsDoc,
// //         variables: variables,
// //         operationName: operationName
// //       })
// //     }
// //   );
// //
// //   return await result.json();
// // }
//
// const NEW_BLOCK_SUBSCRIPTION = gql`
//   subscription NewBlock {
//     newBlock {
//       snarkJobs {
//         fee
//       }
//     }
//   }
// `;
//
// const SANDBOX_PK = 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g';
//
// const SET_SNARK_WORKER_MUTATION = gql`
//   mutation SetSnarkWorker($publicKey: String!) {
//     setSnarkWorker(input: { publicKey: $publicKey }) {
//       lastSnarkWorker
//     }
//   }
// `;
//
// const SET_SNARK_WORK_FEE_MUTATION = gql`
//   mutation SetSnarkWorkFee($fee: String!) {
//     setSnarkWorkFee(input: { fee: $fee }) {
//       lastFee
//     }
//   }
// `;
//
// const [setSnarkWorker] = useMutation(SET_SNARK_WORKER_MUTATION, {
//   onCompleted: data => {
//     console.log('SUCCESSFULLY SET SNARK WORKER with returned data:', data);
//   },
//   onError: error => {
//     console.error('MUTATION SetSnarkWorker errored with:', error);
//   },
// });
//
// const [setSnarkWorkFee] = useMutation(SET_SNARK_WORK_FEE_MUTATION, {
//   onCompleted: data => {
//     console.log('SUCCESSFULLY SET SNARK WORK FEE with returned data:', data);
//   },
//   onError: error => {
//     console.error('MUTATION SetSnarkWorkFee errored with:', error);
//   },
// });
//
// const arraryAverage = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
//
// function newBlockResponder(data) {
//   const avg = arrayAverage(data);
//   const min = Math.min(data);
//   const max = Math.max(data);
//   setSnarkWorkFee({ variables: { fee: max.toString() } });
// }
//
// function subscribeToNewBlocks() {
//   useSubscription(NEW_BLOCK_SUBSCRIPTION, {
//     onSubscriptionData: data => {
//       console.log('\n\nnewBlockData', data);
//       newBlockResponder(data);
//     },
//   });
// }
//
// async function start() {
//   console.log('starting...');
//   await wsLink;
//   await setSnarkWorker({ variables: { publicKey: SANDBOX_PK } });
//   await subscribeToNewBlocks();
// }
//
// start();

// const operationsDoc = `
//   query MyQuery {
//     currentSnarkWorker
//     snarkPool {
//       fee
//       prover
//       workIds
//     }
//     syncStatus
//     pendingSnarkWork {
//       workBundle {
//         feeExcess {
//           feeMagnitude
//           sign
//         }
//         supplyIncrease
//         targetLedgerHash
//         workId
//         sourceLedgerHash
//       }
//     }
//     pooledUserCommands
//   }
// `;
//
// function fetchMyQuery() {
//   return fetchGraphQL(
//     operationsDoc,
//     "MyQuery",
//     {}
//   );
// }
//
// async function startFetchMyQuery() {
//   const { errors, data } = await fetchMyQuery();
//
//   if (errors) {
//     // handle those errors like a pro
//     console.error(errors);
//   }
//
//   // do something great with this precious data
//   console.log(data);
// }
//
// startFetchMyQuery();
