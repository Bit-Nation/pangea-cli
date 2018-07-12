const {
  generateRawKey,
  generateSignKey,
  generateSignKeyWithOtherPass,
  generateOriginKeyFromPassword,
} = require('./src/general');
const {
  saveSignkey,
  getDirectoryFromPath,
} = require('./src/handlefile');

const saveNewKey = async (filepath, password) => {
  const rawkey = await generateRawKey(password);
  const signingKey = generateSignKey(rawkey);
  saveSignkey(filepath, signingKey);
};

const changePassword = async (filepath, oldpassword, newpassword) => {
  const originKey = await generateOriginKeyFromPassword(filepath, oldpassword);
  const newsigningkey = await generateSignKeyWithOtherPass(newpassword, { publicKey: originKey.publicKey, secretKey: originKey.secretKey }, originKey.salt);
  const namekey = originKey.name;
  const versionkey = originKey.version;
  saveSignkey(`${getDirectoryFromPath(filepath)}/${namekey}`, newsigningkey, namekey, versionkey);
};

module.exports = {
  saveNewKey,
  changePassword,
};
