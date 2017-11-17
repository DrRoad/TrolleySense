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
function getStops(req, res, next) {
    // DEFINE VARS AND GET TOKEN
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},    // DEFINE VARS
        sql = '';
    // SET AND VALIDATE INPUTS
    // Stop
    if (req.headers["stop"] || req.body["stop"])
        input.stop = req.headers["stop"] || req.body["stop"];
    // PREPARE QUERY
    sql = `
        SELECT stops.id, name, lat, lon, numero_flota, ruta, eta
        FROM stops INNER JOIN trolleys ON stops.nexttrolley=trolleys.id
        `;
    if (input.stop !== undefined)
        sql += `WHERE stops.id=${input.stop}`;
    sql += ' ORDER BY eta ASC';
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
            message: 'Something went wrong when looking for stops.'
        });
    });
}
// ROUTE PATHS
// router.use('/', authorize);
router.get('/', getStops);

// Export router to master route.
module.exports = router; 
