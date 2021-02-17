#!/usr/bin/env -S node

import commander from 'commander';

import startSnarkWorker from '../src/index.mjs';

const { Command } = commander;
const program = new Command();

// prettier-ignore
program
  .version('0.0.1')
  .description('Generate a zApp from a decorated solidity file');

// prettier-ignore
program
  .requiredOption(
    '--pk <pk>',
    'specify the pk doing snark work',
  );

program.parse(process.argv);
const opts = program.opts();

const { pk } = opts;

if (!pk) throw new Error('You need to specify a pk.');

startSnarkWorker(pk);
