var path = require('path')
var level = require('level')
var createApp = require('appa')
var auth = require('township-auth')
var basic = require('township-auth/basic')
var access = require('township-access')
var token = require('township-token')

var creds = require('./creds')

module.exports = function staticland (options) {
  var app = createApp()
  var db = level('db')

  app.access = access(db)
  app.token = token({ secret: options.secret })
  app.auth = auth(db, { providers: { basic: basic } })

  var site = require('./site.js')(db, {
    rootDir: path.join(__dirname, '..'),
    port: 80
  })

  app.on('/sites', function (req, res, ctx) {
    if (req.method === 'POST') {
      var domain = req.headers.domain
      var sitepath = path.join(__dirname, '..', 'sites', domain)
      var token = creds(req)
      var data = app.token.verify(token)
      var deployScope = domain + ':deploy'
      var scopes = [deployScope]

      if (options.requiredScope) {
        if (!app.access.verifyScope(data.access, options.requiredScope)) {
          return app.error(res, 403, 'Server requires admin access')
        }

        scopes.push(options.requiredScope)
      }

      function firstDeploy () {
        app.access.update(data.auth.key, scopes, function (err, accessData) {
          site.deploy(domain, function (err, deployed) {
            if (err) return app.error(res, 400, err.message)

            unpackTarball(req, obj, sitepath, function () {
              app.send(res, obj)
            })
          })
        })
      }

      function deploy () {
        if (app.access.verifyScopes(data.access, scopes)) {
          unpackTarball(req, obj, sitepath, function () {
            app.send(res, obj)
          })
        } else {
          return app.error(res, '403', 'Authorization failed')
        }
      }

      if (!data) {
        return app.error(res, '403', 'Authorization failed')
      } else {
        site.find(domain, function (err, obj) {
          if (err) {
            firstDeploy()
          } else {
            deploy()
          }
        })
      }
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  // TODO: finish implementing
  app.on('/redirects', function (req, res, ctx) {
    return app.error(res, 500, 'Endpoint not implemented')

    // if (req.method === 'POST') {
    //   var query = ctx.query
    //   if (!query.redirect || !query.domain) {
    //     return app.error(res, 400, 'redirect and domain query params are required')
    //   } else {
    //     site.redirect(query, function (err) {
    //       if (err) return app.error(res, 400, err.message)
    //       app.send(res, query)
    //     })
    //   }
    // } else {
    //   app.error(res, 405, 'Method not allowed')
    // }
  })

  app.on('/auth', function (req, res, ctx) {
    var query = ctx.query

    if (options.requiredScope) {
      return app.error(res, 403, 'Server requires admin access')
    }

    if (req.method === 'POST') {
      if (!query.email) {
        return app.error(res, 400, 'email query param required')
      } else if (!query.password) {
        return app.error(res, 400, 'password query param required')
      }

      app.auth.create({ basic: query }, function (err, authData) {
        if (err) return app.error(res, 400, err.message)

        app.access.create(authData.key, [authData.key + ':manage'], function (err, accessData) {
          if (err) return app.error(res, 400, err.message)

          var token = app.token.sign({
            auth: authData,
            access: accessData
          })

          app.send(res, 200, { key: authData.key, token: token })
        })
      })
    } else if (req.method === 'DELETE') {
      // TODO: implement this. decide if deleting an account deletes sites
      app.error(res, 500, 'Method not Implemented')
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/auth/verify', function (req, res, ctx) {
    var query = ctx.query

    if (req.method === 'POST') {
      if (!query.email) {
        return app.error(res, 400, 'email query param required')
      } else if (!query.password) {
        return app.error(res, 400, 'password query param required')
      }

      app.auth.verify('basic', query, function (err, authData) {
        if (err) return app.error(res, 400, err.message)

        app.access.get(authData.key, function (err, accessData) {
          if (err) return app.error(res, 400, err.message)

          if (app.access.verifyScope(accessData, options.requiredScope)) {
            var token = app.token.sign({
              auth: authData,
              access: accessData
            })
  
            app.send(res, 200, { key: authData.key, token: token })
          } else {
            return app.error(res, 403, 'Server requires admin access')
          }
        })
      })
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  return app
}
