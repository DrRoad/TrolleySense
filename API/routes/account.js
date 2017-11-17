/* A user logs in and is given a Token, which they use to excert their privileges in the rest of the API, for as long as the token is valid. */

"use strict";

// Imports
const express = require('express'),
    router = express.Router(),
    pgp = require('../config/dbconnection'),
    jwt = require('jsonwebtoken');
    //md5 = require('md5');
    //crypto = require('crypto');

// Other tools
function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
function validatePassword(password) {
    var re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,255}$/;
    return re.test(password);
}

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
function signup (req, res, next) {
    // VALIDATE INPUT
    let email = req.body["email"],
        username = req.body["username"],
        password = req.body["password"],
        first_name = req.body["first_name"],
        last_name = req.body["last_name"],
        country = req.body["country"],
        state = req.body["state"],
        city = req.body["city"];
    if ( !validateEmail(email) )
        return res.status(401).json({ sucess: false, message: 'You must enter a valid email.' });
    if ( !username )
        return res.status(401).json({ sucess: false, message: 'You must enter a username.' });
    if ( !password )
        return res.status(401).json({ sucess: false, message: 'You must enter a password.' });
    if ( password.length < 6 )
        return res.status(401).json({ sucess: false, message: 'Password must be at least 6 characters long.' });
    if ( !validatePassword(password) )
        return res.status(401).json({ sucess: false, message: 'Password did not pass valdiation. You must include at least one upper case letter, one lower case letter, and one numeric digit.' });
    if ( password.indexOf(username)!==-1 && password.toLowerCase().indexOf(username.toLowerCase())!==-1 )
        return res.status(401).json({ sucess: false, message: 'Password did not pass valdiation. Password cannot contain the username.' });
    /*
    bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                password = hash;
                next();
            });
        });
    */
    //return res.status(200).send('Success');
    console.log("Event: Sign-up");
    // Register new user.
    pgp.db.tx(t => {
        // creating a sequence of transaction queries:
        let q1 = t.none(`
                INSERT INTO users ( email, username, first_name, last_name, country, state, city )
                VALUES ( $1, $2, $3, $4, $5, $6, $7 );
            `, [ email, username, first_name, last_name, country, state, city ]),
            q2 = t.none(`
                INSERT INTO secret_salaeras ( user_id, contents )
                VALUES ((SELECT currval(pg_get_serial_sequence('users','id'))), $1 );
            `, password);
        // returning a promise that determines a successful transaction:
        return t.batch([q1, q2]); // all of the queries are to be resolved;
    // On promisse return, act according to the response.
    }).then(data => {
        return res.json({
            sucess: true,
            message: 'Account successfully created.'
        });
    }).catch(function (err) {
        console.log(err.data[0].result);
        switch(err.data[0].result.code) {
            // In case of Unique constrain violation
            case '23505':
                // If e-mail already in use:
                if (err.data[0].result.constraint === "users2_email")
                    return res.status(403).json({ sucess: false, message: 'There\'s already an account associated to this e-mail.' });
                // If username already in use:
                else if (err.data[0].result.constraint === "users2_username")
                    return res.status(403).json({ sucess: false, message: 'This username is already in use.' });
            // Unnacounted error.
            default :
                return res.json({
                    sucess: false,
                    message: err
                });
        }
    });
}
function getAccountDetails(req, res, next) {
    // Read token data
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY); // config.secret
    //return res.send("Testing");
    pgp.db.one(`
        SELECT *
        FROM users
        WHERE id=$1 AND email=$2 AND username=$3
    `, [decoded.id, decoded.email, decoded.username] // While passing variables to it...
    // On promisse return, act according to the response's status.
    ).then(function (data) {
        // If status 200, send json response...
        res.status(200).json({
            success: true,
            data: data,
            message: 'Retrieved account details.'
        });
    }).catch(function (err) {
        res.status(403).json({
            success: false,
            message: 'Couldn\'t access this account.',
            err: err
        });
    });
}
function updateAccount(req, res, next) {
    // GET Token Data
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY);
    // VALIDATE INPUT
    let input = {};
    if (req.body["id"]) input.id = req.body["id"];
    if (req.body["first_name"]) input.first_name = req.body["first_name"];
    if (req.body["last_name"]) input.last_name = req.body["last_name"];
    if (req.body["country"]) input.country = req.body["country"];
    if (req.body["state"]) input.state = req.body["state"];
    if (req.body["city"]) input.city = req.body["city"];
    //let length = Object.keys(input).length;
    // Make sure we have all necesary fields.
    if (input.id==null || (input.first_name==null && input.last_name==null && input.country==null && input.state==null && input.city==null))
        return res.status(403).json({ sucess: false, message: 'You must enter id and one of the following values on this end point: first_name, last_name, country, state, and city.' });
    // Make sure user has privileges to update this account
    if (input.id!=decoded.id)
        return res.status(403).json({ sucess: false, message: 'You do not have privileges to update this account.' });
    // PROCEED WITH UPDATE
    console.log("Event: Update account details");
    // Prepare Update SQL Statement. 
    let sql = 'UPDATE users SET ';
    // Insert Values into Statement.
    let firstPass = true;
    for (let key in input) {
        // Do not insert comma to the first element.
        if (firstPass)
            firstPass = !firstPass;
        else
            sql += ', ';
        // Add next value into the SQL.
        sql += key+'=\''+input[key]+'\'';
    }
    // Finalize SQL Statement
    sql += ' WHERE id = '+input.id;
    pgp.db.none( sql ).then(data => {
        return res.json({
            sucess: true,
            message: 'Account successfully updated.'
        });
    }).catch(function (err) {
        console.log(err);
        switch(err) {
            // Unnacounted error.
            default :
                return res.status(500).json({
                    sucess: false,
                    message: err
                });
        }
    });
}
function removeAccount(req, res, next) {
    // GET Token Data
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY);
    // VALIDATE INPUT
    let input = {};
    if (req.body["password"])
        input.password = req.body["password"];
    else
        return res.status(401).json({ success: false, message: 'To delete an account, you must enter your \'password\' as an argument.' });
    if (req.body["id"])
        input.id = req.body["id"];
    else
        return res.status(403).json({ success: false, message: 'Please specify account to delete.' });
    if (input.id!=decoded.id)
        return res.status(401).json({ sucess: false, message: 'You do not have privileges to delete this account.' });
    pgp.db.one(`
        SELECT contents AS password
        FROM secret_salaeras
        WHERE user_id=$1
        ORDER BY secret_salaeras.id DESC
        LIMIT 1
    `, decoded.id // While passing variables to it...
    // On promisse return, act according to the response's status.
    ).then(function (data) {
        if (data.password != input.password)
            return res.status(401).json({ success: true, message: 'Authentication failed. You\'re not authorized to delete this account.'});
        pgp.db.none('DELETE FROM "users" WHERE "id" = $1;', input.id // While passing variables to it...
        // On promisse return, act according to the response's status.
        ).then(function (data) {
            return res.json({ success: true, message: 'Account deleted successfully.' });
        }).catch(function (err) {
            return res.status(500).json({
                success: false,
                message: 'Unnacounted error.',
                err: err
            });
        });
    }).catch(function (err) {
        return res.status(403).json({ success: false, message: 'This account doesn\'t exist.' });
    });
}

