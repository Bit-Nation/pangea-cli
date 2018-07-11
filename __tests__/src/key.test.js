const {
  generateEd25519Key,
  generateRawKey,
  generateKeyPair,
  converByteToHex,
  generateSignKey,
  generateSignKeyWithOtherPass,
} = require('../../src/general');

const randomEd25519Key = generateEd25519Key();
const defaultPassword = 'pangea';
const changePassword = 'pangea1';

describe('key', () => {
  test('validate keypair', async () => {
    const rawkey = await generateRawKey(defaultPassword, randomEd25519Key);
    const pairkey = await generateKeyPair(rawkey.cipherSecretKey, defaultPassword);
    expect(rawkey.publicKey).toEqual(converByteToHex(pairkey.publicKey));
  });
  test('change password', async () => {
    const rawkey = await generateRawKey(defaultPassword, randomEd25519Key);
    const signingKey = generateSignKey(rawkey);
    const newsigningKey = await generateSignKeyWithOtherPass(changePassword, randomEd25519Key);
    expect(signingKey.public_key).toEqual(newsigningKey.public_key);
  });
});
