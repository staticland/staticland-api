var level = require('level')

module.exports = function (config, creds, callback) {
  var db = config.db || level(config.dbDir)
  var requiredScopes = config.requiredScopes
  var basic = require('township-auth/basic')
  var jwt = require('township-token')({ secret: config.secret })
  var access = require('township-access')(db)
  var auth = require('township-auth')(db, {
    providers: { basic: basic }
  })

  auth.create(creds, function (err, authData) {
    if (err) return callback(err)
    access.create(authData.key, [requiredScopes.useAPI, requiredScopes.createUser], function (err, accessData) {
      if (err) return callback(err)
      callback(null, {
        key: authData.key,
        auth: authData,
        access: accessData,
        token: jwt.sign({
          auth: authData,
          access: accessData
        })
      })
    })
  })
}
