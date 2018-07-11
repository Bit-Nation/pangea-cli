const nacl = require('tweetnacl');
const scrypt = require('scrypt-async');
const aesjs = require('aes-js');
const { parsedJsonFile } = require('./handlefile');
require('./global');

const generateEd25519Key = () => {
  return nacl.sign.keyPair();
};

const generatePass = (password) => {
  return new Promise((resolve) => {
    scrypt(password, 'salt', {
      N: 2048,
      r: 8,
      p: 1,
      dkLen: 32,
      encoding: 'hex',
    }, (derivedKey) => {
      resolve(derivedKey);
    });
  });
};

const deriveKeyAESPass = async (password) => {
  const key = await generatePass(password);
  return key;
};

const generateSigningKey = async (password, ed25519Key) => {
  let ed25519randomkey = {};
  if (ed25519Key) ed25519randomkey = ed25519Key;
  else ed25519randomkey = generateEd25519Key();
  const hexkeyaes = await deriveKeyAESPass(password);
  const byteskeyaes = aesjs.utils.hex.toBytes(hexkeyaes);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  const encryptedBytes = aesCtr.encrypt(ed25519randomkey.secretKey);
  const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
  return {
    publicKey: aesjs.utils.hex.fromBytes(ed25519randomkey.publicKey),
    cipherSecretKey: encryptedHex,
  };
};

const validatePassword = async (filepath, password) => {
  const jsonData = parsedJsonFile(filepath);
  const publickeyHex = jsonData.public_key;
  const encryptedHex = jsonData.private_key_cipher_text;
  const hexkeyaes = await deriveKeyAESPass(password);
  const byteskeyaes = aesjs.utils.hex.toBytes(hexkeyaes);

  const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  const keyPair = nacl.sign.keyPair.fromSecretKey(decryptedBytes);
  global.signingKey = {};
  global.signingKey = keyPair;
  global.signingKey.name = jsonData.name;
  global.signingKey.version = jsonData.version;
  if (aesjs.utils.hex.fromBytes(keyPair.publicKey) !== publickeyHex) {
    console.log('\nWrong password ...');
    return false;
  }
  return true;
};

module.exports = {
  generateEd25519Key,
  deriveKeyAESPass,
  validatePassword,
  generateSigningKey,
};
