const nacl = require('tweetnacl');
const scrypt = require('scrypt-async');
const aesjs = require('aes-js');
const { parsedJsonFile } = require('./handlefile');
require('./global');

const converHexToBytes = (hexkey) => {
  return aesjs.utils.hex.toBytes(hexkey);
};

const converByteToHex = (byteskey) => {
  return aesjs.utils.hex.fromBytes(byteskey);
};

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

const generateRawKey = async (password, ed25519Key) => {
  let ed25519randomkey = {};
  if (ed25519Key) ed25519randomkey = ed25519Key;
  else ed25519randomkey = generateEd25519Key();
  const hexkeyaes = await deriveKeyAESPass(password);
  const byteskeyaes = converHexToBytes(hexkeyaes);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  const encryptedBytes = aesCtr.encrypt(ed25519randomkey.secretKey);
  const encryptedHex = converByteToHex(encryptedBytes);
  return {
    publicKey: converByteToHex(ed25519randomkey.publicKey),
    cipherSecretKey: encryptedHex,
  };
};

const generateSignKey = (rawkey) => {
  const signingKey = {};
  signingKey.public_key = rawkey.publicKey;
  signingKey.private_key_cipher_text = rawkey.cipherSecretKey;
  signingKey.scrypt_params = {
    n: 2048,
    r: 8,
    p: 1,
    salt: 'salt',
  };
  return signingKey;
};

const generateKeyPair = async (encryptedHex, password) => {
  const hexkeyaes = await deriveKeyAESPass(password);
  const byteskeyaes = converHexToBytes(hexkeyaes);

  const encryptedBytes = converHexToBytes(encryptedHex);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  return nacl.sign.keyPair.fromSecretKey(decryptedBytes);
};

const validatePassword = async (filepath, password) => {
  const jsonData = parsedJsonFile(filepath);
  const publickeyHex = jsonData.public_key;
  const encryptedHex = jsonData.private_key_cipher_text;
  const keyPair = await generateKeyPair(encryptedHex, password);
  global.signingKey = {};
  global.signingKey = keyPair;
  global.signingKey.name = jsonData.name;
  global.signingKey.version = jsonData.version;
  if (converByteToHex(keyPair.publicKey) !== publickeyHex) {
    console.log('\nWrong password ...');
    return false;
  }
  return true;
};

const generateSignKeyWithOtherPass = async (newpassword, oldkey) => {
  let rawkey = {};
  if (oldkey) rawkey = await generateRawKey(newpassword, oldkey);
  else rawkey = await generateRawKey(newpassword, { publicKey: global.signingKey.publicKey, secretKey: global.signingKey.secretKey });
  return generateSignKey(rawkey);
};

module.exports = {
  generateEd25519Key,
  deriveKeyAESPass,
  validatePassword,
  generateRawKey,
  generateSignKey,
  generateKeyPair,
  converHexToBytes,
  converByteToHex,
  generateSignKeyWithOtherPass,
};
