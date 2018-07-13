// @flow

const nacl = require('tweetnacl');
const scrypt = require('scrypt-async');
const aesjs = require('aes-js');
const secureRandom = require('secure-random');
const LocalObjectStore = require('local-object-store');
const { timeFnPromise } = require('jschest');
const { parsedJsonFile } = require('./handlefile');

const MAX_LOG_N = 31;
const store = new LocalObjectStore('./localstore');
const defaultPassword = 'pangea';
let _salt;

const convertHexToBytes = hexkey => aesjs.utils.hex.toBytes(hexkey);

const convertByteToHex = byteskey => aesjs.utils.hex.fromBytes(byteskey);

const generateEd25519Key = () => nacl.sign.keyPair();

const generateRandomSalt = () => secureRandom.randomArray(200);

const generatePass = (password, cpuCost = 14, existSalt) => {
  if (existSalt) {
    _salt = convertHexToBytes(existSalt);
  } else {
    _salt = generateRandomSalt();
  }
  return new Promise((resolve) => {
    scrypt(password, _salt, {
      N: 2 ** cpuCost,
      r: 8,
      p: 1,
      dkLen: 32,
      encoding: 'hex',
    }, (derivedKey) => {
      resolve(derivedKey);
    });
  });
};

const wrappedFunctionThatReturnsAPromise = timeFnPromise(generatePass);
const randomSalt = convertByteToHex(generateRandomSalt());
const caculatorLogN = async () => {
  console.log('Please wait a moment...');
  let logN = 1;
  for (let index = 1; index <= MAX_LOG_N; index++) {
    const values = await wrappedFunctionThatReturnsAPromise(defaultPassword, index, randomSalt);
    const { elapsedTime } = values;
    if (elapsedTime > 100) {
      logN = (index > 1) ? (index - 1) : index;
      break;
    }
  }
  return logN;
};

const checkCostPromise = () => {
  return new Promise((resolve) => {
    store.load('logN', (err, obj) => {
      if (err) resolve(0);
      if (obj === undefined) {
        resolve(0);
      } else {
        resolve(obj.cost);
      }
    });
  });
};

const checkCostLogNExist = async () => {
  const cost = await checkCostPromise();
  return cost;
};

const deriveKeyAESPass = async (password, salt) => {
  const checkCost = await checkCostLogNExist();

  const cpuCost = (checkCost === 0) ? await caculatorLogN() : checkCost;
  if (checkCost === 0) {
    const obj = {
      id: 'logN',
      cost: cpuCost,
    };
    store.add(obj, (err) => {
      if (err) throw err;
    });
  }
  const key = await generatePass(password, cpuCost, salt);
  return key;
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

const generateRawKey = async (password, ed25519Key, salt) => {
  let ed25519randomkey = {};
  if (ed25519Key) ed25519randomkey = ed25519Key;
  else ed25519randomkey = generateEd25519Key();
  const encryptedBytes = await encryptAes(password, ed25519randomkey, salt);
  const costlogN = await checkCostPromise();
  return {
    cost: costlogN,
    publicKey: convertByteToHex(ed25519randomkey.publicKey),
    cipherSecretKey: convertByteToHex(encryptedBytes),
  };
};

const generateSignKey = (rawkey) => {
  const signingKey = {};
  signingKey.public_key = rawkey.publicKey;
  signingKey.private_key_cipher_text = rawkey.cipherSecretKey;
  signingKey.scrypt_params = {
    n: 2 ** rawkey.cost,
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
  generatePass,
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
  caculatorLogN,
};
