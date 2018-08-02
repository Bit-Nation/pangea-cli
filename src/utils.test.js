const scrypt = require('scrypt-async');
const aes = require('aes-js');
const createHmac = require('create-hmac');
const crypto = require('crypto');
const tweetnacl = require('tweetnacl');

const {
  encryptValue,
  decryptValue,
  isInvalidValidPassword,
  hashDAppContent,
} = require('./utils');

describe('utils', () => {
  test('hashDAppContent', done => {
    // we got this hash from our spec test vector
    const expectedHash =
      '122045b810a58b64b3d35e46a30c8b1d80dccb8f04142acb4f6fe86e01792316a3e4';

    // the data is from the spec test vector
    const sampleBuild = {
      name: {
        'en-us': 'send and request money',
        de: 'sende und fordere geld an',
      },
      used_signing_key:
        '110c3ff292fb8ebf0084a9fc1e8c06418ab1c2cbd1058d87e78aa0fcdcbf5791',
      code: 'var wallet = "0x930aa9a843266bdb02847168d571e7913907dd84"',
      image: 'aGk=',
      engine: '1.2.3',
      version: 1,
    };

    hashDAppContent(sampleBuild)
      .then(hash => {
        expect(expectedHash).toBe(hash);
        done();
      })
      .catch(done.fail);
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

  test('should return same message when sign and open sign', () => {
    const keyPair = tweetnacl.sign.keyPair();
    const stringTest = 'string to be signed';
    const signedStringTest = tweetnacl.sign(
      Buffer.from(stringTest, 'utf8'),
      keyPair.secretKey,
    );
    expect(
      Buffer.from(
        tweetnacl.sign.open(signedStringTest, keyPair.publicKey),
      ).toString(),
    ).toBe(stringTest);
  });
});
