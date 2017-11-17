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
function getTags(req, res, next) {
    // DEFINE VARS
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    // SET AND VALIDATE INPUTS
    if (token)
        input.requestingUser = decoded.id;
    if (req.headers["user_id"])
        input.requestedUser = req.headers["user_id"];
    if (req.headers["search"])
        input.search = req.headers["search"];
    input.limit = req.headers["limit"] || req.headers["size"] || 20;
    input.offset = req.headers["offset"] || (req.headers["page"] ? req.headers["page"]*input.limit : 0);
    if (isNaN(input.limit)||isNaN(input.offset) || input.limit<1 || input.offset<0)
        return res.status(403).json({ sucess: false, message: 'Page \'size\', \'limit\', \'offset\' and \'page\' number values must be cardinal numbers.' });
    if (input.limit>50)
        return res.status(403).json({ sucess: false, message: 'Maximum allowed page size is 50 entries.' });
    // Perform query.
    console.log(input.requestingUser);
    pgp.db.any(`
            SELECT tag, rank
            FROM tags
            WHERE is_blocked=false\n`
            +((input.search!=undefined)?'AND tag LIKE \''+input.search+'%\'\n':'')
            +((input.requestingUser!=undefined)?`
            AND tag NOT IN (
                SELECT tag
                FROM _hide_tags
                WHERE user_id='`+input.requestingUser+`'
            )
            `:'')
            +'ORDER BY rank DESC\n'
            +'LIMIT \''+input.limit+'\' OFFSET \''+input.offset+'\''
    // On promisse return, act according to the response's status.
    ).then(function (data) {
        // If status 200, send json response...
        res.status(200)
        .json({
            status: 'success',
            data: data,
            message: 'Retrieved tags.'
        });
    })
    .catch(function (err) {
        return next(err);
    });
}
function hideTag(req, res, next) {
    return res.status(502).json({ sucess: false, message: 'Unimplemented.' });
}

// ROUTE PATHS
router.get('/', getTags);
router.get('/hide', hideTag);

// Export router to master route.
module.exports = router;
