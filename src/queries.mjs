import gql from 'graphql-tag';

export const NEW_BLOCK_SUBSCRIPTION = gql`
  subscription NewBlock {
    newBlock {
      stateHash
      snarkJobs {
        fee
        prover
        workIds
      }
    }
  }
`;

export const NEXT_BLOCK_PRODUCTION_TIME_QUERY = gql`
  query NextBlockProductionTime {
    daemonStatus {
      nextBlockProduction {
        times {
          epoch
          slot
          globalSlot
          startTime
          endTime
        }
      }
    }
  }
`;

export const CONSENSUS_DATA_QUERY = gql`
  query ConsensusTimeNow {
    daemonStatus {
      consensusTimeNow {
        epoch
        slot
        globalSlot
        startTime
        endTime
      }
      consensusConfiguration {
        epochDuration
        slotsPerEpoch
        slotDuration
      }
    }
  }
`;

export const SYNC_STATUS_QUERY = gql`
  query SyncStatus {
    daemonStatus {
      syncStatus
    }
  }
`;

export const SET_SNARK_WORKER_MUTATION = gql`
  mutation SetSnarkWorker($publicKey: String!) {
    setSnarkWorker(input: { publicKey: $publicKey }) {
      lastSnarkWorker
    }
  }
`;

export const STOP_SNARK_WORKER_MUTATION = gql`
  mutation StopSnarkWorker {
    setSnarkWorker(input: {}) {
      lastSnarkWorker
    }
  }
`;

export const SET_SNARK_WORK_FEE_MUTATION = gql`
  mutation SetSnarkWorkFee($fee: String!) {
    setSnarkWorkFee(input: { fee: $fee }) {
      lastFee
    }
  }
`;
