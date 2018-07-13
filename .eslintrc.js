module.exports = {
    parser: "babel-eslint",
    parserOptions: {
      "sourceType": "module",
      "allowImportExportEverywhere": false,
      "codeFrame": false
    },
    extends: [
      'airbnb-base',
      'plugin:jest/recommended',
    ],
    plugins: [
      'import',
      'jest',
    ],
    env: {
      node: true,
      'jest/globals': true,
    },
    rules: {
      "new-cap": 0,
      "require-jsdoc": 2,
      "valid-jsdoc": 2,
      "react/jsx-filename-extension": [0, { "extensions": [".js", ".jsx"] }],
      "jsx-quotes": [2, "prefer-single"],
      "no-return-assign": [2, "except-parens"],
      "no-underscore-dangle": 0,
      "max-len": "off",
      "import/prefer-default-export": "off",
      'no-console': 'off',
      'no-await-in-loop': 0,
      'arrow-body-style': 0,
      "prefer-destructuring": ["error", {
        "array": false,
        "object": false
      }, {
        "enforceForRenamedProperties": false
      }]
    },
  };