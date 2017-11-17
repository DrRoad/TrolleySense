/* A user logs in and is given a Token, which they use to excert their privileges in the rest of the API, for as long as the token is valid. */

"use strict";

// Imports
const express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken'),
    //uuid = require('node-uuid'),
    pgp = require('../config/dbconnection');

// HANDLER FUNCTIONS
// Basic Authentication
function login(req, res, next) {
    console.log("Event: Log-in");
    // Exit if no cretentials were received.
    if (!req.headers.authorization)
        return res.status(401).send('No credentials sent!');
    // Decode credentials.
    let encoded = req.headers.authorization.split(' ')[1],
        decoded = new Buffer(encoded, 'base64').toString('utf8'),
        email = decoded.split(':')[0],
        password = decoded.split(':')[1];
        //client = parseInt(req.params.client);
    // Get username and password.
    pgp.db.one(`
        SELECT usr.id as id, username, contents AS password
        FROM secret_salaeras JOIN (
            SELECT id, username
            FROM users
            WHERE email = $1
        ) AS usr ON usr.id = secret_salaeras.user_id
        ORDER BY secret_salaeras.id DESC
        LIMIT 1;
    `, email // Pass these variables to query.
    // On promisse return, act according to the response.
    ).then(function (data) {
        // Unencrypt password from database.
        let passwordInDB = data.password;
        // Check password.
        if ( password !== passwordInDB )
            return res.status(401).send('Invalid credentials.');
        // Convert desired data into token.
        let tokenize = {
            id: data.id,
            email: email,
            username: data.username
        },
        token = jwt.sign(tokenize, process.env.SECRET_KEY, {
            expiresIn: 2592000 // 30 days in seconds
        }); 
        res.json({
            sucess: true,
            token: token,
            message: 'Successful log-in.'
        });
    })
    .catch(function (err) {
        //return res.status(403).send(err);
        return res.status(403).send('There\'s no account registered to '+email+'.');
    });
}

// ROUTE PATHS
router.get('/', login);
//router.get('/:client', login);

module.exports = router;

// Later: Login with Facebook - https://www.youtube.com/watch?v=OMcWgmkMpEE
