const crypto = require('crypto');
const mongodb = require('mongodb');
const appEnv = require('./app-env');
const inlineFunction = require('./inline-function');
const pipeline = require('./pipeline');

function generateRandomPass(length) {
  let output = '';
  while (output.length < length) {
    const seed = crypto.randomBytes(length);
    output += seed.toString('base64').replace(/[+=/.]/g, '');
  }
  if (output.length > length) {
    output = output.substring(0, length);
  }
  return output;
}

const targetDbPassword = (() => {
  if (appEnv.MONGODB_PASS) {
    return appEnv.MONGODB_PASS;
  }
  generateRandomPass(16);
})();

function getCommandHandler(index, item) {
  return inlineFunction.refinePipeline(item)
    .then((refinedItem) => {
      const ignoreError = (typeof item._ignoreError === 'undefined') ? false : item._ignoreError;
      const func = pipeline[item._command.toLowerCase()];
      if (!func) {
        return Promise.reject(new Error(`Unknown pipeline : index=${index}, command=${item._command}`));
      }
      return Promise.resolve({
        func, ignoreError, options: refinedItem
      });
    });
}

module.exports = {
  getCommandHandler
};
