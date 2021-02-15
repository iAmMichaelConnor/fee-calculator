#!/usr/bin/env -S node

import commander from 'commander';

import start from '../src/index.mjs';

const { Command } = commander;
const program = new Command();

// prettier-ignore
program
  .version('0.0.1')
  .description('Generate a zApp from a decorated solidity file');

// prettier-ignore
program
  .option(
    '--pk <pk>',
    'specify the pk doing snark work',
    '', // default if no option provided
  );

program.parse(process.argv);
const opts = program.opts();

const { pk } = opts;

start(pk);
