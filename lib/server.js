var path = require('path')
var level = require('level')
var createApp = require('appa')
var createAuth = require('township-auth')
var basic = require('township-auth/basic')
var createAccess = require('township-access')
var createToken = require('township-token')

var creds = require('./creds')
var unpackTarball = require('./unpack-tarball')
var siteDirectories = require('./site-directories')
var emailer = require('./email')

module.exports = function staticland (config) {
  var dirs = siteDirectories(config)
  dirs.init()

  var app = createApp()
  var db = level(config.dbDir)
  var access = createAccess(db)
  var jwt = createToken({ secret: config.secret })
  var auth = createAuth(db, { providers: { basic: basic } })
  var verifyScope = access.verifyScope

  var useAPIScope
  var createUserScope
  if (config.requiredScopes) {
    useAPIScope = config.requiredScopes.useAPI
    createUserScope = config.requiredScopes.createUser
  }
  console.log(emailer)
  var site = require('./site')(db, config)

  app.on('/sites', function (req, res, ctx) {
    function firstDeploy () {
      access.update(token.auth.key, scopes, function (err, accessData) {
        if (err) return app.error(res, 400, err.message)
        site.firstDeploy(domain, function (err, deployed) {
          if (err) return app.error(res, 400, err.message)
          token.access = accessData
          var newToken = jwt.sign(token)
          unpackTarball(req, htmlpath, function () {
            app.send(res, 200, { token: newToken, site: deployed })
          })
        })
      })
    }

    function deploy (obj) {
      if (verifyScope(token.access, scopes)) {
        obj.deploys++
        site.update(obj, function (err, updated) {
          if (err) return app.error(res, 400, err.message)
          unpackTarball(req, htmlpath, function () {
            app.send(res, 200, { site: updated })
          })
        })
      } else {
        return app.error(res, '403', 'Authorization failed')
      }
    }

    if (req.method === 'POST') {
      var domain = req.headers.domain
      var htmlpath = path.join(site.dirs.htmlDir, domain)
      var token = jwt.verify(creds(req))
      var deployScope = domain + ':deploy'
      var scopes = [deployScope]

      if (useAPIScope) {
        if (!verifyScope(token.access, useAPIScope)) {
          return app.error(res, 403, 'Server requires API access scope')
        }
        scopes.push(useAPIScope)
      }

      if (!token) {
        return app.error(res, '403', 'Authorization failed')
      } else {
        site.find(domain, function (err, obj) {
          if (err) {
            firstDeploy()
          } else {
            deploy(obj)
          }
        })
      }
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/sites/:domain', function (req, res, ctx) {
    if (req.method === 'DELETE') {

    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/sites/:domain/owner', function (req, res, ctx) {
    if (req.method === 'POST') {

    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/auth', function (req, res, ctx) {
    var token = jwt.verify(creds(req))

    if (req.method === 'POST') {
      if (!ctx.body) {
        return app.error(res, 403, 'Server requires email and password properties')
      }

      var email = ctx.body.email
      var password = ctx.body.password

      if (!token) {
        // if no token: a user is creating their own account
        if (createUserScope) {
          return app.error(res, 403, 'Server requires user creation scope')
        }

        // create the user
      } else {
        // if token: an admin is creating an account for a user
        if (useAPIScope && !verifyScope(token.access, useAPIScope)) {
          return app.error(res, 403, 'Server requires API access scope')
        } else if (createUserScope && !verifyScope(token.access, createUserScope)) {
          return app.error(res, 403, 'Server requires user creation scope')
        }

        // create the user
      }

      if (!email) {
        return app.error(res, 400, 'email property required')
      } else if (!password) {
        return app.error(res, 400, 'password property required')
      }

      auth.create({ basic: { email: email, password: password } }, function (err, authData) {
        if (err) return app.error(res, 400, err.message)

        access.create(authData.key, [authData.key + ':manage'], function (err, accessData) {
          if (err) return app.error(res, 400, err.message)

          var newToken = jwt.sign({
            auth: authData,
            access: accessData
          })

          app.send(res, 200, { key: authData.key, token: newToken })
        })
      })
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

          if (verifyScope(accessData, useAPIScope)) {
            var token = jwt.sign({
              auth: authData,
              access: accessData
            })

            app.send(res, 200, { key: authData.key, token: token })
          } else {
            return app.error(res, 403, 'Server requires API access scope')
          }
        })
      })
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/auth/password', function (req, res, ctx) {
    if (req.method === 'POST') {
      var body = ctx.body
      
      // only users with tokens can change their password
      // check for token
      // get new password from body
      // base64 decode new password
      // decode token
      // 
      
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  // TODO: finish implementing
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
