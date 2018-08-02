const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const tweetnacl = require('tweetnacl');

const { hashDAppContent } = require('./utils');

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
 * @param {function} cb
 */
const watchAndWriteBundleFile = (devMode, signingKey, cb) => {
  watchBundleChanges(
    devMode,
    signingKey,
    (err, dAppBuild) => {
      if (err) {
        return cb(err);
      }

      const { name = {} } = dAppBuild;
      const nameString = Object.values(name)[0]; //Get  first item in the name object
      const cleanNameString = nameString
        ? nameString.replace(/([^a-z0-9]+)/gi, '-')
        : ''; // Strip off illegal characters

      //write dAppBuild to file
      const fileName = `${cleanNameString}-${signingKey.name}-${
        signingKey.public_key
      }.json`;
      const outputPath = path.join(process.cwd(), fileName);
      ensureDirectoryExists(fileName);
      fs.writeFile(
        outputPath,
        JSON.stringify(dAppBuild, null, 2),
        'utf8',
        error => {
          if (error) {
            return cb(error);
          }
          cb(null, fileName);
        },
      );
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
        return callback(err);
      }

      //retrieve the output of the compilation
      const dAppCode = stats.compilation.assets['index.js'].source();

      // dApp
      const dAppMetaData = getDappMetaData();
      const dAppContent = {
        ...dAppMetaData,
        used_signing_key: signingKey.public_key,
        code: dAppCode,
        version: 1,
      };

      // hash the dApp content
      hashDAppContent(dAppContent)
        .then(dAppContentHash => {
          // parse secret key
          const secretKey = Buffer.from(
            signingKey.singingPrivateKey.toString(),
            'hex',
          );

          const signedHash = Buffer.from(
            tweetnacl.sign(
              new Uint8Array(Buffer.from(dAppContentHash, `hex`)),
              new Uint8Array(secretKey),
            ),
          ).toString('hex');

          // Print watch/build result here...
          if (isForceClose || !devMode) {
            compilerWatch.close();
          }
          if (callback) {
            callback(null, {
              ...dAppMetaData,
              used_signing_key: signingKey.public_key,
              code: dAppCode,
              signature: signedHash,
            });
          }
        })
        .catch(callback);
    },
  );
};

module.exports = {
  watchAndStreamBundleData,
  watchAndWriteBundleFile,
};
