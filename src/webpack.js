const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

const DEFAULT_LANGUAGE_CODE = 'en-us';
const PACKAGE_PATH = './package.json';
/* Helper functions start */

/**
 * @desc Encode file to base64
 * @param {string} file
 * @return {Buffer}
 */
const base64Encode = file => {
  // read binary data
  const bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer.from(bitmap).toString('base64');
};

/**
 * @desc Check file exist and show prompt error when file not found
 * @param {string} path file path
 * @return {bool}
 */
const checkFileExistAndPromptError = path => {
  if (fs.existsSync(path)) {
    return true;
  } else {
    console.log(`File not found at ${path}`);
    return false;
  }
};

/**
 * @desc Make sure directory exists
 * @param {string} filePath
 */
const ensureDirectoryExists = filePath => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return;
  }
  ensureDirectoryExists(dirname);
  fs.mkdirSync(dirname);
};

/* Helper functions end */

/**
 * @desc Get meta data from package.json
 * @return {object} meta data
 */
const getDappMetaData = () => {
  const packageConfig = checkFileExistAndPromptError(PACKAGE_PATH)
    ? JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'))
    : {};
  let dappConfig = {};
  if (packageConfig.pangea_dapp) {
    dappConfig = packageConfig.pangea_dapp;
  } else {
    return {}; //return when not have pangea_dapp key
  }
  const name = dappConfig.name;
  if (dappConfig.name && !dappConfig.name[DEFAULT_LANGUAGE_CODE]) {
    console.log(`we only support for ${DEFAULT_LANGUAGE_CODE} right now`);
  }
  const { engine } = dappConfig;

  return {
    name,
    engine,
    image: checkFileExistAndPromptError(dappConfig.icon_path)
      ? base64Encode(dappConfig.icon_path)
      : null,
  };
};

/**
 * @desc Watch and Stream the build file
 * @param {bool} devMode return true when arg is --dev
 * @param {object} signingKey
 * @param {function} callback return data
 */
const watchAndStreamBundleData = (devMode, signingKey, callback) => {
  watchBundleChanges(devMode, signingKey, content => {
    if (callback) {
      //callback return data
      callback({ content });
    }
  });
};

/**
 * @desc Write bundle file
 * @param {bool} devMode return true when arg is --dev
 * @param {object} signingKey
 * @param {function} callback
 */
const watchAndWriteBundleFile = (devMode, signingKey, callback) => {
  watchBundleChanges(
    devMode,
    signingKey,
    content => {
      const { name = {} } = JSON.parse(content);
      const nameString = Object.values(name)[0]; //Get  first item in the name object
      const cleanNameString = nameString
        ? nameString.replace(/([^a-z0-9]+)/gi, '-')
        : ''; // Strip off illegal characters
      //write content to file
      const outputPath = path.join(
        process.cwd(),
        `build/${cleanNameString}-${signingKey.name}-${
          signingKey.public_key
        }.json`,
      );
      ensureDirectoryExists(outputPath);
      fs.writeFile(outputPath, content, 'utf8', error => {
        callback({ error });
      });
    },
    true, //stop watching
  );
};

/**
 * @desc Watch webpack build process
 * @param {bool} devMode return true when arg is --dev
 * @param {object} signingKey
 * @param {function} callback
 * @param {bool} isForceClose should not watching the file
 */
const watchBundleChanges = (devMode, signingKey, callback, isForceClose) => {
  const pathWebpackConfig = path.join(process.cwd(), 'webpack.config.js');

  const webpackConfig = checkFileExistAndPromptError(pathWebpackConfig)
    ? require(pathWebpackConfig) /*eslint import/no-dynamic-require: 0*/
    : null;

  const compiler = webpackConfig
    ? webpack({
        ...webpackConfig,
        optimization: {
          minimize: !devMode,
        },
      })
    : {};

  const compilerWatch = compiler.watch(
    {
      // Example watchOptions
      aggregateTimeout: 300,
      poll: undefined,
    },
    (err, stats) => {
      if (err) {
        console.log(err);
        return;
      }
      //retrieve the output of the compilation
      const data = stats.compilation.assets['index.js'].source();

      // update content data
      const dAppMetaData = getDappMetaData();
      const content = JSON.stringify({
        ...dAppMetaData,
        used_signing_key: signingKey.public_key,
        code: data,
      });

      // Print watch/build result here...
      if (isForceClose || !devMode) {
        compilerWatch.close();
      }
      if (callback) {
        callback(content);
      }
    },
  );
};

module.exports = {
  watchAndStreamBundleData,
  watchAndWriteBundleFile,
};
