var path = require('path')
var level = require('level-party')
var createApp = require('appa')
var JSONStream = require('JSONStream')
var through = require('through2')
var createAuth = require('township-auth')
var basic = require('township-auth/basic')
var createAccess = require('township-access')
var createToken = require('township-token')

var creds = require('./creds')
var unpackTarball = require('./unpack-tarball')
var siteDirectories = require('./site-directories')
var createMailer = require('./email')

module.exports = function staticland (config) {
  var dirs = siteDirectories(config)
  dirs.init()

  var app = createApp({
    log: {
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
    }
  })
  var db = config.db || level(config.dbDir)
  var access = createAccess(db)
  var jwt = createToken({ secret: config.secret })
  var auth = createAuth(db, { providers: { basic: basic } })
  var mail = createMailer(config.email)
  console.log(mail)
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
    function firstDeploy () {
      var opts = { domain: domain, owners: [token.access.key] }
      hooks.deploy(opts, function (err, obj) {
        if (err) return app.error(res, 400, err.message)
        site.firstDeploy(obj, function (err, deployed) {
          if (err) return app.error(res, 400, err.message)
          unpackTarball(req, htmlpath, function () {
            app.send(res, 200, { site: deployed })
          })
        })
      })
    }

    function deploy (obj) {
      if (obj.owners.indexOf(token.access.key) === -1) {
        return app.error(res, '403', 'Authorization failed')
      }

      obj.deploys++
      hooks.deploy(obj, function (err, obj) {
        if (err) return app.error(res, 400, err.message)
        site.update(obj, function (err, updated) {
          if (err) return app.error(res, 400, err.message)
          unpackTarball(req, htmlpath, function () {
            app.send(res, 200, { site: updated })
          })
        })
      })
    }

    if (req.method === 'POST') {
      var domain = req.headers.domain
      var htmlpath = path.join(site.dirs.htmlDir, domain)
      try {
        var token = jwt.verify(creds(req))
      } catch (err) {}

      if (!token) {
        return app.error(res, 403, 'Authorization failed')
      } else if (useAPIScope && !verifyScope(token.access, useAPIScope)) {
        return app.error(res, 403, 'Server requires API access scope')
      }

      site.find(domain, function (err, obj) {
        if (err || !obj) {
          firstDeploy()
        } else {
          deploy(obj)
        }
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
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/sites/:domain', function (req, res, ctx) {
    if (req.method === 'DELETE') {
      // TODO: implement deleting sites
      app.error(res, 400, 'Endpoint not implemented')
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/sites/:domain/owner', function (req, res, ctx) {
    try {
      var token = jwt.verify(creds(req))
    } catch (err) {}

    if (!token) {
      return app.error(res, 400, 'token auth required')
    }

    if (!ctx.body.owner) {
      return app.error(res, 400, 'owner property required')
    } else if (!ctx.body.domain) {
      return app.error(res, 400, 'domain property required')
    }

    if (req.method === 'POST') {
      auth.findOne('basic', ctx.body.owner, function (err, authData) {
        if (err) return app.error(res, 400, err.message)
        site.addOwner({ domain: ctx.body.domain, owner: authData.key }, function (err, updated) {
          if (err) return app.error(res, 400, err.message)
          hooks.addOwner({ user: authData, site: updated }, function (err) {
            if (err) return app.error(res, 400, err.message)
            app.send(res, 200, updated)
          })
        })
      })
    } else if (req.method === 'DELETE') {
      auth.findOne('basic', ctx.body.owner, function (err, authData) {
        if (err) return app.error(res, 400, err.message)
        site.removeOwner({ domain: ctx.body.domain, owner: authData.key }, function (err, updated) {
          if (err) return app.error(res, 400, err.message)
          app.send(res, 200, updated)
        })
      })
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/auth', function (req, res, ctx) {
    try {
      var token = jwt.verify(creds(req))
    } catch (err) {
      console.log(err)
    }

    function createUser () {
      auth.create({ basic: { email: email, password: password } }, function (err, authData) {
        if (err) return app.error(res, 400, err.message)

        access.create(authData.key, ['api:access'], function (err, accessData) {
          if (err) return app.error(res, 400, err.message)

          var newToken = jwt.sign({
            auth: authData,
            access: accessData
          })

          app.send(res, 200, { key: authData.key, token: newToken })
        })
      })
    }

    if (req.method === 'POST') {
      if (!ctx.body) {
        return app.error(res, 403, 'Server requires email and password properties')
      }

      var email = ctx.body.email
      var password = ctx.body.password

      if (!email) {
        return app.error(res, 400, 'email property required')
      } else if (!password) {
        return app.error(res, 400, 'password property required')
      }

      if (!token) {
        // if no token: a user is creating their own account
        if (createUserScope) {
          return app.error(res, 403, 'Server requires user creation scope')
        }

        return hooks.createUser({}, function (err) {
          if (err) return app.error(res, 400, err.message)
          return createUser()
        })
      } else {
        // if token: an admin is creating an account for a user
        if (useAPIScope && !verifyScope(token.access, useAPIScope)) {
          return app.error(res, 403, 'Server requires API access scope')
        } else if (createUserScope && !verifyScope(token.access, createUserScope)) {
          return app.error(res, 403, 'Server requires user creation scope')
        }

        return hooks.createUser({}, function (err) {
          if (err) return app.error(res, 400, err.message)
          return createUser()
        })
      }
    } else if (req.method === 'DELETE') {
      // TODO: implement this. decide if deleting an account deletes sites
      app.error(res, 500, 'Method not implemented')
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/auth/verify', function (req, res, ctx) {
    if (req.method === 'POST') {
      if (!ctx.body) {
        return app.error(res, 400, 'email and password properties required')
      }

      var email = ctx.body.email
      var password = ctx.body.password

      if (!email) {
        return app.error(res, 400, 'email property required')
      } else if (!password) {
        return app.error(res, 400, 'password property required')
      }

      auth.verify('basic', { email: email, password: password }, function (err, authData) {
        if (err) return app.error(res, 400, err.message)

        access.get(authData.key, function (err, accessData) {
          if (err) return app.error(res, 400, err.message)

          var token = jwt.sign({
            auth: authData,
            access: accessData
          })

          app.send(res, 200, { key: authData.key, token: token })
        })
      })
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/auth/password', function (req, res, ctx) {
    if (req.method === 'POST') {
      var token = jwt.verify(creds(req))

      if (!token) {
        return app.error(res, 400, 'token auth required')
      }

      if (!ctx.body.password) {
        return app.error(res, 400, 'password property required')
      } else if (!ctx.body.newPassword) {
        return app.error(res, 400, 'newPassword property required')
      } else if (!ctx.body.email) {
        return app.error(res, 400, 'email property required')
      }

      var email = ctx.body.email
      var password = ctx.body.password
      var newPassword = ctx.body.newPassword

      auth.verify('basic', { email: email, password: password }, function (err, authData) {
        if (err) return app.error(res, 400, err.message)

        auth.update({
          key: token.authData.key,
          basic: { email: email, password: newPassword }
        }, function (err, authData) {
          if (err) return app.error(res, 400, err.message)
          token.authData = authData
          app.send(res, 200, { key: authData.key, token: jwt.sign(token) })
        })
      })
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/redirect', function (req, res, ctx) {
    if (req.method === 'POST') {
      var body = ctx.body
      if (!body.redirect || !body.domain) {
        return app.error(res, 400, 'redirect and domain properties are required')
      } else {
        site.redirect(body, function (err) {
          if (err) return app.error(res, 400, err.message)
          app.send(res, body)
        })
      }
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  return app
}

function noop (opts, cb) { return cb(null, opts) }
