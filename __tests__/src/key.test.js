const {
  generateRandomSalt,
  generateEd25519Key,
  generateRawKey,
  generateKeyPair,
  convertByteToHex,
  generateSignKey,
  generateSignKeyWithOtherPass,
  decryptAes,
} = require('../../src/general');
const { getNextVersionKey } = require('../../src/handlefile');

const randomEd25519Key = generateEd25519Key();
const randomSalt = convertByteToHex(generateRandomSalt());
const defaultPassword = 'pangea';
const primaryPassword = 'pangea1';

describe('key', () => {
  test('validate keypair', async () => {
    const rawkey = await generateRawKey(defaultPassword, randomEd25519Key, randomSalt);
    const pairkey = await generateKeyPair(defaultPassword, rawkey.cipherSecretKey, randomSalt);
    expect(rawkey.publicKey).toEqual(convertByteToHex(pairkey.publicKey));
  });
  test('validate new key', async () => {
    const rawkey = await generateRawKey(defaultPassword, randomEd25519Key, randomSalt);
    const decryptedBytes = await decryptAes(defaultPassword, rawkey.cipherSecretKey, randomSalt);
    expect(decryptedBytes).toEqual(randomEd25519Key.secretKey);
  });
  test('change password', async () => {
    const rawkey = await generateRawKey(defaultPassword, randomEd25519Key);
    const signingKey = generateSignKey(rawkey);
    const newsigningKey = await generateSignKeyWithOtherPass(primaryPassword, randomEd25519Key);
    expect(signingKey.public_key).toEqual(newsigningKey.public_key);
  });
  test('validate name key', async () => {
    const rawkey = await generateRawKey(defaultPassword, randomEd25519Key);
    const signingKey = generateSignKey(rawkey);
    const newsigningKey = await generateSignKeyWithOtherPass(primaryPassword, randomEd25519Key);
    expect(signingKey.name).toEqual(newsigningKey.name);
  });
  test('validate version key', async () => {
    expect(getNextVersionKey('0.1')).toEqual('0.2');
    expect(getNextVersionKey('0.9')).toEqual('1.0');
  });
});
