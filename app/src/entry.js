const util = require('util');
const fs = require('fs');
const options = require('./options');
const app = require('./index');
const appEnv = require('./app-env');
const mongodb = require('mongodb');

function readStdin() {
  if (process.stdin.isTTY) {
    return Promise.resolve(null);
  }
  const stdinChunkList = [];
  return new Promise((resolve, reject) => {
    process.stdin
      .on('data', (chunk) => {
        stdinChunkList.push(chunk);
      })
      .on('error', e => {
        reject(e);
      })
      .on('end', () => {
        resolve(
          Buffer.concat(stdinChunkList)
            .toString()
        );
      });
  });
}

function openPool() {
  return mongodb.MongoClient.connect(
    appEnv.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 2,
      authMechanism: appEnv.MONGODB_ADMIN_AUTH_MECHANISM,
      auth: (appEnv.MONGODB_ADMIN_USER || appEnv.MONGODB_ADMIN_PASS) ? {
        user: appEnv.MONGODB_ADMIN_USER,
        password: appEnv.MONGODB_ADMIN_PASS
      } : undefined
    }
  );
}

let exitCode = 0;
readStdin()
  .then((inputPipelineContent) => {
    if (options['pipeline-file']) {
      return util.promisify(fs.readFile)(options['pipeline-file'], { encoding: 'utf8' });
    }
    return inputPipelineContent;
  })
  .then((pipelineContent) => {
    try {
      return JSON.parse(pipelineContent);
    } catch (e) {
      return Promise.reject(e);
    }
  })
  .then((pipeline) =>
    pipeline.reduce((prev, cur, index) =>
      prev.then((arr) =>
        app.getCommandHandler(index, cur)
          .then((runner) => arr.push(runner))
          .then(() => arr)
      ), Promise.resolve([])
    )
  )
  .then((pipeline) =>
    openPool()
      .then((pool) =>
        pipeline.reduce((prev, cur) =>
          // func, ignoreError, options
          prev.then(() =>
            cur.func(pool, cur.options)
              .catch((err) => {
                if (cur.ignoreError) {
                  console.error('ignored', err);
                  return Promise.resolve();
                }
                return Promise.reject(err);
              })
          ), Promise.resolve())
          .finally(() => {
            return new Promise(resolve => pool.close(resolve));
          })
      )
  )
  .then(() => {
    process.exit(exitCode);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
