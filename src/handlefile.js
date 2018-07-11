const fs = require('fs');

const getNameFromPath = (path) => {
  return path.split('/').slice(-1)[0];
};

const getDirectoryFromPath = (path) => {
  const realPath = path.trim();
  let arr = realPath.split('/');
  arr.pop();
  return arr.join('/');
};

const saveSignkey = (filepath, data, name) => {
  const ts = Math.round((new Date()).getTime() / 1000);
  let objkey = {};
  if (name) objkey.name = name;
  else objkey.name = getNameFromPath(filepath);
  objkey.created_at = ts;
  objkey = { ...objkey, ...data };
  fs.writeFileSync(`${filepath}-${ts}.sk.json`, JSON.stringify(objkey), 'utf-8');
  console.log(`Success! Signing key save to ${filepath}-${ts}.sk.json`);
};

const parsedJsonFile = (filepath) => {
  const realPath = filepath.trim();
  const parsedJson = JSON.parse(fs.readFileSync(realPath));
  return parsedJson;
};

module.exports = {
  saveSignkey,
  parsedJsonFile,
  getDirectoryFromPath,
};
