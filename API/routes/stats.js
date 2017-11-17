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
function getStats(req, res, next) {
    // DEFINE VARS AND GET TOKEN
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},    // DEFINE VARS
        sql = '';
    // SET AND VALIDATE INPUTS
    // Parada
    input.stop = req.param.stop;
    if (req.param.stop!==undefined)
        input.stop = req.param.stop;
    // Timelapse Start
    input.start = req.param.start;
    if (req.param.start!==undefined)
        input.start = req.param.start;
    else
        input.start = '-infinity';
    // Timelapse End 
    if (req.param.end!==undefined)
        input.end = req.param.end;
    else
        input.end = "current_timestamp";
    // PREPARE QUERY
    sql = `
        SELECT stops.name AS stop, tsmp, trolley, incoming, outgoing
        FROM usage_log INNER JOIN stops ON usage_log.stop=stops.id
        WHERE tsmp BETWEEN '${input.start}' AND ${input.end}`;
    if (input.stop!==undefined)
        sql += ' AND STOP = ${input.stop}';

    sql += ' ORDER BY tsmp DESC';
    console.log(sql);
    // Run query
    pgp.db.any(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            data: data,
            message: 'Stops loaded successfully.'
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            err: err,
            message: 'Something went wrong.'
        });
    });
}
// ROUTE PATHS
// router.use('/', authorize);
router.get('/', getStats);

// Export router to master route.
module.exports = router; 
