var express = require('express');
var router = express.Router();
var promise = require('bluebird');
//var md5 = require('md5');
//const crypto = require('crypto');

var options = {
  // Initialization Options
  promiseLib: promise
};

var pgp = require('pg-promise')(options);
var cn = {
    host: 'localhost',
    port: 5432,
    database: 'salaera',
    user: 'postgres',
    password: 'a217622'
};
var db = pgp(cn);

function checkIfElementsInserted(body, elements){
  for(var el in elements){
    if(elements[el] in body){
    }else{
      return false;
    }
  }
  return true;
}

function hashPassword(password){
  return crypto.createHmac('sha256', "sr.@XVJ\BLU(<smg*gh73jtIi,qD77?GT4pyz3F6m-)iD@j)HP9+rRt*MpO&(;N")
             .update(password)
             .digest('hex');
}

// add query functions
function createUser(req, res, next) {
  if(checkIfElementsInserted(req.body, ['username','first_name','last_name','email','password','country','province'])){
    db.one("insert into users(email, first_name, last_name, username, country, province, created_at) values($1, $2, $3, $4, $5, $6, now()) returning id",[req.body.email, req.body.first_name, req.body.last_name, req.body.username, req.body.country, req.body.province])
      .then(function (data) {

        db.none("insert into passwords(user_id, password, created_at) values($1, $2, now())",[data.id, hashPassword(req.body.password), 'now'])
          .then(function () {
              meta = {};
              meta['count'] = 1;
              meta['offset'] = 0;
              meta['error'] = null;

              res.status(200)
                .json({
                  meta: meta,
                  data: [{message:'user successfully created'}]
                });
          })
          .catch(function (err) {
            meta = {};
            meta['count'] = 0;
            meta['offset'] = 0;
            meta['error'] = err;

            res.status(200)
              .json({
                meta: meta,
                data: []
              });
          });

      })
      .catch(function (err) {
        meta = {};
        meta['count'] = 0;
        meta['offset'] = 0;
        meta['error'] = err;

        res.status(200)
          .json({
            meta: meta,
            data: []
          });
        //return next(err);
      });
  }else{
    meta = {};
    meta['count'] = 0;
    meta['offset'] = 0;
    meta['error'] = {message:"misses data"};

    res.status(200)
      .json({
        meta: meta,
        data: []
      });
  }
}

function authenticateUser(req, res, next) {
  if(checkIfElementsInserted(req.body, ['username','password'])){
    db.one("select id from users where username = $1",[req.body.username])
      .then(function (data) {
        var entity = data;
        db.one("select password from passwords where user_id = $1 ORDER BY created_at DESC LIMIT 1",[Number(data.id)])
          .then(function (data) {
            if(data.password == hashPassword(req.body.password)){
                meta = {};
                meta['count'] = 1;
                meta['offset'] = 0;
                meta['error'] = null;

                res.status(200)
                  .json({
                    meta: meta,
                    data: [entity]
                  });
            }else{
              meta = {};
              meta['count'] = 0;
              meta['offset'] = 0;
              meta['error'] = {message:"'username' or 'password' incorrect"};

              res.status(200)
                .json({
                  meta: meta,
                  data: []
                });
            }
          })
          .catch(function (err) {
            meta = {};
            meta['count'] = 0;
            meta['offset'] = 0;
            meta['error'] = {message:"'username' or 'password' incorrect"};

            res.status(200)
              .json({
                meta: meta,
                data: []
              });
          });
      })
      .catch(function (err) {
          meta = {};
          meta['count'] = 0;
          meta['offset'] = 0;
          meta['error'] = {message:"'username' or 'password' incorrect"};

          res.status(200)
            .json({
              meta: meta,
              data: []
            });
      });
  }else{

      meta = {};
      meta['count'] = 0;
      meta['offset'] = 0;
      meta['error'] = {message:"Is require to input a 'username' and 'password'"};

      res.status(200)
        .json({
          meta: meta,
          data: []
        });
  }
}


function getProfile(req, res, next) {
  if(req.params["id"]){
    db.one("select id, email, username, status, country, province, picture,quote, first_name, last_name, default_language from users where id = $1",[req.params["id"]])
      .then(function (data) {
        meta = {};
        meta['count'] = 1;
        meta['offset'] = 0;
        meta['error'] = null;

        res.status(200)
          .json({
            meta: meta,
            data: [data]
          });
      })
      .catch(function (err) {
          meta = {};
          meta['count'] = 0;
          meta['offset'] = 0;
          meta['error'] = {message:"profile doesn't exist"};

          res.status(200)
            .json({
              meta: meta,
              data: []
            });
      });
  }else{
    meta = {};
    meta['count'] = 0;
    meta['offset'] = 0;
    meta['error'] = {message:"profile doesn't exist"};

    res.status(200)
      .json({
        meta: meta,
        data: []
      });
  }

}

router.get('/profile/:id', getProfile);
router.post('/authenticate', authenticateUser);
router.post('/create', createUser);
//router.post('/oauth', oauth);

module.exports = router;
