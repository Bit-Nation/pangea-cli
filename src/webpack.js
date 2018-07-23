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
 * @desc Watch and Stream the build file
 * @param {bool} devMode return true when arg is --dev
 * @param {function} callback return data
 */
const watchAndStreamBundleData = (devMode, callback) => {
  watchBundleChanges(devMode, content => {
    if (callback) {
      //callback return data
      callback({ content });
    }
  });
};

/**
 * @desc Write bundle file
 * @param {bool} devMode return true when arg is --dev
 */
const watchAndWriteBundleFile = devMode => {
  watchBundleChanges(
    devMode,
    content => {
      //write content to file
      const outputPath = path.join(process.cwd(), 'build/build.json');
      ensureDirectoryExists(outputPath);
      fs.writeFile(outputPath, content, 'utf8', function(err) {
        if (err) {
          return console.log(err);
        }
        console.log('success write update');
      });
    },
    true, //stop watching
  );
};

/**
 * @desc Watching webpack build process
 * @param {bool} devMode return true when arg is --dev
 * @param {function} callback
 * @param {bool} isForceClose should not watching the file
 */
const watchBundleChanges = (devMode, callback, isForceClose) => {
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
