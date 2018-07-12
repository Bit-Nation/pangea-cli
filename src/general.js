const nacl = require('tweetnacl');
const scrypt = require('scrypt-async');
const aesjs = require('aes-js');
const { parsedJsonFile } = require('./handlefile');

const salt = [221, 187, 152, 84, 208, 106, 177, 250, 77, 234, 6, 207, 76, 44, 209, 102, 255, 162, 79, 9, 196, 124, 35, 58, 69, 217, 255, 202, 122, 142, 115, 169, 209, 193, 85, 89, 173, 120, 52, 252, 60, 136, 165, 163, 206, 106, 25, 45, 128, 203, 100, 246, 40, 85, 58, 69, 194, 113, 81, 149, 154, 161, 104, 82, 226, 55, 193, 150, 38, 249, 56, 42, 165, 165, 5, 36, 37, 187, 11, 58, 187, 142, 96, 107, 130, 20, 50, 127, 197, 72, 61, 248, 96, 147, 124, 250, 142, 19, 137, 49, 131, 166, 172, 73, 95, 64, 130, 42, 194, 127, 243, 114, 114, 215, 198, 201, 175, 16, 22, 233, 123, 75, 172, 111, 152, 156, 221, 55, 12, 242, 17, 176, 135, 147, 160, 36, 176, 173, 22, 134, 148, 7, 194, 65, 249, 4, 109, 176, 114, 109, 165, 59, 254, 84, 189, 124, 217, 84, 92, 173, 202, 223, 55, 34, 227, 78, 232, 71, 59, 181, 67, 239, 230, 93, 207, 180, 6, 241, 102, 218, 37, 43, 94, 45, 10, 68, 67, 43, 159, 25, 104, 244, 129, 193, 250, 33, 85, 153, 142, 194];

const convertHexToBytes = (hexkey) => {
  return aesjs.utils.hex.toBytes(hexkey);
};

const convertByteToHex = (byteskey) => {
  return aesjs.utils.hex.fromBytes(byteskey);
};

const generateEd25519Key = () => {
  return nacl.sign.keyPair();
};

const generatePass = (password) => {
  return new Promise((resolve) => {
    scrypt(password, salt, {
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

const encryptAes = async (password, ed25519Key) => {
  const hexkeyaes = await deriveKeyAESPass(password);
  const byteskeyaes = convertHexToBytes(hexkeyaes);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  return aesCtr.encrypt(ed25519Key.secretKey);
};

const decryptAes = async (password, encryptedHex) => {
  const hexkeyaes = await deriveKeyAESPass(password);
  const byteskeyaes = convertHexToBytes(hexkeyaes);

  const encryptedBytes = convertHexToBytes(encryptedHex);
  const aesCtr = new aesjs.ModeOfOperation.ctr(byteskeyaes, new aesjs.Counter(5));
  return aesCtr.decrypt(encryptedBytes);
};

const generateRawKey = async (password, ed25519Key) => {
  let ed25519randomkey = {};
  if (ed25519Key) ed25519randomkey = ed25519Key;
  else ed25519randomkey = generateEd25519Key();

  const encryptedBytes = await encryptAes(password, ed25519randomkey);
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
    salt: convertByteToHex(salt),
  };
  return signingKey;
};

const generateKeyPair = async (password, encryptedHex) => {
  const decryptedBytes = await decryptAes(password, encryptedHex);
  return nacl.sign.keyPair.fromSecretKey(decryptedBytes);
};

const generateOriginKeyFromPassword = async (filepath, password) => {
  const jsonData = parsedJsonFile(filepath);
  const publickeyHex = jsonData.public_key;
  const encryptedHex = jsonData.private_key_cipher_text;
  const keyPair = await generateKeyPair(password, encryptedHex);
  let originKey = {};
  originKey = keyPair;
  originKey.originPublicKey = publickeyHex;
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

const generateSignKeyWithOtherPass = async (newpassword, oldkey) => {
  const rawkey = await generateRawKey(newpassword, oldkey);
  return generateSignKey(rawkey);
};

module.exports = {
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