// Password reset
function passforgot(req, res, next) {
    // VALIDATE INPUT
    let input = {};
    if (req.headers["email"]||req.body["email"])
        input.email = req.headers["email"]||req.body["email"];
    else
        return res.status(403).json({ success: false, message: 'Specify the \'email\' of the account you want to reset.' });
    // Generate code.
    let min = 0x10000,
        max = 0xFFFFF,
        code = Math.floor(Math.random()* (max - min) + min).toString(16).toUpperCase();
    console.log(code);
    pgp.db.one(`
        UPDATE secret_salaeras
        SET code=$2, update_request_date=current_timestamp
        WHERE id IN 
            (SELECT id FROM secret_salaeras WHERE user_id=
                (SELECT id FROM users WHERE email = $1)
            ORDER BY id DESC LIMIT 1 )
        RETURNING *
    `, [input.email, code]
    // On promisse return, act according to the response's status.
    ).then(function (data) {
        // On promisse return, act according to the response's status.
        // Send email.
        code += data.id;
        return res.status(200).json({ success: true, message: 'Because sending emails is yet to be implemented, here\'s your code: '+code, code: code });
        // Message user.
        return res.status(200).json({ success: true, message: 'We\'ve sent you an e-mail with a code. Use it to reset your password within the next 24 hours.' });
    }).catch(function (err) {
        // if error is there's no e-mail
        return res.status(403).json({ success: false, message: 'There is no account with the e-mail you\'ve specified.' });
        // else
        return res.status(500).json({ success: false, message: 'Unnacounted error.', err:err });
    });
}
function passreset(req, res, next) {
    // VALIDATE INPUT
    let input = {};
    if (req.headers["code"]||req.body["code"])
        input.code = req.headers["code"]||req.body["code"];
    else
        return res.status(401).json({ success: false, message: 'Please send a \'code\' to reset your password.' });
    if (req.headers["password"]||req.body["password"])
        input.password = req.headers["password"]||req.body["password"];
    else
        return res.status(401).json({ success: false, message: 'Please indicate your new \'passsword\'.' });
    // THIS CODE SHOULDN'T BE REPEATED! But sadly, I am in a hurry. D'":
    if ( input.password.length < 6 )
        return res.status(401).json({ sucess: false, message: 'Password must be at least 6 characters long.' });
    if ( !validatePassword(input.password) )
        return res.status(401).json({ sucess: false, message: 'Password did not pass valdiation. You must include at least one upper case letter, one lower case letter, and one numeric digit.' });
    // "Decode" the code into id and actual random code. Use JWT next time.
    input.id = input.code.slice(5);
    input.code = input.code.slice(0, 5);
    console.log(input.id);
    console.log(input.code);
    pgp.db.one(`
        SELECT user_id
        FROM secret_salaeras
        WHERE id=$1 AND code=$2 AND invalid=false AND extract(hour from current_timestamp - update_request_date) < 24
        AND $2 NOT LIKE concat('%',(SELECT username FROM users WHERE id=user_id),'%')
    `, [input.id, input.code, input.password]
    ).then(function (data) {
        pgp.db.one(`
            INSERT INTO secret_salaeras (user_id, contents)
            VALUES ($1, $2)
            RETURNING *
        `, [data.user_id, input.password]
        ).then(function (data) {
            pgp.db.none(`
                UPDATE secret_salaeras
                SET invalid=true
                WHERE id<$1`,
                data.id
            ).then(function (data) {
                return res.status(200).json({ success: true, message: 'Successful password reset.' });
            }).catch(function (err) {
                return res.status(500).json({ success: false, message: 'Unnacounted error.', err:err });
            });
        }).catch(function (err) {
            return res.status(403).json({ success: false, message: 'You\'ve used this password in the past. Try something different.' });
        });
    }).catch(function (err) {
        return res.status(403).json({ success: false, message: 'You hay have entered the wrong code or the code may have expired or have been invalidated.' });
    });
}

// ROUTE PATHS
// Account Paths
// Password Paths
router.get('/password/forgot', passforgot );
router.get('/password/reset', passreset );
router.post('/', signup);
router.get('/', authorize );
router.get('/', getAccountDetails );
router.put('/', authorize );
router.put('/', updateAccount);
router.delete('/', authorize );
router.delete('/', removeAccount);

module.exports = router;
