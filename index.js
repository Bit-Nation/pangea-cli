#!/usr/bin/env node
const program = require('commander');
const { prompt } = require('inquirer');
const {
  newSigningKey,
  signingKeyChangePW,
  streamDApp,
  buildDApp,
} = require('./src/cliActions');
const {
  newSigningKeySchema,
  changePasswordSigningKeySchema,
  streamDAppSchema,
  buildDAppSchema,
} = require('./src/promtSchema');

program.version(require(`./package.json`).version, '-v, --version');

program
  .command('sk:new')
  .description('Generate new signing key')
  .action(() => {
    prompt(newSigningKeySchema)
      .then(newSigningKey)
      .then(console.log)
      .catch(err => console.error(err.message));
  });

program
  .command('sk:pw <signing-key-file>')
  .description('Change password of encrypted singing key')
  .action(signingKeyFile => {
    prompt(changePasswordSigningKeySchema)
      .then(answers => {
        return signingKeyChangePW(answers, signingKeyFile);
      })
      .then(console.log)
      .catch(err => console.error(err.message));
  });

program
  .command('dapp:stream <signing-key-file>')
  .option('-d, --dev', 'Development build mode')
  .description('Streaming a DApp')
  .action((signingKeyFile, cmd) => {
    prompt(streamDAppSchema)
      .then(answers => {
        return streamDApp(answers, signingKeyFile, cmd.dev);
      })
      .then(console.log)
      .catch(err => console.error(err.message));
  });

program
  .command('dapp:build <signing-key-file>')
  .option('-d, --dev', 'Development build mode')
  .description('Build a DApp')
  .action((signingKeyFile, cmd) => {
    prompt(buildDAppSchema)
      .then(answers => {
        return buildDApp(answers, signingKeyFile, cmd.dev);
      })
      .then(console.log)
      .catch(err => console.error(err.message));
  });

program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.help();
}
