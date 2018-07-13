// @flow

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

const getNextVersionKey = (version) => {
  const splitVersion = version.split('.');
  let headVersion = Number(splitVersion[0]);
  let tailVersion = Number(splitVersion[1]);

  if (tailVersion === 9) {
    headVersion += 1;
    tailVersion = 0;
  } else {
    tailVersion += 1;
  }
  return `${headVersion}.${tailVersion}`;
};

const saveSignkey = (filepath, data, name, version) => {
  const ts = Math.round((new Date()).getTime() / 1000);
  let objkey = {};
  if (name) {
    objkey.name = name;
  } else {
    objkey.name = getNameFromPath(filepath);
  }
  objkey = { ...objkey, ...data };
  objkey.created_at = ts;
  if (version) {
    objkey.version = getNextVersionKey(version);
  } else {
    objkey.version = '0.1';
  }
  try {
    fs.writeFileSync(`${filepath}-${ts}.sk.json`, JSON.stringify(objkey), 'utf-8');
    console.log(`Success! Signing key save to ${filepath}-${ts}.sk.json`);
  } catch (error) {
    console.log('This path does not exist!!!');
  }
};

const parsedJsonFile = (filepath) => {
  const realPath = filepath.trim();
  let parsedJson = {};
  try {
    parsedJson = JSON.parse(fs.readFileSync(realPath));
  } catch (error) {
    console.log('Please check path of your key!!!');
  }
  return parsedJson;
};

module.exports = {
  saveSignkey,
  parsedJsonFile,
  getDirectoryFromPath,
  getNextVersionKey,
};
