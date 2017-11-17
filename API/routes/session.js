"use strict";

// Imports
const express = require('express'),
      router = express.Router(),
      pgp = require('../config/dbconnection');
//     md5 = require('md5');
//     crypto = require('crypto');

// HANDLER SESSIONS
function getSession(req, res, next) {
    // Perform query.
    pgp.db.any(`
        select *
        from sessions
    `// On promisse return, act according to the response's status.
    ).then(function (data) {
        // If status 200, send json response...
        res.status(200)
        .json({
            status: 'success',
            data: data,
            message: 'Retrieved session.'
        });
    })
    .catch(function (err) {
        return next(err);
    });
}

// ROUTE PATHS
router.get('/', getSession);

// Export router to master route.
module.exports = router; 
