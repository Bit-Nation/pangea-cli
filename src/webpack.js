const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

/* Helper functions start*/
const base64Encode = file => {
  // read binary data
  const bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
};

const checkFileExist = path => {
  if (fs.existsSync(path)) {
    return true;
  } else {
    console.log(`File not found at ${path}`);
    return false;
  }
};
/* Helper functions end*/

const getDappMetaData = () => {
  const appIconPath = path.join(process.cwd(), 'appIcon.png');
  const pathDappConfig = path.join(process.cwd(), 'dappConfig.json');
  const dappConfig = checkFileExist(pathDappConfig)
    ? JSON.parse(fs.readFileSync(pathDappConfig, 'utf8'))
    : {};
  return dappConfig
    ? {
        ...dappConfig,
        image: checkFileExist(appIconPath) ? base64Encode(appIconPath) : null,
      }
    : {};
};

const dAppMetaData = getDappMetaData();

/**
 * Get data from webpack build bundle file and combine to metadata object
 *  @param {function} callback return data with format {result:'',error:''}
 */
const getBuildObjectFromBundle = callback => {
  const filePath = path.join(process.cwd(), 'dist/index.js');
  fs.readFile(filePath, { encoding: 'utf-8' }, function(err, data) {
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
 * Watching webpack build process
 * @param {bool} devMode return true when arg is --dev
 * @param {function} callback return data
 */
const watching = (devMode, callback) => {
  const pathWebpackConfig = path.join(process.cwd(), 'webpack.config.js');

  const webpackConfig = checkFileExist(pathWebpackConfig)
    ? require(pathWebpackConfig)
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
      // Print watch/build result here...
      if (!devMode) {
        compilerWatch.close();
      }
      if (callback) {
        getBuildObjectFromBundle(callback);
      }
    }
  );
};

module.exports = {
  watching,
};
