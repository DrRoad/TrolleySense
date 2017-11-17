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
function getSalaeras(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    if (token)
        input.requestingUser = decoded.id;
    if (req.headers["user_id"] || req.body["user_id"]) {
        input.requestedUser = req.headers["user_id"] || req.body["user_id"];
        console.log("Requested user: "+input.requestedUser);
    }
    if (req.headers["salaera_id"] || req.body["salaera_id"] || req.headers["id"] || req.body["id"])
        input.salaera_id = req.headers["salaera_id"] || req.body["salaera_id"] || req.headers["id"] || req.body["id"];
    if (req.headers["tag"] || req.body["tag"]) {
        input.tag = req.headers["tag"] || req.body["tag"];
        input.tag = input.tag.split(" ", 1)[0].toLowerCase();
    }
    input.order = req.headers["order"] || req.body["order"] || 0;
    switch (Number(input.order)) {
        case 1 : input.order = 'top_ever'; break;
        case 2 : input.order = 'id'; break;
        default: input.order = 'top_current';
    }
    input.limit = req.headers["limit"] || req.headers["size"] || 20;
    input.offset = req.headers["offset"] || (req.headers["page"] ? req.headers["page"]*input.limit : 0);
    if (isNaN(input.limit)||isNaN(input.offset) || input.limit<1 || input.offset<0)
        return res.status(401).json({ sucess: false, message: 'Page \'size\', \'limit\', \'offset\' and \'page\' number values must be cardinal numbers.' });
    if (input.limit>50)
        return res.status(401).json({ sucess: false, message: 'Maximum allowed page size is 50 entries.' });
    // Prepare query.
    let sql = `
    SELECT id, user_id,
        (SELECT username FROM users WHERE id=user_id),
        (SELECT tagline FROM users WHERE id=user_id),
        (SELECT image AS user_image FROM users WHERE id=user_id),
        created_at, contents, laughs, salaera.comments, rank AS top_ever,
        rank - extract(hour from current_timestamp - created_at) * 6 AS top_current,
        row_number() OVER(ORDER BY rank DESC) AS final_rank,`;
    if (!input.requestingUser)
        sql += `
        (SELECT false) AS laughed`;
    else
        sql += `
        (SELECT ${input.requestingUser} IN (SELECT user_id FROM _laughs WHERE _laughs.salaera=salaera.id)) AS laughed`;
    sql += `
    FROM salaera
    WHERE`;
    if (input.salaera_id!=undefined)
        sql +=`
        -- Specific salaera
        id=${input.salaera_id} AND`;
    // by specific user
    if (input.requestedUser!==undefined)
        sql += `
        -- by specific user
        user_id=${input.requestedUser} AND`;
    // not using tags nor salaeras that have been blocked by the requesting user
    if (input.requestingUser!=undefined)
        sql += `
        -- not using tags that have been blocked by the requesting user
        id IN (
            SELECT salaera FROM _salaera_tags WHERE tag NOT IN (
                SELECT tag FROM _hide_tags WHERE user_id=${input.requestingUser}
        )) AND
        -- nor salaeras that have been flagged by this user
        id NOT IN (
            SELECT salaera FROM _flag_salaera WHERE user_id=${input.requestingUser}
        ) AND`;
    // using specific tag
    if (input.tag!=undefined)
        sql += `
        -- using specific tag
        id IN (SELECT salaera FROM _salaera_tags WHERE tag='${input.tag}') AND`;
    // and having privilege
    sql += `
        -- and having privilege
        deleted=false AND is_spam=false AND (
            -- salaera is public,
            privacy=0`;
    if (input.requestingUser!=undefined)
        sql += `
            -- salaera is private and requesting user published this salaera.
            OR user_id=${input.requestingUser}
            -- salaera is for followers only and requesting user is a follower,
            OR (privacy=1 AND (
                ${input.requestingUser} IN (SELECT follower FROM _follows WHERE follows=salaera.user_id)
            ) )
            -- salaera is archived and requesting user has interacted with the salaera, as in:
            OR (privacy=2 AND (
                -- requesting user laughed to this salaera,
                ${input.requestingUser} IN (SELECT user_id FROM _laughs WHERE _laughs.salaera=salaera.id)
                -- or requesting user commented this salaera.
                OR ${input.requestingUser} IN (SELECT user_id FROM comments WHERE comments.salaera=salaera.id LIMIT 1)
                -- There are other means of interaction, but they don't influence a salaera's ranking
                -- so they're not considered worth the extra compute time.
            ) )`;
    sql += `
        )
    -- Order by...
    ORDER BY ${input.order} DESC
    -- Pagination
    LIMIT ${input.limit} OFFSET ${input.offset}`;
    // BEGIN SQL TASKS
    pgp.db.task(t => {
        // Perform Salaera query
        return t.any(sql, input).then(salaeras => {
            // Define response object.
            let length = salaeras.length,
                queries = [],
                response = {};
            if (length>0)
                // Iterate through each salaera.
                for (let i=0; i<length; i++) {
                    // Perform tags and stories queries...
                    // Get tags.
                    sql = 'SELECT tag FROM _salaera_tags WHERE salaera=$1';
                    // Run query.
                    queries.push( t.any(sql, Number(salaeras[i].id)).then(tags => {
                        // And get stories.
                        sql = 'SELECT seq, presented_image, caption FROM story WHERE salaera=$1';
                        // Run query.
                        return t.any(sql, Number(salaeras[i].id)).then(stories => {
                            // Define salaera property containers.
                            let salaera = {};
                            // Format salaera.
			    salaera['id'] = salaeras[i].id;
                            salaera['contents'] = salaeras[i].contents;
                            salaera['laugh_count'] = Number(salaeras[i].laughs);
                            salaera['comment_count'] = Number(salaeras[i].comments);
                            salaera['date'] = salaeras[i].created_at;
                            salaera['rank'] = Number(salaeras[i].final_rank);
                            salaera['top_current'] = Number(salaeras[i].top_current);
                            salaera['top_ever'] = Number(salaeras[i].top_ever);
                            salaera['tags'] = [];
                            for (let tag of tags)
                                salaera['tags'].push(tag.tag);
                            salaera['user'] = {};
                            salaera['user']['id'] = Number(salaeras[i].user_id);
                            salaera['user']['username'] = salaeras[i].username;
                            salaera['user']['image'] = salaeras[i].user_image;
                            salaera['user']['tagline'] = salaeras[i].tagline;
                            salaera['user']['laughed'] = salaeras[i].laughed;
                            salaera['stories'] = stories;
                            salaera['order'] = i+input.offset;
                            // Push salaera into response array.
                            // response[ salaeras[i].id ] = salaera;
                            response[ i+input.offset ] = salaera;
                            // Send response once out of items to edit.
                            if ( i===length-1 )
                                // Send response.
                                return res.status(200).json({
                                    success: true,
                                    message: 'Here are the salaeras.',
                                    data: response
                                });
                        }).catch(function (err) {
                            console.log(err);
                            return res.status(500).json({
                                success: false,
                                message: 'Error getting stories.',
                                err: err
                            });
                        });
                    }).catch(function (err) {
                        console.log(err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error getting tags.',
                            err: err
                        });
                    }));
                }
            else
                return res.status(404).json({
                    success: false,
                    message: 'Found no salaeras. The salaera may have been deleted or you may not be authorized to see it.',
                });
            return t.batch(queries);
        }).catch(function (err) {
            console.log(err);
            return res.status(500).json({
                    success: false,
                    message: 'Error getting salaeras.',
                    err: err
            });
        });
    }).then(data => {
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
                success: false,
                message: 'Error in salaera task.',
                err: err
        });
    });
}
function postSalaera(req, res, next) {
    // DEFINE VARS AND GET TOKEN
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {},    // DEFINE VARS
        sql = '';
    // SET AND VALIDATE INPUTS
    // Salaera's privacy mode.
    if (req.headers["privacy"] || req.body["privacy"])
        input.privacy = req.headers["privacy"] || req.body["privacy"];
    else
        return res.status(403).json({ sucess: false, message: 'Please specify the salaera\'s \'privacy\' setting. [0:public, 1:followers, 2:archived, 3:private].' });
    // Validate salaera, make sure it has text or at least one image/"story".
    if (req.headers["content"] || req.body["content"] || req.headers["contents"] || req.body["contents"])
        input.content = req.headers["content"] || req.body["content"] || req.headers["contents"] || req.body["contents"];
    if (input.content==undefined)
        return res.status(403).json({ sucess: false, message: 'Your salaera needs some text.' });
    // Salaera stories.
    if (req.headers["stories"] || req.body["stories"])
        input.storiesString = req.headers["stories"] || req.body["stories"];
    if (input.storiesString != undefined) {
        try {
            input.stories = JSON.parse(input.storiesString);
        }
        catch (err) {
            return res.status(403).json({ sucess: false, message: 'Your \'stories\' must be contained in valid JSON format.' });
        }
        finally {
            for (let i=0; i<16; i++)
                if ( input.stories[i]==undefined )
                    continue;
                else if ( input.stories[i].caption==undefined || input.stories[i].caption==undefined || input.stories[i].caption=="" || input.stories[i].caption=="" )
                     return res.status(403).json({ sucess: false, message: 'Your \'stories\' must each have key representing the order, as in 1,2,3, and an object with an \'image\' and a \'caption\' value.' });
        }
    }
    // Salaera tags.
    if (req.headers["tags"] || req.body["tags"])
        input.tags = req.headers["tags"] || req.body["tags"];
    else
        return res.status(403).json({ sucess: false, message: 'You must specify an up to 8 tags, separated by commas.' });
    if (input.tags!=undefined) {
        input.tags = input.tags.replace(/\s/g, '').split(",");
        if (input.tags.length>8)
            return res.status(403).json({ sucess: false, message: 'The tags array cannot ecceed 8 salaeras.' });
    }
    if (input.stories!=undefined && input.stories.length>16)
        return res.status(403).json({ sucess: false, message: 'Your story cannot exceed 16 images.' });
    // PREPARE QUERY
    pgp.db.tx(t => { // t == this
        // Salaera query.
        return t.one(`
            INSERT INTO salaera ( user_id, contents, privacy )
            VALUES ( $1, $2, $3 )
            RETURNING id
        `, [ decoded.id, input.content, input.privacy ])
        .then(salaera =>{
            console.log(salaera);
            // Create sequence of transaction queries:
            let queries = [];
            // Insert each salaera tag.
            for (let tag of input.tags)
                queries.push( 
                    t.none(`
                        INSERT INTO _salaera_tags ( salaera, tag )
                        VALUES ( $1, $2 );
                    `, [ salaera.id, tag ] )
                );
            // Insert each story query.
            if (input.stories!==undefined)
                for (let i=0; i<16; i++)
                    if ( input.stories[i]===undefined )
                        continue;
                    else {
                        // PROCESS IMAGES
                        let presented_image = input.stories[i].image;
                        // Run query
                        queries.push( 
                            t.none(`
                                INSERT INTO story ( seq, caption, original_image, presented_image, salaera )
                                VALUES ( $1, $2, $3, $4, $5 )
                            `, [ i, input.stories[i].caption, input.stories[i].image, presented_image, salaera.id ] )
                        );
                    }
            // Run the queries!
            return t.batch(queries);
        })
    // On promisse return, act according to the response.
    }).then(data => {
        return res.status(200).json({
            success: true,
            message: 'Salaera published successfully.',
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Error publishing salaera.',
            err: err
        });
    });
}
function deleteSalaera(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    // Validate
    if (req.headers["salaera"] || req.body["salaera"])
        input.salaera = req.headers["salaera"] || req.body["salaera"];
    else
        return res.status(403).json({ sucess: false, message: 'You must indicate what \'salaera\' you wish to delete.' });
    // Prepare query
    let sql = `
    DELETE FROM salaera
    WHERE user_id=${input.requestingUser} AND id=${input.salaera}
    RETURNING *`
    pgp.db.one(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Salaera deleted.',
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(404).json({
            success: false,
            message: 'Failed to find salaera to delete.',
        });
    });
}
function laugh(req, res, next) {
    // If present, remove current laugh.
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    // Validate
    if (req.headers["salaera"] || req.body["salaera"])
        input.salaera = req.headers["salaera"] || req.body["salaera"];
    else
        return res.status(403).json({ sucess: false, message: 'You must indicate what \'salaera\' you\'re laughing about.' });
    // Prepare query
    let sql = `
        INSERT INTO _laughs (user_id, salaera)
        VALUES (${input.requestingUser}, ${input.salaera})
        RETURNING (SELECT laughs FROM salaera WHERE id=${input.salaera})`;
    pgp.db.one(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
	    	laughed: true,
            // We must add and substract manually when returning the number of laughs, because these actually are added asynchroneously in the database after its done communicating with this API.
            laughs: data.laughs+1,
            message: '¡Jajajaja! (Laughing, in Spanish!)'
        });
    }).catch(function (err) {
        console.log(err);
        if (err.code==23505) {
            sql = `
            DELETE FROM _laughs
            WHERE user_id=${input.requestingUser} AND salaera=${input.salaera}
            RETURNING (SELECT laughs FROM salaera WHERE id=${input.salaera})`;
            pgp.db.one(sql, input).then(function (data) {
                // Send response
                return res.status(200).json({
                    success: true,
        		    laughing: false,
                    laughs: data.laughs-1,
                    message: 'Coqui, coqui... (Silence, in Puertorrican!)'
                });
            }).catch(function (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: 'Laugther stopped and the system choked.',
                    err: err
                });
            });
        } else
            return res.status(500).json({
                success: false,
                message: 'The system choked on laughter.',
                err: err        
            });
    });
}
function getComments(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    if (token)
        input.requestingUser = decoded.id
    else 
        input.requestingUser = 0;
    if (req.headers["salaera"] || req.body["salaera"])
        input.salaera = req.headers["salaera"] || req.body["salaera"];
    else
        return res.status(403).json({ sucess: false, message: 'You must specify a Salaera to get comments from.' });
    input.order = req.headers["order"] || req.body["order"] || 0;
    if (input.order == 1)
        input.order = "id";
    else
        input.order = "score";
    // Paging
    input.limit = req.headers["limit"] || req.headers["size"] || 20;
    input.offset = req.headers["offset"] || (req.headers["page"] ? req.headers["page"]*input.limit : 0);
    if (isNaN(input.limit)||isNaN(input.offset) || input.limit<1 || input.offset<0)
        return res.status(403).json({ sucess: false, message: 'Page \'size\', \'limit\', \'offset\' and \'page\' number values must be cardinal numbers.' });
    if (input.limit>50)
        return res.status(403).json({ sucess: false, message: 'Maximum allowed page size is 50 entries.' });
    // Prepare query.
    let sql = `
    SELECT comments.id, user_id, username, image AS user_image, content, comments.created_at, score, emoticon
    FROM comments INNER JOIN users ON user_id=users.id
    WHERE salaera=${input.salaera} AND salaera NOT IN (
        SELECT id FROM salaera
        WHERE salaera=${input.salaera} AND (deleted=true OR is_spam=true
            -- salaera is private and requesting user published this salaera.
            OR (privacy=3 AND user_id<>${input.requestingUser})
            OR (privacy=1 AND (user_id<>${input.requestingUser} AND ${input.requestingUser} NOT IN (SELECT follower FROM _follows WHERE follows=salaera.user_id)))
            OR (privacy=2 AND user_id<>${input.requestingUser}
            -- requesting hasn't laughed to this salaera,
            AND ${input.requestingUser} NOT IN (SELECT user_id FROM _laughs WHERE _laughs.salaera=salaera.id)
            -- and hasn't commented this salaera.
            AND ${input.requestingUser} NOT IN (SELECT user_id FROM comments WHERE comments.salaera=salaera.id LIMIT 1))
        )
    )
    ORDER BY ${input.order} DESC
    -- Pagination
    LIMIT ${input.limit} OFFSET ${input.offset}`;
    pgp.db.any(sql, input)
    .then(function (data) {
        // Send response.
        return res.status(200).json({
            success: true,
            message: 'Here are the comments.',
            data: data
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Error getting comments.',
            err: err        
        });
    });
}
function postComment(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    // Validate
    if (req.headers["salaera"] || req.body["salaera"])
        input.salaera = req.headers["salaera"] || req.body["salaera"];
    else
        return res.status(403).json({ sucess: false, message: 'You must specify what \'salaera\' you\'re commenting.' });
    if (req.headers["content"] || req.body["content"])
        input.content = req.headers["content"] || req.body["content"];
    else
        return res.status(403).json({ sucess: false, message: 'You must sent your comment\'s \'content\'.' });
    if (req.headers["emoticon"] || req.body["emoticon"])
        input.emoticon = req.headers["emoticon"] || req.body["emoticon"];
    else
        return res.status(403).json({ sucess: false, message: 'You must enter an \'emoticon\' id to express the feelings of your comment.' });
    // Prepare query
    let sql = `
        INSERT INTO comments (user_id, salaera, content, emoticon)
        VALUES (${input.requestingUser}, ${input.salaera}, '${input.content}', ${input.emoticon})`;
    pgp.db.any(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Comment posted.',
            data: data
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Error posting comment.',
            err: err        
        });
    });
}
function deleteComment(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    // Validate
    if (req.headers["comment"] || req.body["comment"])
        input.comment = req.headers["comment"] || req.body["comment"];
    else
        return res.status(403).json({ sucess: false, message: 'You must indicate what \'comment\' you wish to delete.' });
    // Prepare query
    let sql = `
    DELETE FROM comments
    WHERE user_id=${input.requestingUser} AND id=${input.comment}
    RETURNING *`
    pgp.db.one(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Comment deleted.',
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(404).json({
            success: false,
            message: 'Failed to find comment to delete.',
        });
    });
}
function downvoteComment(req, res, next) {
    return preVoteComment(req, res, next, false);
}
function upvoteComment(req, res, next) {
    return preVoteComment(req, res, next, true);
}
function preVoteComment(req, res, next, positive) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    input.positive = positive;
    // Validate
    if (req.headers["comment"] || req.body["comment"])
        input.comment = req.headers["comment"] || req.body["comment"];
    else
        return res.status(403).json({ sucess: false, message: 'You must indicate what \'comment\' you\'re voting on.' });
    // If previous vote exist, delete it.
    let sql = `
        DELETE FROM _comment_score
        WHERE user_id=${input.requestingUser} AND comment=${input.comment}
        RETURNING *`;
    pgp.db.one(sql, input).then(function (data) {
        return voteComment(req, res, next, positive, input);
    }).catch(function (err) {
        return voteComment(req, res, next, positive, input);
    });
}
function voteComment(req, res, next, positive, input) {    
    let sql = `
        INSERT INTO _comment_score (user_id, comment, positive)
        VALUES (${input.requestingUser}, ${input.comment}, ${input.positive})
        RETURNING ( SELECT score FROM comments WHERE comment.id=${input.comment} )`;
    return pgp.db.one(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Successfully voted comment.',
            data: data
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Unnacounted error.',
            err: err
        });
    });
    // Send response
    return res.status(200).json({
        success: true,
        message: 'Voted successfully.'
    });
}
function spamSalaera(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    // Validate
    if (req.headers["salaera"] || req.body["salaera"])
        input.salaera = req.headers["salaera"] || req.body["salaera"];
    else
        return res.status(403).json({ sucess: false, message: 'You must specify what \'salaera\' you\'re marking as spam.' });
    // Prepare query
    let sql = `
        INSERT INTO _spam_salaera (user_id, salaera)
        VALUES (${input.requestingUser}, ${input.salaera})`;
    pgp.db.none(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Salaera marked as spam.'
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Already marked as spam.'
        });
    });
}
function spamComment(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    // Validate
    if (req.headers["comment"] || req.body["comment"])
        input.comment = req.headers["comment"] || req.body["comment"];
    else
        return res.status(403).json({ sucess: false, message: 'You must specify what \'comment\' you\'re marking as spam.' });
    // Prepare query
    let sql = `
        INSERT INTO _spam_comment (user_id, salaera)
        VALUES (${input.requestingUser}, ${input.comment})`;
    pgp.db.none(sql, input).then(function (data) {
        // Send response
        return res.status(200).json({
            success: true,
            message: 'Comment marked as spam.'
        });
    }).catch(function (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Already marked as spam.'
        });
    });
}
function flagSalaera(req, res, next) {
    // Get Token Data & Input
    let token = req.body.token || req.headers['token'],
        decoded = jwt.decode(token, process.env.SECRET_KEY),
        input = {};
    input.requestingUser = decoded.id;
    // Validate
    if (req.headers["salaera"] || req.body["salaera"])
        input.salaera = req.headers["salaera"] || req.body["salaera"];
    else
        return res.status(403).json({ sucess: false, message: 'You must specify what \'salaera\' you\'re marking as spam.' });
    if (req.headers["reason"] || req.body["reason"])
        input.reason = req.headers["reason"] || req.body["reason"];
    else
        return res.status(403).json({ sucess: false, message: 'You must indicate the id of the \'reason\' to flag this salaera.' });
    // Definitions
    let sql;
    // Add custom reason if necessary.
    if (isNaN(input.reason)) {
        sql = `
            INSERT INTO _other_reasons (statement)
            VALUES ('${input.reason}')
            RETURNING id`;
        pgp.db.one(sql, input).then(function (data) {
            input.id = data.id;
            sql = `
                INSERT INTO _flag_salaera (user_id, salaera, other_reason)
                VALUES (${input.requestingUser}, ${input.salaera}, ${input.id})`;
            pgp.db.none(sql, input).then(function (data) {
                // Send response
                return res.status(200).json({
                    success: true,
                    message: 'Salaera flagged successfully.'
                });
            }).catch(function (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to add \'other reason\'.',
                    err: err
                });
            });


            // // Send response
            // return res.status(200).json({
            //     success: true,
            //     message: 'Salaera flagged successfully.'
            // });
        }).catch(function (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Failed to add \'other reason\'.'
            });
        });
    }
    else {
        // Mark Flag
        sql = `
            INSERT INTO _flag_salaera (user_id, salaera, reason)
            VALUES (${input.requestingUser}, ${input.salaera}, ${input.reason})`;
        pgp.db.none(sql, input).then(function (data) {
            // Send response
            return res.status(200).json({
                success: true,
                message: 'Salaera flagged successfully.'
            });
        }).catch(function (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Already flagged this salaera.'
            });
        });
    }
}
// ROUTE PATHS
// Salaera(s)
router.get('/', getSalaeras); // 1
router.post('/', authorize);
router.post('/', postSalaera); // 2
router.delete('/', authorize);
router.delete('/', deleteSalaera); // 3
// Laugh
router.use('/laugh', authorize);
router.post('/laugh', laugh); // 4
router.delete('/laugh', laugh);
// Flag
router.use('/flag', authorize);
router.post('/flag', flagSalaera); // 10
// Spam
router.use('/spam', authorize);
router.post('/spam', spamSalaera); // 11
// Comments
router.get('/comments', getComments); // 5
router.post('/comment', authorize);
router.post('/comment', postComment); // 6
router.delete('/comment', authorize);
router.delete('/comment', deleteComment); // 7
// Upvote comment
router.use('/comment/upvote', authorize);
router.post('/comment/upvote', upvoteComment); // 8
router.delete('/comment/upvote', upvoteComment);
// Downvote comment
router.use('/comment/downvote', authorize);
router.post('/comment/downvote', downvoteComment); // 9
router.delete('/comment/downvote', downvoteComment);
// Spam Comment
router.use('/comment/spam', authorize);
router.post('/comment/spam', spamComment); // 12

// Export router to master route.
module.exports = router;
