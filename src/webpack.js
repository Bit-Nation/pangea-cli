const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

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
  return new Buffer(bitmap).toString('base64');
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
/* Helper functions end */

/**
 * @desc Get meta data by read content file appIcon.png, dappConfig.json
 * @return {void}
 */
const getDappMetaData = () => {
  const appIconPath = path.join(process.cwd(), 'appIcon.png');
  const pathDappConfig = path.join(process.cwd(), 'dappConfig.json');
  const dappConfig = checkFileExistAndPromptError(pathDappConfig)
    ? JSON.parse(fs.readFileSync(pathDappConfig, 'utf8'))
    : {};

  return dappConfig
    ? {
        ...dappConfig,
        image: checkFileExistAndPromptError(appIconPath)
          ? base64Encode(appIconPath)
          : null,
      }
    : {};
};

/**
 *  @desc Get data from webpack build bundle file and combine to metadata object
 *  @param {function} callback return data with format {result:'',error:''}
 */
const getBuildObjectFromBundle = callback => {
  const dAppMetaData = getDappMetaData();
  const filePath = path.join(process.cwd(), 'dist/index.js');
  fs.readFile(filePath, { encoding: 'utf-8' }, (err, data) => {
    if (!err) {
      callback({
        result: {
          ...dAppMetaData,
          code: data,
        },
      });
    } else {
      callback({ error: err });
    }
  });
};

/**
 * @desc Watching webpack build process
 * @param {bool} devMode return true when arg is --dev
 * @param {function} callback return data
 */
const watching = (devMode, callback) => {
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
    () => {
      // Print watch/build result here...
      if (!devMode) {
        compilerWatch.close();
      }
      if (callback) {
        getBuildObjectFromBundle(callback);
      }
    },
  );
};

module.exports = {
  watching,
};
