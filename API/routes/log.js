/* A user logs in and is given a Token, which they use to excert their privileges in the rest of the API, for as long as the token is valid. */

"use strict";

// Imports
const express = require('express'),
    router = express.Router(),
    pgp = require('../config/dbconnection'),
    jwt = require('jsonwebtoken');

// HANDLER FUNCTIONS
// function authorize(req, res, next) {
//     let token = req.body.token || req.headers['token'];
//     if (token) {
//         jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
//             if (err)
//                 res.status(500).json({ success: false, message: 'Invalid token.' });
//             else
//                 // Get account details
//                 next();
//         })
//         // res.json({ sucess: true, message: 'We have a token.' });
//     } else {
//         return res.status(401).json({ sucess: false, message: 'You need a token to access this end point.' });
//     }
// }
function logPos(req, res, next) {
    // DEFINE VARS AND GET TOKEN
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},    // DEFINE VARS
        sql = '';
    // SET AND VALIDATE INPUTS
    // Trolley
    if (req.headers["trolley"] || req.body["trolley"])
        input.trolley = req.headers["trolley"] || req.body["trolley"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "trolley".'});
    // Lat
    if (req.headers["lat"] || req.body["lat"])
        input.lat = req.headers["lat"] || req.body["lat"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "lat".' });
    // Lon
    if (req.headers["lon"] || req.body["lon"])
        input.lon = req.headers["lon"] || req.body["lon"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "lon".' });
    // Speed
    if (req.headers["speed"] || req.body["speed"])
        input.speed = req.headers["speed"] || req.body["speed"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "speed".' });
    // Status
    if (req.headers["status"] || req.body["status"])
        input.status = req.headers["status"] || req.body["status"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "status".' });
    // PREPARE QUERY
    sql = 'INSERT INTO location_log ( trolley, lat, lon, speed, status ) VALUES ( ${trolley}, ${lat}, ${lon}, ${speed}, ${status} )';
    pgp.db.none(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Logged successfully.'
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging.'
        });
    });
}
function logStop(req, res, next) {
    // DEFINE VARS AND GET TOKEN
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},    // DEFINE VARS
        sql = '';
    // SET AND VALIDATE INPUTS
    // Trolley
    if (req.headers["trolley"] || req.body["trolley"])
        input.trolley = req.headers["trolley"] || req.body["trolley"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "trolley".'});
    // Stop
    if (req.headers["stop"] || req.body["stop"])
        input.stop = req.headers["stop"] || req.body["stop"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "stop".' });
    // Status
    if (req.headers["status"] || req.body["status"])
        input.status = req.headers["status"] || req.body["status"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "status".' });
    // PREPARE QUERY
    sql = 'INSERT INTO stop_event ( trolley, stop, status ) VALUES ( ${trolley}, ${stop}, ${status} )';
    pgp.db.none(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Logged successfully.'
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging.'
        });
    });
}
function logPassengers(req, res, next) {
    // DEFINE VARS AND GET TOKEN
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},    // DEFINE VARS
        sql = '';
    // SET AND VALIDATE INPUTS
    // Trolley
    if (req.headers["trolley"] || req.body["trolley"])
        input.trolley = req.headers["trolley"] || req.body["trolley"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "trolley".'});
    // Parada
    if (req.headers["stop"] || req.body["stop"])
        input.stop = req.headers["stop"] || req.body["stop"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "stop (parada)".' });
    // Incoming
    if (req.headers["incoming"] || req.body["incoming"])
        input.incoming = req.headers["incoming"] || req.body["incoming"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "incoming" passengers.' });
    // Outgoing
    if (req.headers["outgoing"] || req.body["outgoing"])
        input.outgoing = req.headers["outgoing"] || req.body["outgoing"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify "outgoing" passengers.' });
    // PREPARE QUERY
    sql = 'INSERT INTO usage_log ( trolley, stop, incoming, outgoing ) VALUES ( ${trolley}, ${stop}, ${incoming}, ${outgoing} )';
        pgp.db.none(sql, input).then(function (data) {
            // Send response
            return res.status(200).json({
                success: true,
                message: 'Logged successfully.'
            });
        }).catch(function (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while logging.'
            });
        });
    }
// ROUTE PATHS
// router.use('/', authorize);
router.post('/position', logPos); //
router.post('/stop', logStop); //
router.post('/passengers', logPassengers); //

module.exports = router;

