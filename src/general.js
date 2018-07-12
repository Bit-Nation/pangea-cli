const nacl = require('tweetnacl');
const scrypt = require('scrypt-async');
const aesjs = require('aes-js');
const secureRandom = require('secure-random')
const { parsedJsonFile } = require('./handlefile');

var _salt;

const convertHexToBytes = (hexkey) => {
  return aesjs.utils.hex.toBytes(hexkey);
};

const convertByteToHex = (byteskey) => {
  return aesjs.utils.hex.fromBytes(byteskey);
};

const generateEd25519Key = () => {
  return nacl.sign.keyPair();
};

const generateRandomSalt = () => {
  return secureRandom.randomArray(200);
};

const generatePass = (password, existSalt) => {
  if (existSalt) {
    _salt = convertHexToBytes(existSalt);
  } else {
    _salt = generateRandomSalt();
  }
  return new Promise((resolve) => {
    scrypt(password, _salt, {
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

const deriveKeyAESPass = async (password, salt) => {
  return await generatePass(password, salt);
};

const encryptAes = async (password, ed25519Key, salt) => {
  const hexkeyaes = await deriveKeyAESPass(password, salt);
  const byteskeyaes = convertHexToBytes(hexkeyaes);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  return aesCtr.encrypt(ed25519Key.secretKey);
};

const decryptAes = async (password, encryptedHex, salt) => {
  const hexkeyaes = await deriveKeyAESPass(password, salt);
  const byteskeyaes = convertHexToBytes(hexkeyaes);

  const encryptedBytes = convertHexToBytes(encryptedHex);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  return aesCtr.decrypt(encryptedBytes);
};

/**
 * 
 * @param  {string} password
 * @param  {Object} ed25519Key
 * @param  {string} salt
 */
const generateRawKey = async (password, ed25519Key, salt) => {
  let ed25519randomkey = {};
  if (ed25519Key) ed25519randomkey = ed25519Key;
  else ed25519randomkey = generateEd25519Key();

  const encryptedBytes = await encryptAes(password, ed25519randomkey, salt);
  return {
    publicKey: convertByteToHex(ed25519randomkey.publicKey),
    cipherSecretKey: convertByteToHex(encryptedBytes),
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
    salt: convertByteToHex(_salt),
  };
  return signingKey;
};

const generateKeyPair = async (password, encryptedHex, salt) => {
  const decryptedBytes = await decryptAes(password, encryptedHex, salt);
  return nacl.sign.keyPair.fromSecretKey(decryptedBytes);
};

/**
 * Generate pair-key when unencrypted
 * @param  {string} filepath
 * @param  {string} password
 */
const generateOriginKeyFromPassword = async (filepath, password) => {
  const jsonData = parsedJsonFile(filepath);
  const publickeyHex = jsonData.public_key;
  const encryptedHex = jsonData.private_key_cipher_text;
  const salt = jsonData.scrypt_params.salt;
  const keyPair = await generateKeyPair(password, encryptedHex, salt);
  let originKey = {};
  originKey = keyPair;
  originKey.originPublicKey = publickeyHex;
  originKey.salt = jsonData.scrypt_params.salt;
  originKey.name = jsonData.name;
  originKey.version = jsonData.version;
  return originKey;
};

const validatePassword = async (filepath, password) => {
  const originKey = await generateOriginKeyFromPassword(filepath, password);
  if (convertByteToHex(originKey.publicKey) !== originKey.originPublicKey) {
    console.log('\nPassword Incorrect...');
    return false;
  }
  return true;
};

const generateSignKeyWithOtherPass = async (newpassword, oldkey, salt) => {
  const rawkey = await generateRawKey(newpassword, oldkey, salt);
  return generateSignKey(rawkey);
};

module.exports = {
  generateRandomSalt,
  generateEd25519Key,
  deriveKeyAESPass,
  validatePassword,
  generateRawKey,
  generateSignKey,
  generateKeyPair,
  convertHexToBytes,
  convertByteToHex,
  generateSignKeyWithOtherPass,
  generateOriginKeyFromPassword,
  encryptAes,
  decryptAes,
};
