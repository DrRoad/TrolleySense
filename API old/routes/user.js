/* A user logs in and is given a Token, which they use to excert their privileges in the rest of the API, for as long as the token is valid. */

"use strict";

// Imports
const express = require('express'),
    router = express.Router(),
    pgp = require('../config/dbconnection'),
    jwt = require('jsonwebtoken');

// HANDLER FUNCTIONS
function authorize(req, res, next) {
    let token = req.body.token || req.headers['token'];
    if (token) {
        jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
            if (err)
                res.status(500).json({ success: false, message: 'Invalid token.' });
            else
                // Get account details
                next();
        })
        // res.json({ sucess: true, message: 'We have a token.' });
    } else {
        return res.status(401).json({ sucess: false, message: 'You need a token to access this end point.' });
    }
}
function getProfileInfo(req, res, next) {
    // DEFINE VARS
    let input = {},
        sql = '';
    // SET AND VALIDATE INPUTS
    // User who we'll se who follows.
    if (req.headers["id"] || req.body["id"])
        input.user_id = req.headers["id"] || req.body["id"];
    else
        return res.status(401).json({ sucess: false, message: 'No user \'id\' specified.' });
    // PREPARE QUERY
    sql += `
        SELECT id, username, tagline, image, first_name, last_name, country
        FROM users
        WHERE id=$1
    `;
    pgp.db.one(sql, input.user_id).then(function (data) {
        // On success
        return res.status(200).json({ success: true, message: 'Got user information.', data: data });
    }).catch(function (err) {
        // On failure
        return res.status(401).json({ success: false, message: 'User does not exist.' });
    });
}
function getFollows(req, res, next) {
    // DEFINE VARS & READ TOKENS
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},
        sql = '';
    // SET AND VALIDATE INPUTS
    // Follower
    input.follower = decoded.id;
    // Follows
    if (req.headers["id"] || req.body["id"])
        input.follows = req.headers["id"] || req.body["id"];
    else
        return res.status(401).json({ sucess: false, message: 'No user \'id\' specified.' });
    // PREPARE QUERY
    sql += `
        SELECT 1 AS follower
        FROM _follows
        WHERE follower=$1 AND follows=$2
    `;
    pgp.db.one(sql, [input.follower, input.follows]).then(function (data) {
        // On success
        return res.status(200).json({ success: true, message: 'You follow this user.', data: true })
    }).catch(function (err) {
        // On failure
        return res.status(200).json({ success: true, message: 'You do not follow this user.', data: false /*,err:err.message*/ })
    });
}
function tagline(req, res, next) {
    // DEFINE VARS & READ TOKENS
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},
        sql = '';
    // SET AND VALIDATE INPUTS
    input.requestingUser = decoded.id;
    if (req.headers["tagline"] || req.body["tagline"])
        input.tagline = req.headers["tagline"] || req.body["tagline"];
    else
        return res.status(403).json({ sucess: false, message: 'No \'tagline\' entered.' });
    sql += `
        UPDATE users
        SET tagline='${input.tagline}'
        WHERE id=${input.requestingUser}
    `;
    pgp.db.none(sql, input).then(function (data) {
        // On success
        return res.status(200).json({ success: true, message: 'Tagline updated.' });
    }).catch(function (err) {
        console.log(err);
        return res.status(403).json({ success: false, message: 'Error updating tagline.', err: err });
    });
}
function toggleFollow(req, res, next) {
    // DEFINE VARS & READ TOKENS
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},
        sql = '';
    // SET AND VALIDATE INPUTS
    // Follower
    input.follower = decoded.id;
    // Follows
    if (req.headers["id"] || req.body["id"])
        input.follows = req.headers["id"] || req.body["id"];
    else
        return res.status(401).json({ sucess: false, message: 'No user \'id\' specified.' });
    // VALIDATE
    if (input.id==decoded.id)
        return res.status(401).json({ sucess: false, message: 'You can\'t follow yourself! How silly is that.' });
    // PREPARE QUERY
    sql += `
        INSERT INTO _follows (follower, follows)
        VALUES ($1, $2)
    `;
    pgp.db.none(sql, [input.follower, input.follows]).then(function (data) {
        // On success
        return res.status(200).json({ success: true, message: 'You now follow said user.' })
    }).catch(function (err) {
        // On failure
        sql = `
            DELETE FROM _follows
            WHERE follower=$1 AND follows=$2
        `
        if (err.code='23505')
            pgp.db.none(sql, [input.follower, input.follows]).then(function (data) {
                // On success
                return res.status(200).json({ success: true, message: 'You no longer follow said user.' })
            }).catch(function (err) {
                // On failure
                return res.status(500).json({ sucess: false, message: 'Failed to unfollow.' });
            });
        else
            return res.status(500).json({ sucess: false, message: 'Unnacounted error.', err: err  });
    });
}
function getFollowers(req, res, next) {
    // DEFINE VARS
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY) || '',
        input = {},
        sql = '';
    // SET AND VALIDATE INPUTS
    // User who we'll see who follows.
    if (req.headers["id"] || req.body["id"])
        input.user_id = req.headers["id"] || req.body["id"];
    else
        return res.status(401).json({ sucess: false, message: 'No user \'id\' specified.' });
    // PREPARE QUERY
    sql += `
        SELECT id, username, image
        FROM users INNER JOIN (
            SELECT follower
            FROM _follows
            WHERE follows=$1
        ) AS followers ON follower=id
    `;
    pgp.db.any(sql, input.user_id).then(function (data) {
        // On success
        return res.status(200).json({ success: true, message: 'User\'s followers', data: data });
    }).catch(function (err) {
        // On failure
        return res.status(401).json({ success: false, message: 'Unnacounted error.', err: err });
    });
}
// ROUTE PATHS
// Account Paths
router.get('/', getProfileInfo );
router.use('/follow', authorize );
router.get('/follow', getFollows); // Get if current user follows another user.
router.post('/follow', toggleFollow); // Follow / Unfollow
router.delete('/follow', toggleFollow); // Follow / Unfollow
router.get('/followers', getFollowers); // Get if current user follows another user.
router.use('/tagline', authorize );
router.put('/tagline', tagline); // Follow / Unfollow
router.patch('/tagline', tagline); // Follow / Unfollow

module.exports = router;
