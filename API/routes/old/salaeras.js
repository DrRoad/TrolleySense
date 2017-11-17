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

function setRanking(salaera_id, callback){
  db.tx(function (t) {
        // `t` and `this` here are the same;
        // this.ctx = transaction config + state context;
        return t.batch([
            t.one("select count(*) as laughs from _laughs where salaera_id="+salaera_id),
            t.one("select sum(emo.rank_value) as expresion from comments as co inner join emoticons as emo on co.emoticon_id=emo.id where co.salaera_id="+salaera_id),
            t.one("select count(t.name) as topics from salaeras as sal\
            inner join contents as content on sal.id = content.salaera_id\
            inner join _has_topics as ht on content.id = ht.contents_id\
            inner join topics as t on ht.topic_id = t.id where t.is_blocked=false and sal.id="+salaera_id)
        ]);
    })
    // using .spread(function(user, event)) is best here, if supported;
    .then(function (data) {
        if(data[1]["expresion"] == null){
          data[1]["expresion"] = '0';
        }

        var rank = ((Number(data[0]["laughs"]) * 3)+Number(data[1]["expresion"]))/Number(data[2]["topics"]);

        db.none("update salaeras set rank=$1 where id=$2", [rank, salaera_id])
          .then(function () {
            callback();
          })
          .catch(function (err) {return next(err);});
    })
    .catch(function (err) {return next(err);});
}

function getSingleSalaera(req, res, next) {
  console.log("getSingleSalaera");
  meta = {'total':1,'count':1,'offset':0,'error':null};
  formatedData = [];
  db.one("select sal.id as sal_id, sal.rank, sal.user_id, userP.first_name, userP.last_name, userP.username, userP.picture, content.id as content_id, content.content, content.language_id, content.lang_detection_accuracy, sal.privacy, sal.created_at,\
  (select count(*) from salaeras) as total from salaeras as sal\
  inner join contents as content on sal.id = content.salaera_id\
  inner join users as userP on sal.user_id = userP.id\
  where sal.id=$1\
  order by sal.created_at DESC\
  LIMIT 1 OFFSET 0",[req.params["id"]])
    .then(function (data) {
      var element = data;
      db.any("select t.name, t.id from _has_topics as ht inner join topics as t on ht.topic_id = t.id where t.is_blocked=false and ht.contents_id=$1", [Number(element["content_id"])])
        .then(function (topics) {
          db.any("select * from comments where salaera_id=$1", [element["sal_id"]])
            .then(function (comments) {
              obj = {};
              obj['id'] = element['sal_id'];
              obj['user'] = {};
              obj['user']['id'] = Number(element['user_id']);
              obj['user']['first_name'] = element['first_name'];
              obj['user']['last_name'] = element['last_name'];
              obj['user']['username'] = element['username'];
              obj['user']['picture'] = element['picture'];

              obj['content'] = {};
              obj['content']['id'] = Number(element['content_id']);
              obj['content']['body'] = element['content'];
              obj['content']['language_id'] = element['language_id'];
              obj['content']['lang_detection_accuracy'] = element['lang_detection_accuracy'];

              obj['privacy'] = element['privacy'];
              obj['rank'] = element['rank'];
              obj['comments'] = comments;


              obj['categories'] = topics;
              obj['created_at'] = element['created_at'];

              meta['total'] = Number(element['total']);

              formatedData.push(obj);
              res.status(200)
                .json({
                  meta: meta,
                  data: formatedData
                });
            })
            .catch(function (err) {
              return next(err);
            });
        })
        .catch(function (err) {
          meta = {};
          meta['count'] = 0;
          meta['offset'] = 0;
          meta['error'] = {message:"post doesn't exist",err:err};

          res.status(200)
            .json({
              meta: meta,
              data: []
            });
        });

    })
    .catch(function (err) {
      meta['count'] = 0;
      meta['offset'] = 0;
      meta['error'] = err;

      res.status(200)
        .json({
          meta: meta,
          data: []
        });
    });
}

