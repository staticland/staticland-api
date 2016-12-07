var path = require('path')
var level = require('level-party')
var JSONStream = require('JSONStream')
var through = require('through2')
var createAuth = require('township-auth')
var basic = require('township-auth/basic')
var createAccess = require('township-access')
var createToken = require('township-token')
var createApp = require('appa')
var send = require('appa/send')
var error = require('appa/error')
var xtend = require('xtend')

var creds = require('./creds')
var unpackTarball = require('./unpack-tarball')
var siteDirectories = require('./site-directories')
// var createMailer = require('./email')

module.exports = function staticland (config) {
  var dirs = siteDirectories(config)
  dirs.init()

  config.log = xtend({
    serializers: {
      req: function asReqValue (req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          headers: { domain: req.headers.domain, host: req.headers.host },
          remoteAddress: req.connection.remoteAddress,
          remotePort: req.connection.remotePort
        }
      }
    }
  }, config.log)

  var app = createApp(config)
  // var log = app.log

  var db = config.db || level(config.dbDir)
  var access = createAccess(db)
  var jwt = createToken(db, { secret: config.secret })
  var auth = createAuth(db, { providers: { basic: basic } })
  // var mail = createMailer(config.email)

  var verifyScope = access.verifyScope
  var hooks = config.hooks || {}
  hooks.createUser = hooks.createUser || noop
  hooks.addOwner = hooks.addOwner || noop
  hooks.deploy = hooks.deploy || noop

  var useAPIScope
  var createUserScope
  if (config.requiredScopes) {
    useAPIScope = config.requiredScopes.useAPI
    createUserScope = config.requiredScopes.createUser
  }

  var site = require('./site')(db, config)

  app.on('/sites', function (req, res, ctx) {
    function firstDeploy (token) {
      var opts = { domain: domain, owners: [token.auth.key] }
      hooks.deploy(opts, function (err, obj) {
        if (err) return error(400, err.message || 'Error deploying site').pipe(res)
        site.firstDeploy(obj, function (err, deployed) {
          if (err) return error(400, err.message || 'Error deploying site').pipe(res)
          unpackTarball(req, htmlpath, function () {
            send({ site: deployed }).pipe(res)
          })
        })
      })
    }

    function deploy (token, obj) {
      if (obj.owners.indexOf(token.auth.key) === -1) {
        return error(res, 403, 'Authorization failed').pipe(res)
      }

      obj.deploys++
      hooks.deploy(obj, function (err, obj) {
        if (err) return error(400, err.message || 'Error deploying site').pipe(res)
        site.update(obj, function (err, updated) {
          if (err) return error(400, err.message || 'Error deploying site').pipe(res)
          unpackTarball(req, htmlpath, function () {
            send({ site: updated }).pipe(res)
          })
        })
      })
    }

    if (req.method === 'POST') {
      var domain = req.headers.domain
      var htmlpath = path.join(site.dirs.htmlDir, domain)

      jwt.verify(creds(req), function (err, token) {
        if (err) return error(403, 'Authorization failed').pipe(res)

        if (!token) {
          return error(403, 'Authorization failed').pipe(res)
        } else if (useAPIScope && !verifyScope(token.access, useAPIScope)) {
          return error(403, 'Server requires API access scope').pipe(res)
        }

        site.find(domain, function (err, obj) {
          if (err || !obj) {
            firstDeploy(token)
          } else {
            deploy(token, obj)
          }
        })
      })
    } else if (req.method === 'GET') {
      site.createReadStream({ keys: false })
        .pipe(through.obj(function (data, enc, next) {
          this.push({
            key: data.key,
            domain: data.domain,
            created: data.created,
            updated: data.updated
          })
          next()
        }))
        .pipe(JSONStream.stringify()).pipe(res)
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  })

  app.on('/sites/:domain', function (req, res, ctx) {
    if (req.method === 'DELETE') {
      // TODO: implement deleting sites
      error(400, 'Endpoint not implemented').pipe(res)
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  })

  app.on('/sites/:domain/owner', function (req, res, ctx) {
    jwt.verify(creds(req), function (err, token) {
      if (err) return error(403, 'Authorization failed').pipe(res)
      if (!token) return error(400, 'token auth required').pipe(res)

      if (!ctx.body.owner) {
        return error(400, 'owner property required').pipe(res)
      } else if (!ctx.body.domain) {
        return error(400, 'domain property required').pipe(res)
      }

      if (req.method === 'POST') {
        auth.findOne('basic', ctx.body.owner, function (err, authData) {
          if (err) return error(400, err.message || 'Error adding owner to site').pipe(res)
          site.addOwner({ domain: ctx.body.domain, owner: authData.key }, function (err, updated) {
            if (err) return error(400, err.message || 'Error adding owner to site').pipe(res)
            hooks.addOwner({ user: authData, site: updated }, function (err) {
              if (err) return error(400, err.message || 'Error adding owner to site').pipe(res)
              send(updated).pipe(res)
            })
          })
        })
      } else if (req.method === 'DELETE') {
        auth.findOne('basic', ctx.body.owner, function (err, authData) {
          if (err) return error(400, err.message || 'Error removing owner from site').pipe(res)
          site.removeOwner({ domain: ctx.body.domain, owner: authData.key }, function (err, updated) {
            if (err) return error(400, err.message || 'Error removing owner from site').pipe(res)
            send(updated).pipe(res)
          })
        })
      } else {
        error(405, 'Method not allowed').pipe(res)
      }
    })
  })

  app.on('/auth', function (req, res, ctx) {
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
          })

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
  })

  app.on('/auth/verify', function (req, res, ctx) {
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
          })

          send({ key: authData.key, token: token }).pipe(res)
        })
      })
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  })

  app.on('/auth/password', function (req, res, ctx) {
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
            send({ key: authData.key, token: jwt.sign(token) }).pipe(res)
          })
        })
      })
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  })

  app.on('/redirect', function (req, res, ctx) {
    if (req.method === 'POST') {
      var body = ctx.body
      if (!body.redirect || !body.domain) {
        return error(400, 'redirect and domain properties are required').pipe(res)
      } else {
        site.redirect(body, function (err) {
          if (err) return error(400, 'Error creating redirect').pipe(res)
          send(body).pipe(res)
        })
      }
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  })

  return app
}

function noop (opts, cb) { return cb(null, opts) }
