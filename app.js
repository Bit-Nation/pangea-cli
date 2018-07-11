const {
  generateSigningKey,
} = require('./src/general');
const { saveSignkey, getDirectoryFromPath } = require('./src/handlefile');
require('./src/global');

const saveKey = async (filepath, password) => {
  const rawkey = await generateSigningKey(password);
  const formatkey = {};
  formatkey.public_key = rawkey.publicKey;
  formatkey.private_key_cipher_text = rawkey.cipherSecretKey;
  formatkey.scrypt_params = {
    n: 2048,
    r: 8,
    p: 1,
    salt: 'salt',
  };
  formatkey.version = '1.0';
  saveSignkey(filepath, formatkey);
};

const changePassword = async (filepath, password) => {
  const rawkey = await generateSigningKey(password, { publicKey: global.signingKey.publicKey, secretKey: global.signingKey.secretKey });
  const formatkey = {};
  formatkey.public_key = rawkey.publicKey;
  formatkey.private_key_cipher_text = rawkey.cipherSecretKey;
  formatkey.scrypt_params = {
    n: 2048,
    r: 8,
    p: 1,
    salt: 'salt',
  };
  formatkey.version = '1.1';
  const namekey = global.signingKey.name;
  saveSignkey(`${getDirectoryFromPath(filepath)}/${namekey}`, formatkey, namekey);
};

module.exports = {
  saveKey,
  changePassword,
};