// add query functions
              data: []
            });
        }else{
          data.forEach(function(element, index, array){
            db.any("select t.name, t.id from _has_topics as ht inner join topics as t on ht.topic_id = t.id where t.is_blocked=false and ht.contents_id=$1", [Number(element["content_id"])])
              .then(function (topics) {
                obj = {};
                obj['id'] = element['sal_id'];
                obj['user'] = {};
                obj['user']['id'] = Number(element['user_id']);
                obj['user']['first_name'] = element['first_name'];
function salaeras(req, res, next) {
  if(req.params["id"]){
    getSingleSalaera(req, res, next);
  }else{
    var offset = 0;
    var count = 10;

    if(req.query["offset"]){
      offset = Number(req.query["offset"]);
    }
    if(req.query["count"]){
      count = Number(req.query["count"]);
    }
   //Recientes = 0
   //Ranqueadas = 1
   //Historicas = 2

    var sort = 0;
    var sortString = "";
    if(req.query["sort"]){
      sort = req.query["sort"];
      if(sort == 2){
        sortString = ", sal.rank DESC";
      }
    }

    var dataString = "";
    if(req.params["user_id"]){
      dataString = "where userP.id="+req.params["user_id"];
    }

    meta = {'total':0,'count':count,'offset':offset,'error':null};
    formatedData = [];

    db.any("select sal.id as sal_id, sal.rank, sal.user_id, userP.first_name, userP.last_name, userP.username, userP.picture, content.id as content_id, content.content, content.language_id, content.lang_detection_accuracy, sal.privacy, sal.created_at,\
    (select count(*) from comments as c where c.salaera_id=sal.id) as comments, (select count(*) from salaeras) as total from salaeras as sal\
    inner join contents as content on sal.id = content.salaera_id\
    inner join users as userP on sal.user_id = userP.id\
    "+dataString+ " \
    order by sal.created_at DESC\
    " + sortString + "\
    LIMIT "+ count +" OFFSET "+offset)
      .then(function (data) {
        if(data.length == 0){
          meta = {};
          meta['count'] = 0;
          meta['offset'] = 0;
          meta['error'] = {message:"user doesn't have any posts"};

          res.status(200)
            .json({
              meta: meta,
                obj['user']['last_name'] = element['last_name'];
                obj['user']['username'] = element['username'];
                obj['user']['picture'] = element['picture'];

                obj['content'] = {};
                obj['content']['id'] = Number(element['content_id']);
                obj['content']['body'] = element['content'];
                obj['content']['language_id'] = element['language_id'];
                obj['content']['lang_detection_accuracy'] = element['lang_detection_accuracy'];

                obj['privacy'] = element['privacy'];
                obj['rank'] = element['rank'];
                obj['comments'] = element['comments'];


                obj['categories'] = topics;
                obj['created_at'] = element['created_at'];

                meta['total'] = Number(element['total']);

                formatedData.push(obj);
                if(index == array.length - 1){
                  res.status(200)
                    .json({
                      meta: meta,
                      data: formatedData
                    });
                }
              })
              .catch(function (err) {
                if(req.params["user_id"]){
                  meta = {};
                  meta['count'] = 0;
                  meta['offset'] = 0;
                  meta['error'] = {message:"user doesn't have any posts"};

                  res.status(200)
                    .json({
                      meta: meta,
                      data: []
                    });
                }else{
                  return next(err);
                }
              });
          });
        }

      })
      .catch(function (err) {
        meta['count'] = 0;
        meta['offset'] = 0;
        meta['error'] = err;

        res.status(200)
          .json({
            meta: meta,
            data: []
          });
      });
  }
}

function createSalaeras(req, res, next) {
  if(checkIfElementsInserted(req.body, ['user_id','privacy','content','language_id','categories'])){
    db.one("insert into salaeras(user_id, privacy, disabled, is_spam, rank, created_at) values($1, $2, false, false, 0, now()) returning id", [req.body.user_id, req.body.privacy])
    .then(function (salaera) {
      db.one("insert into contents(salaera_id, content, language_id, lang_detection_accuracy, created_at) values($1, $2, $3, 1, now()) returning id", [salaera.id, req.body.content, req.body.language_id])
      .then(function (content) {
        var hashs = req.body.categories.match(/#[a-z]+/gi);
        for(var i = 0;  i < hashs.length; i++){

          var hashsArray = hashs;
          var hashs2 = hashs[i];
          var content_id = content.id;

          db.one("insert into topics(name, is_blocked, language_id) values($1, false, $2) returning id", [hashs2[i], req.body.language_id])
          .then(function (topics) {
            db.none("insert into _has_topics(contents_id, topic_id) values($1, $2)", [content.id, topics.id])
              .then(function () {
                meta = {};
                meta['count'] = 1;
                meta['offset'] = 0;
                meta['error'] = null;

                res.status(200)
                  .json({
                    meta: meta,
                    data: [{message: "salaera has been posted"}]
                  });
              })
              .catch(function (err) {showError(err);});
          })
          .catch(function (err) {
///Need to be fix
hashsArray.forEach(function (element, index, array) {
  db.one("select id from topics where name=$1", [element])
    .then(function (data) {
      db.none("insert into _has_topics(contents_id, topic_id) values($1, $2)", [content_id, data.id])
        .then(function () {
          meta = {};
          meta['count'] = 1;
          meta['offset'] = 0;
          meta['error'] = null;

          res.status(200)
            .json({
              meta: meta,
              data: [{message: "salaera has been posted"}]
            });
        })
        .catch(function (err) {showError(err);});
    })
    .catch(function (err) {showError(err);});
});

          });
        }

      })
      .catch(function (err) {showError(err);});
    })
    .catch(function (err) {showError(err);});
  }else{
    showError();
  }
  function showError(err, c){
    meta = {};
    meta['count'] = 0;
    meta['offset'] = 0;
    meta['error'] = err;

    res.status(200)
      .json({
        meta: meta,
        data: []
      });
  }
}


function salaerasByTags(req, res, next) {
  if(req.params["tag"]){

    var offset = 0;
    var count = 10;

    if(req.query["offset"]){
      offset = Number(req.query["offset"]);
    }
    if(req.query["count"]){
      count = Number(req.query["count"]);
    }

    //Recientes = 0
    //Ranqueadas = 1
    //Historicas = 2

     var sort = 0;
     var sortString = "";
     if(req.query["sort"]){
       sort = req.query["sort"];
       if(sort == 2){
         sortString = "order by salaera.rank DESC";
       }
     }

    meta = {'total':0,'count':count,'offset':offset,'error':null};
    formatedData = [];
//Falta el total de todos los post para poder hacer paginacion
  db.any("select distinct salaera.id, salaera.rank, salaera.user_id, salaera.first_name, salaera.last_name, salaera.username, salaera.picture, salaera.content_id, salaera.content, salaera.language_id, salaera.lang_detection_accuracy, salaera.privacy, salaera.created_at, salaera.comments from (select sal.id, sal.rank, sal.user_id, userP.first_name, userP.last_name, userP.username, userP.picture, content.id as content_id, content.content, content.language_id, content.lang_detection_accuracy, sal.privacy, sal.created_at,(select count(*) from comments as c where c.salaera_id=sal.id) as comments from _has_topics as ht\
 inner join contents as content on ht.contents_id=content.id\
   inner join salaeras as sal on content.salaera_id=sal.id\
   inner join users as userP on sal.user_id = userP.id\
   where ht.topic_id = "+req.params["tag"]+"\
   order by content.created_at DESC) salaera \
   "+ sortString +"\
   LIMIT "+ count +" OFFSET "+offset)
    .then(function (data) {
      data.forEach(function(element, index, array){
        db.any("select t.name, t.id from _has_topics as ht inner join topics as t on ht.topic_id = t.id where t.is_blocked=false and ht.contents_id=$1", [Number(element["content_id"])])
          .then(function (topics) {
            obj = {};
            obj['id'] = element['id'];
            obj['user'] = {};
            obj['user']['id'] = Number(element['user_id']);
            obj['user']['first_name'] = element['first_name'];
            obj['user']['last_name'] = element['last_name'];
            obj['user']['username'] = element['username'];
            obj['user']['picture'] = element['picture'];

            obj['content'] = {};
            obj['content']['id'] = Number(element['content_id']);
            obj['content']['body'] = element['content'];
            obj['content']['language_id'] = element['language_id'];
            obj['content']['lang_detection_accuracy'] = element['lang_detection_accuracy'];

            obj['privacy'] = element['privacy'];
            obj['rank'] = element['rank'];
            obj['comments'] = element['comments'];


            obj['categories'] = topics;
            obj['created_at'] = element['created_at'];

            //meta['total'] = Number(element['total']);

            formatedData.push(obj);
            if(index == array.length - 1){
              res.status(200)
                .json({
                  meta: meta,
                  data: formatedData
                });
            }
          })
          .catch(function (err) {return next(err);});
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
  }else{
    meta = {};
    meta['count'] = 0;
    meta['offset'] = 0;
    meta['error'] = {message:"tag missing"};

    res.status(200)
      .json({
        meta: meta,
        data: []
      });
  }
}

function comments(req, res, next) {
  setRanking(34, function(){
    console.log("finished");
  })
}

function salaerasByUser(req, res, next) {

  //Another bug
  if(req.params["user_id"]){
    salaeras(req, res, next);
  }else{
    meta = {};
    meta['count'] = 0;
    meta['offset'] = 0;
    meta['error'] = {message:"missing user_id"};

    res.status(200)
      .json({
        meta: meta,
        data: []
      });
  }

}

//Need to be fixed
function getTags(req, res, next) {
  db.any("select id, name from topics where is_blocked=false LIMIT 20")
    .then(function (data) {
      meta = {};
      meta['total'] = 20;
      meta['count'] = 20;
      meta['offset'] = 0;
      meta['error'] = null;

      res.status(200)
        .json({
          meta: meta,
          data: data
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
}


router.get('/tags', getTags);
router.get('/user/:user_id', salaerasByUser);
router.get('/tag/:tag', salaerasByTags);
router.get('/:id', salaeras);
router.get('/', salaeras);
router.post('/create', createSalaeras);
router.get('/comments', comments);
//router.post('/oauth', oauth);

module.exports = router;
