const passport = require("passport"),
    JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
let opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
opts.secretOrKey = 'BZxtfkhc4XutFRNga8aPMrgIM0P2gh4yNE9HVERmbYUlHXdfUQrlZXTSGIqM0XwHeEz0C0OpkvwkfPyRpa2iF0vhoE8ETNtHvl2Q5BUri8ivEafOO6rsGVUSR0nxtm47wCUEZ4c9aUDy7eseoPej75coMyPfjrU33my2kRdSC5ADLLNfkz3ZWoth8K1paQcg02ab1pSEAKpQzRtEzWFW4Eez2G09RpyMexsCxDF4U4iJ7qsOfyIbAzXOURE7jTqs';
opts.issuer = 'salaera.com';
opts.audience = 'salaera.com';
passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    cosole.log(jwt_payload.sub);
/*
    pgp.db.one(`
        SELECT usr.id as id, username, email
        FROM users
        WHERE id = $1 AND username = $2 AND email = $3
    `, jwt_payload.id, jwt_payload.username, jwt_payload.email // Pass these variables to query.
    ).then(function (data) {
        if (user) {
            done(null, user);
        } else {
            done(null, false);
            // or you could create a new account
        }
    })
    .catch(function (err) {
        return done(err, false);
    });
*/
}));