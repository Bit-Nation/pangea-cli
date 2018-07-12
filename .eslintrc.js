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
      "react/default-props-match-prop-types" : 0,
      "no-underscore-dangle": 0,
      "react/require-default-props":0,
      "max-len": "off",
      "import/prefer-default-export": "off",
      'arrow-body-style': 0,
      'no-console': 'off',
      'prefer-const': 0,
      "no-useless-escape": 0,
      "strict": 0
    },
  };