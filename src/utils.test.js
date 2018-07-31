const scrypt = require('scrypt-async');
const aes = require('aes-js');
const createHmac = require('create-hmac');
const crypto = require('crypto');
const tweetnacl = require('tweetnacl');
const multihash = require('multihashes');

const {
  encryptValue,
  decryptValue,
  isInvalidValidPassword,
  getAndSignHashFromMessage,
} = require('./utils');

describe('utils', () => {
  test('getAndSignHashFromMessage', () => {
    // the singing key pair
    const ed25519KeyPair = tweetnacl.sign.keyPair();
    // signed the hash
    const signedHash = getAndSignHashFromMessage(
      'value to encrypt',
      ed25519KeyPair.secretKey,
    );

    const buf = Buffer.from('value to encrypt', 'utf8');
    const hash = multihash.encode(buf, 'sha3-256');
    const signedMessage = tweetnacl.sign(hash, ed25519KeyPair.secretKey);
    //decrypt the signedMessage and check value
    expect(
      Buffer.from(tweetnacl.sign.open(signedMessage, ed25519KeyPair.publicKey)),
    ).toEqual(hash);

    //make sure get the same signedHash with the same input value
    expect(Buffer.from(signedMessage).toString('hex')).toBe(signedHash);
  });

  test('encrypt', done => {
    // encrypt our test value
    encryptValue('value to encrypt', 'password')
      .then(encryptedValue => {
        // those are the values needed
        // to derive the same shared secret
        // via scrypt.
        const { n, r, p, dk_len, salt, cipher_text, mac } = encryptedValue;

        // derive same shared secret that we used to encrypt
        scrypt(
          'password',
          Buffer.from(salt, 'hex'),
          {
            N: n,
            r: r,
            p: p,
            dkLen: dk_len,
          },
          derivedSecret => {
            // decrypt cipher text
            const ctr = new aes.ModeOfOperation.ctr(derivedSecret);
            const plainValue = aes.utils.utf8.fromBytes(
              ctr.decrypt(Buffer.from(cipher_text, 'hex')),
            );

            // make sure value is the one we expect
            expect(plainValue).toBe('value to encrypt');

            // derive mac
            const derivedMac = createHmac('sha256', Buffer.from(derivedSecret));
            derivedMac.update(cipher_text);

            // make sure that the macs are equal
            expect(derivedMac.digest('hex')).toBe(mac);

            done();
          },
        );
      })
      .catch(done.fail);
  });

  test('decrypt successfully', done => {
    const plainValue = 'plainValue';

    crypto.randomBytes(20, (err, salt) => {
      if (err) {
        return done.fail(err);
      }

      scrypt(
        'password',
        Buffer.from(salt, 'hex'),
        {
          N: 32768,
          r: 8,
          p: 1,
          dkLen: 32,
        },
        derivedSecret => {
          // first create encrypted value
          const ctr = new aes.ModeOfOperation.ctr(derivedSecret);
          const hexCipherText = aes.utils.hex.fromBytes(
            ctr.encrypt(aes.utils.utf8.toBytes(plainValue)),
          );

          // create mac
          const mac = createHmac('sha256', Buffer.from(derivedSecret));
          mac.update(hexCipherText);

          const encryptedValue = {
            n: 32768,
            r: 8,
            p: 1,
            dk_len: 32,
            salt: salt.toString('hex'),
            cipher_text: hexCipherText,
            mac: mac.digest('hex'),
          };

          decryptValue(encryptedValue, 'password')
            .then(plainValueBuffer => {
              expect(plainValueBuffer.toString()).toBe(plainValue);

              done();
            })
            .catch(done.fail);
        },
      );
    });
  });

  test('decrypt invalid mac', done => {
    const plainValue = 'plainValue';

    crypto.randomBytes(20, (err, salt) => {
      if (err) {
        return done.fail(err);
      }

      scrypt(
        'password',
        Buffer.from(salt, 'hex'),
        {
          N: 32768,
          r: 8,
          p: 1,
          dkLen: 32,
        },
        derivedSecret => {
          // first create encrypted value
          const ctr = new aes.ModeOfOperation.ctr(derivedSecret);
          const hexCipherText = aes.utils.hex.fromBytes(
            ctr.encrypt(aes.utils.utf8.toBytes(plainValue)),
          );

          // create mac
          const mac = createHmac('sha256', Buffer.from(derivedSecret));
          mac.update(hexCipherText);

          const encryptedValue = {
            n: 32768,
            r: 8,
            p: 1,
            dk_len: 32,
            salt: salt.toString('hex'),
            cipher_text: hexCipherText,
            mac: mac.digest('hex'),
          };

          decryptValue(encryptedValue, 'wrong password')
            .then(() => {
              done.fail(
                'expected the test to fail since we are using an invalid password',
              );
            })
            .catch(err => {
              expect(err.message).toBe(
                'failed to authenticate decrypted value',
              );

              done();
            });
        },
      );
    });
  });

  test('is valid password', () => {
    const expectations = [
      {
        password: 'abc',
        expectation: validationResult => {
          expect(validationResult.message).toBe(
            'password must have at least 8 characters',
          );
        },
      },
      {
        password: 'i am long enough',
        expectation: validationResult => {
          expect(validationResult).toBeUndefined();
        },
      },
    ];

    expectations.map(({ password, expectation }) => {
      expectation(isInvalidValidPassword(password));
    });
  });
});
