jest.mock('tweetnacl', () => {
  return {
    sign: {
      keyPair: jest.fn(),
    },
  };
});

jest.mock('fs', () => {
  return {
    writeFile: jest.fn(),
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

jest.mock('webpack', () => ({}));
jest.mock('./webpack', () => ({ watching: jest.fn() }));

const tweetnacl = require('tweetnacl');
const fs = require('fs');
const {
  newSigningKey,
  signingKeyChangePW,
  streamDApp,
  buildDApp,
} = require('./cliActions');
const { decryptValue } = require('./utils');

const testKeyPair = {
  publicKey: new Uint8Array(
    '40c40e5d1d86be8ee8beb08ad1346666e7504315d335b051610067e7a9a61cc4'
      .match(/.{1,2}/g)
      .map(byte => parseInt(byte, 16)),
  ),
  secretKey: new Uint8Array(
    'edeea410302a10b65e30b0c8e8f5d481296deb2ec9212812e5c24b2932ea41f640c40e5d1d86be8ee8beb08ad1346666e7504315d335b051610067e7a9a61cc4'
      .match(/.{1,2}/g)
      .map(byte => parseInt(byte, 16)),
  ),
};

// password is "testing_1234"
const testSigningKey = {
  name: 'testing_signing_key',
  public_key:
    'ad40f42b086b275d1f59817083f6f716b0326157ead46eed0758d45d2eff20ca',
  private_key_cipher_text: {
    n: 32768,
    r: 8,
    p: 1,
    dk_len: 32,
    salt:
      '1ff4bfe8aa10990cf5dd22abac2cf95424a272bc611e2c03bfbe4a4ccc48bd22c904b545ab8d229e7f90a67bf9d54c6777e3efd6e8a3238cf087b0e2babcbc5e68a0eba1496e70ab7065d539c9e59b3c3e6ae38d0088e1048f64fa47f14d39b7b22211d4c13943bfaa14ccc0e53ddaa9b86e909e20257e5a8ad2c6f9c796e34783ccc7287c368c10ac7b09e78fda5ae2663aab7c6059cfa29fac437500c156bb6fe903a5464ed28608c775f6a089072cd302af5812625c120cc498f7ef036a473d6d64a5361aebd3',
    cipher_text:
      '401534a71ba4e4b8bfa5bf86812ecef51c8e9d08fe4bd3eae2cc2caeb5fbd20f17e272c36434f9a55b7887d42a29eedad6b0f044593b6a10d90188d8378a1e3d85e3b04d6a7b6e02fd474f3a8f6c7097905fc51fd80e42f098547537358650397a4f6a83a303c5783858474435bc434a4817f3b11495b32a135cd87c99345efe',
    mac: '42c16226140b14faefb25ab669b3f8fcf581cfe8ff60eda8ad7c5220e9ce8a9c',
  },
  created_at: 1531643650,
  version: 1,
};

describe('cliActions', () => {
  describe('newSigningKey', () => {
    // test unequal passwords
    test('password miss match', done => {
      newSigningKey({
        pw: 'my password',
        pwConfirmation: 'wrong password confirmation',
      })
        .then(() => {
          done.fail(
            'expected tests to fail since we passed in unequal passwords',
          );
        })
        .catch(err => {
          expect(err.message).toBe(
            'password and password confirmation have to match',
          );
          done();
        });
    });

    // test invalid password
    test('too short password', done => {
      newSigningKey({ pw: 'abc', pwConfirmation: 'abc' })
        .then(() => {
          done.fail('expected tests to fail the password is too short');
        })
        .catch(err => {
          expect(err.message).toBe('password must have at least 8 characters');
          done();
        });
    });

    test('generate successfully', done => {
      tweetnacl.sign.keyPair.mockImplementation(() => {
        return testKeyPair;
      });

      const payload = {
        pw: 'my password',
        pwConfirmation: 'my password',
        skName: 'unit test key pair',
      };

      fs.writeFile.mockImplementation((fileName, signingKeyStr, cb) => {
        const singingKey = JSON.parse(signingKeyStr);

        // make sure the public key is really the public key of the
        // generated key pair
        expect(singingKey.public_key).toBe(
          Buffer.from(testKeyPair.publicKey).toString('hex'),
        );

        decryptValue(singingKey.private_key_cipher_text, 'my password')
          .then(decryptedValue => {
            // make sure decrypted secret key is really the secret key
            expect(decryptedValue.toString()).toBe(
              Buffer.from(testKeyPair.secretKey).toString('hex'),
            );
            cb();
          })
          .catch(cb);
      });

      newSigningKey(payload)
        .then(() => {
          expect(fs.writeFile).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('streamDApp', () => {
    test("should fail if singing key doesn't exist", done => {
      fs.existsSync.mockImplementation(file => {
        expect(file).toBe('i-do-not-exist.json');
        return false;
      });

      streamDApp({}, 'i-do-not-exist.json')
        .then(() => {
          done.fail("expected test to fail since the file doesn't exist");
        })
        .catch(err => {
          expect(err.message).toBe(
            'Signing key ("i-do-not-exist.json") does not exist',
          );
          done();
        });
    });

    test('should fail if entered wrong password', done => {
      fs.readFileSync.mockImplementation((path, enc) => {
        expect(enc).toBe('utf8');
        expect(path).toBe('testing_signing_key-1531643650.sk.json');
        return JSON.stringify(testSigningKey, null, 2);
      });
      fs.existsSync.mockImplementation(file => {
        expect(file).toBe('testing_signing_key-1531643650.sk.json');
        return true;
      });
      streamDApp(
        { pw: 'wrong password' },
        'testing_signing_key-1531643650.sk.json',
      )
        .then(() => {
          done.fail('expected test to fail since password is wrong');
        })
        .catch(err => {
          expect(err.message).toBe('failed to authenticate decrypted value');
          done();
        });
    });
  });

  describe('buildDApp', () => {
    test("should fail if singing key doesn't exist", done => {
      fs.existsSync.mockImplementation(file => {
        expect(file).toBe('i-do-not-exist.json');
        return false;
      });

      buildDApp({}, 'i-do-not-exist.json')
        .then(() => {
          done.fail("expected test to fail since the file doesn't exist");
        })
        .catch(err => {
          expect(err.message).toBe(
            'Signing key ("i-do-not-exist.json") does not exist',
          );
          done();
        });
    });

    test('should fail if entered wrong password', done => {
      fs.readFileSync.mockImplementation((path, enc) => {
        expect(enc).toBe('utf8');
        expect(path).toBe('testing_signing_key-1531643650.sk.json');
        return JSON.stringify(testSigningKey, null, 2);
      });
      fs.existsSync.mockImplementation(file => {
        expect(file).toBe('testing_signing_key-1531643650.sk.json');
        return true;
      });
      buildDApp(
        { pw: 'wrong password' },
        'testing_signing_key-1531643650.sk.json',
      )
        .then(() => {
          done.fail('expected test to fail since password is wrong');
        })
        .catch(err => {
          expect(err.message).toBe('failed to authenticate decrypted value');
          done();
        });
    });
  });

  describe('signingKeyChangePW', () => {
    test("should fail if singing key doesn't exist", done => {
      fs.existsSync.mockImplementation(file => {
        expect(file).toBe('i-do-not-exist.json');
        return false;
      });

      signingKeyChangePW({}, 'i-do-not-exist.json')
        .then(() => {
          done.fail("expected test to fail since the file doesn't exist");
        })
        .catch(err => {
          expect(err.message).toBe(
            'Signing key ("i-do-not-exist.json") does not exist',
          );
          done();
        });
    });

    test('new password too short', done => {
      fs.existsSync.mockImplementation(() => {
        return true;
      });

      signingKeyChangePW({ newPw: 'abc' })
        .then(() => {
          done.fail('expected test to fail since the password it too short');
        })
        .catch(err => {
          expect(err.message).toBe('password must have at least 8 characters');
          done();
        });
    });

    test('new password miss match', done => {
      fs.existsSync.mockImplementation(() => {
        return true;
      });

      signingKeyChangePW({
        newPw: 'my_new_password',
        newPwConfirmation: 'wrong confirmation',
      })
        .then(() => {
          done.fail("expected test to fail since the file doesn't exist");
        })
        .catch(err => {
          expect(err.message).toBe(
            'password and password confirmation have to match',
          );
          done();
        });
    });

    test('change password successfully', done => {
      // make sure test don't exit when checking the path
      fs.existsSync.mockImplementation(() => {
        return true;
      });

      // read signing key mock
      fs.readFileSync.mockImplementation((path, enc) => {
        expect(enc).toBe('utf8');
        expect(path).toBe('testing_signing_key-1531643650.sk.json');
        return JSON.stringify(testSigningKey, null, 2);
      });

      let newEncryptedSigningKey = {};

      // mock the write
      fs.writeFile.mockImplementation((path, signingKey, cb) => {
        // since the file path contains the timestamp we MUST not re use it
        expect(path).not.toBe('testing_signing_key-1531643650.sk.json');
        // when we change the password a new timestamp for created_at will be set
        expect(signingKey.created_at).not.toBe(testSigningKey.created_at);
        newEncryptedSigningKey = JSON.parse(signingKey);
        cb();
      });

      const payload = {
        oldPassword: 'testing_1234',
        newPw: 'my_new_password',
        newPwConfirmation: 'my_new_password',
      };

      decryptValue(testSigningKey.private_key_cipher_text, 'testing_1234')
        .then(async originalSecretValue => {
          // change password of encrypted singing key
          await signingKeyChangePW(
            payload,
            'testing_signing_key-1531643650.sk.json',
          );

          // decrypt singing key again
          const signingKeySecret = await decryptValue(
            newEncryptedSigningKey.private_key_cipher_text,
            'my_new_password',
          );

          // make sure the singing key is the same after changing the password
          expect(signingKeySecret.toString()).toBe(
            originalSecretValue.toString(),
          );

          done();
        })
        .catch(done.fail);
    });
  });
});
