const fs = require('fs');
const util = require('util');

const INLINE_FUNCTION_PATTERN = /\${([^:,]+)(,([^:]+))?(:([^}]*))}/;

function typeFixer(type, value) {
  if (type === 'number') {
    return parseInt(value);
  }
  return value;
}

function refinePipelineSubObj(item) {
  if (typeof item === 'object') {
    if (Array.isArray(item)) {
      return item
        .reduce((prev, cur) =>
          prev.then((out) =>
            refinePipelineSubObj(cur)
              .then((refinedCur) => {
                out.push(refinedCur);
                return out;
              })
          )
        , Promise.resolve([]));
    } else {
      return Object.keys(item)
        .reduce((prev, cur) =>
          prev.then((out) => refinePipelineSubObj(item[cur])
            .then((refinedCur) => {
              out[cur] = refinedCur;
              return out;
            })
          )
        , Promise.resolve({})
        );
    }
  } else if (typeof item === 'string') {
    const m = INLINE_FUNCTION_PATTERN.exec(item);
    if (m) {
      const func = m[1].toUpperCase();
      const type = (m[3] || 'string').toLowerCase();
      const name = m[5];
      switch (func) {
      case 'ENV':
        return Promise.resolve(process.env[name])
          .then(v => typeFixer(type, v));
      case 'FILE_TEXT':
        return util.promisify(fs.readFile)(name, { encoding: 'utf8' })
          .then(v => typeFixer(type, v));
      case 'FILE_TRIMED':
        return util.promisify(fs.readFile)(name, { encoding: 'utf8' })
          .then((content) => content.trim())
          .then(v => typeFixer(type, v));
      }
      return Promise.resolve('XX');
    }
  }
  return Promise.resolve(item);
}

function refinePipeline(item) {
  const copied = Object.assign({}, item);
  delete copied['_command'];
  delete copied['_ignoreError'];
  return refinePipelineSubObj(copied);
}

module.exports = {
  refinePipeline
};
