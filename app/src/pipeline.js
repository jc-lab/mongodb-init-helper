const mongodb = require('mongodb');
const appEnv = require('./app-env');
const AddUserOperation = require('mongodb/lib/operations/add_user');
const executeOperation = require('mongodb/lib/operations/execute_operation');

/**
 * createUser
 *
 * @param {MongoClient} client
 * @param item
 */
function createUser(client, item) {
  const temp = Object.assign({}, item);
  temp.pwd = '<HIDDEN>';
  console.error('createUser:', temp);
  return new Promise((resolve, reject) => {
    const db = client.db(appEnv.MONGODB_ADMIN_LOGIN_DB);
    const admin = db.admin();
    admin.addUser(item.user, item.pwd, item, (err) => {
      if (err) {
        if (err.code === 11000 || err.code=== 51003) {
          console.error(err.message);
          resolve();
          return ;
        }
        reject(err);
        return ;
      }
      resolve();
    });
  });
}

/**
 * grantRolesToUser
 *
 * @param {MongoClient} client
 * @param {object} item
 */
function grantRolesToUser(client, item) {
  return new Promise((resolve, reject) => {
    const command = {
      grantRolesToUser: item.user,
      roles: item.roles
    };
    console.error('grantRolesToUser:', command);

    const db = client.db(appEnv.MONGODB_ADMIN_LOGIN_DB);
    const admin = db.admin();
    admin.command(command, (err) => {
      if (err) {
        reject(err);
        return ;
      }
      resolve();
    });
  });
}

module.exports = {
  createuser: createUser,
  grantrolestouser: grantRolesToUser
};
