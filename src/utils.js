const scrypt = require('scrypt-async');
const crypto = require('crypto');
const aes = require('aes-js');
const createHmac = require('create-hmac');

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

module.exports = {
  encryptValue,
  decryptValue,
  isInvalidValidPassword,
};
