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
function getTrolleys(req, res, next) {
    // DEFINE VARS AND GET TOKEN
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},    // DEFINE VARS
        sql = '';
    // SET AND VALIDATE INPUTS
    // Trolley
    if (req.headers["trolley"] || req.body["trolley"])
        input.trolley = req.headers["trolley"] || req.body["trolley"];
    // PREPARE QUERY
    sql = `
        SELECT trolleys.id, numero_flota, ruta, location_log.lat, location_log.lon, eta, name
        FROM trolleys INNER JOIN location_log ON trolleys.id=location_log.trolley,
        (
            SELECT DISTINCT ON (nexttrolley) nexttrolley, eta, name
            FROM (
                SELECT nexttrolley, eta, name
                FROM stops
                ORDER BY eta ASC
            ) AS timeestimates
        ) AS nextstop
        WHERE trolleys.id=nextstop.nexttrolley
        `;
        // INNER JOIN stops ON stops.nexttrolley=trolleys.id
        
    if (input.trolley !== undefined)
        sql += 'WHERE id=${input.trolley}\n';
    // Run query
    pgp.db.any(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            data: data,
            message: 'Trolley/s loaded successfully.'
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong when looking for trolleys.'
        });
    });
}
// function updateTrolley(req, res, next) {
//     // DEFINE VARS AND GET TOKEN
//     let token = req.body.token || req.headers['token'],
//         decoded = jwt.decode(token, process.env.SECRET_KEY),
//         input = {},    // DEFINE VARS
//         sql = '';
//     // SET AND VALIDATE INPUTS
//     // Name
//     if (req.headers["name"] || req.body["name"])
//         input.name = req.headers["name"] || req.body["name"];
//     else
//         return res.status(403).json({ sucess: false, message: 'Please specify "name".'});
//     // nextTrolley
//     if (req.headers["nextTrolley"] || req.body["nextTrolley"])
//         input.nextTrolley = req.headers["nextTrolley"] || req.body["nextTrolley"];
//     else
//         return res.status(403).json({ sucess: false, message: 'Please specify "nextTrolley".' });
//     // Eta
//     if (req.headers["eta"] || req.body["eta"])
//         input.eta = req.headers["eta"] || req.body["eta"];
//     else
//         return res.status(403).json({ sucess: false, message: 'Please specify "eta".' });
//     // PREPARE QUERY
//     sql = `
//         INSERT INTO use_log ( name, nextTrolley, eta )
//         VALUES ( $1, $2, $3 )
//         RETURNING *`;
//     pgp.db.one(sql, input).then(function (data) {
//         // Send response
//         return res.status(200).json({
//             success: true,
//             message: 'Use logged successfully.'
//         });
//     }).catch(function (err) {
//         console.log(err);
//         return res.status(500).json({
//             success: false,
//             message: 'Something went wrong while logging use.'
//         });
//     });
// }
// ROUTE PATHS
router.get('/', getTrolleys);
// router.put('/', updateTrolley);

// Export router to master route.
module.exports = router;
