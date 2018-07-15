# pangea-cli

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
TODO: Put more badges here.

> Pangea Command Line Interface Utils

## Table of Contents

- [Security](#security)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Security

## Install
> you need to have at least node version 8.11.3

Install the package with `npm install pangto -g`. 

## Usage

__creating new singing keys__
1. run `pangto sk:new` (sk = singing key)
2. enter all requested data

Signing keys are stored encrypted.
Make sure to remember the password.

__change the password of a signing key__
1. run `pangto sk:pw <signing-key-file>` to change the password of the singing key.
2. enter all requested data

When you change the password of the signing key,
the original key will be kept for security reasons.
You can delete it if you would like to.

## API

## Maintainers

[@florianlenz](https://github.com/florianlenz)

## Contribute

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2018 Bitnation
