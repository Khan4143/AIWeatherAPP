module.exports = {
  root: true,
  extends: ['@react-native'],
  plugins: ['flowtype'],
  rules: {
    'flowtype/define-flow-type': 1,
    'flowtype/use-flow-type': 1,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-flow'],
    },
  },
};
