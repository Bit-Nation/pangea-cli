const scrypt = require('scrypt-async');
const aes = require('aes-js');
const createHmac = require('create-hmac');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const fs = require('fs');
const multihash = require('multihashes');
const crypto = require('crypto');

const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_DK_LEN = 32;
const SCRYPT_N = 32768;

/**
 * @desc Validate given password
 * @param {string} password Password
 * @return {Error} Return when password length is less than 8 characters
 */
const isInvalidValidPassword = password => {
  if (password.length < 8) {
    return new Error('password must have at least 8 characters');
  }
};

/**
 * @desc compute the hash of a DApp build
 * @param {object} dAppBuild
 * @return {Promise} resolve with multi hash (hex) or reject with error
 */
const hashDAppContent = dAppBuild =>
  new Promise((res, rej) => {
    const { name = {} } = dAppBuild;

    const hash = crypto.createHash('sha256');

    // 1. write name into hash
    if (name.length === 0) {
      return rej(new Error(`invalid amount of name translations`));
    }
    Object.keys(name)
      .sort()
      .map(key => {
        //append language code
        hash.update(key, 'utf8');
        //append name
        hash.update(name[key], 'utf8');
      });

    // 2. write used signing key into hash
    if (Buffer.from(dAppBuild.used_signing_key, 'hex').length !== 32) {
      return rej(
        new Error(`invalid used signing key - must be exactly 32 bytes long`),
      );
    }
    hash.update(dAppBuild.used_signing_key, 'hex');

    // 3. write code into hash
    if (typeof dAppBuild.code !== `string`) {
      return rej(new Error(`invalid code - must be of type string`));
    }
    hash.update(dAppBuild.code, 'utf8');

    // 4. write image into hash
    if (typeof dAppBuild.image !== `string`) {
      return rej(new Error(`invalid image - must be of type string`));
    }
    hash.update(dAppBuild.image, 'base64');

    // 5. write engine into hash
    if (typeof dAppBuild.engine !== `string`) {
      return rej(new Error(`invalid engine - must be of type string`));
    }
    hash.update(dAppBuild.engine, 'utf8');

    // 6. write version as string into hash
    if (typeof dAppBuild.version !== `number` || dAppBuild.version < 1) {
      return rej(
        new Error(
          `invalid version - must be of type number and be greater than 1`,
        ),
      );
    }
    hash.update(dAppBuild.version.toString(), 'utf8');

    res(multihash.encode(hash.digest(), 'sha2-256').toString(`hex`));
  });

/**
 * @desc Encrypt a value with the given password
 * @param {string} plainValue the plain value that should be encrypted
 * @param {string} password the password that should be used to encrypt
 * @return {Promise<Object>}
 */
const encryptValue = (plainValue, password) => {
  return new Promise((res, rej) => {
    crypto.randomBytes(200, (err, salt) => {
      if (err) {
        return rej(err);
      }
      scrypt(
        password,
        salt,
        {
          N: SCRYPT_N,
          r: SCRYPT_R,
          p: SCRYPT_P,
          dkLen: SCRYPT_DK_LEN,
        },
        derivedKey => {
          // encrypt given value with derived scrypt key
          const ctr = new aes.ModeOfOperation.ctr(derivedKey);
          const hexCipherText = aes.utils.hex.fromBytes(
            ctr.encrypt(aes.utils.utf8.toBytes(plainValue)),
          );

          // create mac. The mac MUST be created with the cipher text.
          const mac = createHmac('sha256', Buffer.from(derivedKey));
          mac.update(hexCipherText);

          res({
            n: SCRYPT_N,
            r: SCRYPT_R,
            p: SCRYPT_P,
            dk_len: SCRYPT_DK_LEN,
            salt: salt.toString('hex'),
            cipher_text: hexCipherText,
            mac: mac.digest('hex'),
          });
        },
      );
    });
  });
};

/**
 * @desc Check if signing key exist and decrypt it
 * @param  {string} pw password of signing key
 * @param  {string} signingKeyFile signing key file path
 * @return {Promise<Promise>}
 */
const checkExistAndDecryptSigningKey = ({ pw }, signingKeyFile) =>
  new Promise((res, rej) => {
    // make sure singing key exist
    if (!fs.existsSync(signingKeyFile)) {
      return rej(new Error(`Signing key ("${signingKeyFile}") does not exist`));
    }

    // read signing key
    const rawSigningKey = fs.readFileSync(signingKeyFile, 'utf8');
    const signingKey = JSON.parse(rawSigningKey);

    decryptValue(signingKey.private_key_cipher_text, pw)
      .then(res)
      .catch(rej);
  });

/**
 * @desc Decrypt a value that was encrypted using the encrypt function provided by this module
 * @param {object} encValue the encrypted value
 * @param {object} password
 * @return {Promise<Buffer>}
 */
const decryptValue = (encValue, password) => {
  return new Promise((res, rej) => {
    const { n, r, p, dk_len, cipher_text, mac, salt } = encValue;

    scrypt(
      password,
      Buffer.from(salt, 'hex'),
      {
        N: n,
        r: r,
        p: p,
        dkLen: dk_len,
      },
      derivedKey => {
        // decrypt given value with derived scrypt key
        const ctr = new aes.ModeOfOperation.ctr(derivedKey);

        // derive mac for cipher text
        const derivedMac = createHmac('sha256', Buffer.from(derivedKey));
        derivedMac.update(cipher_text);

        // compare mac's to make sure the correct password was chosen
        if (mac !== derivedMac.digest('hex')) {
          return rej(new Error('failed to authenticate decrypted value'));
        }

        res(Buffer.from(ctr.decrypt(Buffer.from(cipher_text, 'hex'))));
      },
    );
  });
};

/**
 * @desc simple util to create a fresh peer id
 * @return {Promise<PeerInfo>}
 */
const createNewPeerInfo = () =>
  new Promise((res, rej) => {
    PeerId.create((err, peerID) => {
      if (err) {
        return rej(err);
      }

      res(new PeerInfo(peerID));
    });
  });

module.exports = {
  encryptValue,
  decryptValue,
  isInvalidValidPassword,
  createNewPeerInfo,
  checkExistAndDecryptSigningKey,
  hashDAppContent,
};
