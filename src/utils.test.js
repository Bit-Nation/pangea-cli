const scrypt = require('scrypt-async');
const aes = require('aes-js');
const createHmac = require('create-hmac');
const crypto = require('crypto');
const tweetnacl = require('tweetnacl');

const {
  encryptValue,
  decryptValue,
  isInvalidValidPassword,
  hashDappContent,
} = require('./utils');

const dAppContent = {
  name: { 'en-us': 'DApp Name', de: 'DApp Name' },
  engine: '0.1.0',
  image: 'iVBORw0KGgoAAAANSUhEUgAAAH0AAAB9CAYAAACPg',
  used_signing_key:
    '16a6e448c2e1e209ab559232a98e3d0c25030e05158c22710c207fec1f2e4fbf',
  code: 'get:function(){return"Text"}',
};

// hash string that computed from dAppContent
const hexStringHashDapp =
  '1678646544417070204e616d65656e2d757344417070204e616d6516a6e448c2e1e209ab559232a98e3d0c25030e05158c22710c207fec1f2e4fbf6765743a66756e6374696f6e28297b72657475726e2254657874227d89504e470d0a1a0a0000000d494844520000007d0000007d08060000008f302e312e30';

describe('utils', () => {
  test('hashDappContent', () => {
    const hashDapp = Buffer.from(hexStringHashDapp, 'hex');
    // expect fail if dapp content change value 1 of the its fields
    expect(hashDappContent({ ...dAppContent, engine: '0.0.1' })).not.toEqual(
      hashDapp,
    );

    expect(
      hashDappContent({
        ...dAppContent,
        name: { de: 'not the same with dAppContent' },
      }),
    ).not.toEqual(hashDapp);

    expect(
      hashDappContent({
        ...dAppContent,
        image: 'not the same with dAppContent',
      }),
    ).not.toEqual(hashDapp);

    expect(
      hashDappContent({
        ...dAppContent,
        used_signing_key: 'not the same with dAppContent',
      }),
    ).not.toEqual(hashDapp);

    expect(
      hashDappContent({
        ...dAppContent,
        code: 'not the same with dAppContent',
      }),
    ).not.toEqual(hashDapp);

    // expect same hash value if the content is the same
    expect(hashDappContent(dAppContent)).toEqual(hashDapp);

    expect(
      hashDappContent({
        ...dAppContent,
        name: { de: 'DApp Name', 'en-us': 'DApp Name' },
      }),
    ).toEqual(hashDapp);
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
