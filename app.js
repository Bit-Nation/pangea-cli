require('./src/global');
const {
  generateRawKey,
  generateSignKey,
  generateSignKeyWithOtherPass,
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

const changePassword = async (filepath, password) => {
  const newsigningkey = await generateSignKeyWithOtherPass(password);
  const namekey = global.signingKey.name;
  const versionkey = global.signingKey.version;
  saveSignkey(`${getDirectoryFromPath(filepath)}/${namekey}`, newsigningkey, namekey, versionkey);
};

module.exports = {
  saveNewKey,
  changePassword,
};
