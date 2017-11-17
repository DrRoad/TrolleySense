// Create new API Key Pair.

const uuid = require('node-uuid');

function newKeyPair(req, res, next) {
  // Generate Key Pair.
  let keyPair = {
    id: uuid.v4(),
    secret: uuid.v4()
  };
  // Add to database.
  pgp.db.none(`
    insert into users(name, active)
      values($1, $2)`
    , [keyPair[0], keyPair[1]])
    .then(function () {
        // success;
    })
    .catch(function (error) {
      // error
    });
}
