#!/usr/bin/env node
// @flow
const fs = require('fs');
const program = require('commander');
const { prompt } = require('inquirer');
const { saveNewKey, changePassword } = require('./src/app');
const { validatePassword } = require('./src/general');

const checkPathExist = (dir) => {
  if (!fs.existsSync(`${__dirname}/${dir}`)) {
    fs.mkdirSync(`${__dirname}/${dir}`);
  }
};

const generateNewSigningKey = [
  {
    type: 'input',
    name: 'path',
    message: 'Enter key name ...',
    default: `${__dirname}/keypath/SIGNING_KEY`,
  },
  {
    type: 'password',
    name: 'password',
    message: 'Enter password ...',
  },
  {
    type: 'password',
    name: 'repassword',
    message: 'ReEnter password ...',
  },
];

const changePasswordSigningKey = [
  {
    type: 'input',
    name: 'path',
    message: 'Select a signing key for your ...',
  },
  {
    type: 'password',
    name: 'oldpassword',
    message: 'Enter old password ...',
    validate: (input, answers) => {
      const validate = validatePassword(answers.path, input);
      return validate;
    },
  },
  {
    type: 'password',
    name: 'newpassword',
    message: 'Enter new password ...',
  },
  {
    type: 'password',
    name: 'renewpassword',
    message: 'ReEnter new password ...',
  },
];

program
  .version('0.0.1', '-v, --version');

program
  .command('sk:new')
  .alias('k')
  .description('Generate new signing key')
  .action(() => {
    prompt(generateNewSigningKey).then((answers) => {
      const answersPath = answers.path.trim();
      let dir = answersPath;
      if (answersPath === `${__dirname}/keypath/SIGNING_KEY`) {
        checkPathExist('keypath');
      } else if (!fs.existsSync(answersPath)) {
        checkPathExist('keypath');
        dir = `${__dirname}/keypath/${answersPath}`;
      }
      if (answers.password === answers.repassword) {
        saveNewKey(dir, answers.password);
      } else console.log('Password do not match. Try again.');
    });
  });

program
  .command('sk:pw')
  .alias('p')
  .description('Change password for signing key')
  .action(() => {
    prompt(changePasswordSigningKey).then((answers) => {
      if (answers.renewpassword !== answers.newpassword) {
        console.log('Sorry! Wrong pass');
      } else {
        changePassword(answers.path, answers.oldpassword, answers.newpassword);
        console.log('Change password success');
      }
    });
  });

program.parse(process.argv);
