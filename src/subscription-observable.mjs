import apolloLink from 'apollo-link'; // SEE HERE FOR REALLY IMPORTANT STUFF: https://www.apollographql.com/docs/link/
// https://github.com/hasura/nodejs-graphql-subscriptions-boilerplate
import apolloLinkWS from 'apollo-link-ws';
import apolloLinkHttp from 'apollo-link-http';
import subscriptionsTransportWS from 'subscriptions-transport-ws';
import ws from 'ws';
import fetch from 'node-fetch';

const { execute, makePromise } = apolloLink;
const { WebSocketLink } = apolloLinkWS;
const { HttpLink } = apolloLinkHttp;
const { SubscriptionClient } = subscriptionsTransportWS;

const wsURL = 'ws://localhost:3085/graphql';
const httpURL = 'http://localhost:3085/graphql';

const getWsClient = wsURL => {
  const client = new SubscriptionClient(wsURL, { reconnect: true }, ws);
  return client;
};

const wsLink = new WebSocketLink(getWsClient(wsURL));
const httpLink = new HttpLink({ uri: httpURL, fetch });

/**
 * @param {Operation} operation
 // EXAMPLE OPERATION:
 // const operation = {
 //   query: gql`query { hello }`,
 //   variables: {} //optional
 //   operationName: {} //optional
 //   context: {} //optional
 //   extensions: {} //optional
 // };
 * @param {Observer} observer https://github.com/tc39/proposal-observable
 * @returns {SubscriptionObserver} https://github.com/tc39/proposal-observable
 */
export const subscribe = (operation, observer) => {
  const subscription = execute(wsLink, operation).subscribe(observer);
  return subscription;
};

/**
 * @param {Operation} operation
 // EXAMPLE OPERATION:
 // const operation = {
 //   query: gql`query { hello }`,
 //   variables: {} //optional
 //   operationName: {} //optional
 //   context: {} //optional
 //   extensions: {} //optional
 // };
 * @param {Function} dataCallback
 * @param {Function} errorCallback
 * @returns {SubscriptionObserver}
 * See here: https://www.apollographql.com/docs/link/
 */
export const query = async (operation, dataCallback, errorCallback) => {
  // prettier-ignore
  return makePromise(execute(httpLink, operation)) // http link?
    .then(dataCallback)
    .catch(errorCallback);
};

export const mutate = query;

async function fetchGraphQL(operation) {
  console.log('OPERATION', operation)
  const result = await fetch(httpURL, {
    method: 'POST',
    body: JSON.stringify(operation),
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('RESULLTTTT', result)

  return result.json();
}
