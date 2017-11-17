// Import pgpromise library.
const promise = require('bluebird');
// Initialize with bluebird library
const options = {
    promiseLib: promise
};
const pgp = require('pg-promise')(options);

// Connect this route to the database using pg-promise.
const cn = {
    host: 'localhost',
    port: 5432,
    database: 'tsapi',
    user: 'postgres',
    password: 'a217622'
};
const db = pgp(cn);

module.exports = {
    pgp, db
};
