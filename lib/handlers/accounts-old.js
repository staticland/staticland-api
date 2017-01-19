var createAuth = require('township-auth')
var basic = require('township-auth/basic')
var createAccess = require('township-access')
var createToken = require('township-token')
var send = require('appa/send')
var error = require('appa/error')

var creds = require('../creds')

module.exports = function accountsBackwardsCompat (db, config) {
  var access = createAccess(db)
  var jwt = createToken(db, { secret: config.secret })
  var auth = createAuth(db, { providers: { basic: basic } })
  var hooks = config.hooks

  var useAPIScope
  var createUserScope
  var verifyScope = access.verifyScope

  if (config.requiredScopes) {
    useAPIScope = config.requiredScopes.useAPI
    createUserScope = config.requiredScopes.createUser
  }

  return {
    auth: authHandler,
    verify: verify,
    password: password
  }

  function authHandler (req, res, ctx) {
    var reqToken = creds(req)

    function createUser (obj) {
      var email = obj.email
      var password = obj.password

      if (!email) {
        return error(400, 'email property required').pipe(res)
      } else if (!password) {
        return error(400, 'password property required').pipe(res)
      }

      auth.create({ basic: { email: email, password: password } }, function (err, authData) {
        if (err) error(400, err.message || 'Error creating account').pipe(res)

        access.create(authData.key, ['api:access'], function (err, accessData) {
          if (err) return error(400, err.message || 'Error creating account').pipe(res)

          var newToken = jwt.sign({
            auth: authData,
            access: accessData
          }, { expiresIn: '3d' })

          hooks.createUser({ key: authData.key, email: email }, function (err) {
            if (err) return error(400, err.message || 'Error creating user').pipe(res)
            send({ key: authData.key, token: newToken }).pipe(res)
          })
        })
      })
    }

    if (!reqToken && req.method === 'POST') {
      // if no token: a user is creating their own account
      if (createUserScope) return error(403, 'Server requires user creation scope').pipe(res)
      return createUser(ctx.body)
    } else {
      jwt.verify(reqToken, function (err, token) {
        if (err) { /* ignore */ }

        if (req.method === 'POST') {
          if (!ctx.body) {
            return error(403, 'Server requires email and password properties').pipe(res)
          }

          // if token: an admin is creating an account for a user
          if (useAPIScope && !verifyScope(token.access, useAPIScope)) {
            return error(403, 'Server requires API access scope').pipe(res)
          } else if (createUserScope && !verifyScope(token.access, createUserScope)) {
            return error(403, 'Server requires user creation scope').pipe(res)
          }

          return createUser(ctx.body)
        } else if (req.method === 'DELETE') {
          // TODO: implement this. decide if deleting an account deletes sites
          error(500, 'Method not implemented').pipe(res)
        } else {
          error(405, 'Method not allowed').pipe(res)
        }
      })
    }
  }

  function verify (req, res, ctx) {
    if (req.method === 'POST') {
      if (!ctx.body) {
        return error(400, 'email and password properties required').pipe(res)
      }

      var email = ctx.body.email
      var password = ctx.body.password

      if (!email) {
        return error(400, 'email property required').pipe(res)
      } else if (!password) {
        return error(400, 'password property required').pipe(res)
      }

      auth.verify('basic', { email: email, password: password }, function (err, authData) {
        if (err) return error(400, err.message || 'Error verifying account').pipe(res)

        access.get(authData.key, function (err, accessData) {
          if (err) return error(400, err.message || 'Error verifying account').pipe(res)

          var token = jwt.sign({
            auth: authData,
            access: accessData
          }, { expiresIn: '3d' })

          send({ key: authData.key, token: token }).pipe(res)
        })
      })
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  }

  function password (req, res, ctx) {
    if (req.method === 'POST') {
      jwt.verify(creds(req), function (err, token) {
        if (err) return error(403, 'Authorization failed').pipe(res)
        if (!token) return error(400, 'token auth required').pipe(res)

        if (!ctx.body.password) {
          return error(400, 'password property required').pipe(res)
        } else if (!ctx.body.newPassword) {
          return error(400, 'newPassword property required').pipe(res)
        } else if (!ctx.body.email) {
          return error(400, 'email property required').pipe(res)
        }

        var email = ctx.body.email
        var password = ctx.body.password
        var newPassword = ctx.body.newPassword

        auth.verify('basic', { email: email, password: password }, function (err, authData) {
          if (err) return error(400, 'Unable to update password').pipe(res)

          auth.update({
            key: token.authData.key,
            basic: { email: email, password: newPassword }
          }, function (err, authData) {
            if (err) return error(400, 'Unable to update password').pipe(res)
            token.authData = authData
            send({ key: authData.key, token: jwt.sign(token, { expiresIn: '3d' }) }).pipe(res)
          })
        })
      })
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  }
}
