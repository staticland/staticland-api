var path = require('path')
var createApp = require('appa')
var tar = require('tar-fs')
var level = require('level')

module.exports = function staticland (options) {
  var app = createApp()
  var db = level('db')

  var site = require('./site.js')(db, {
    rootDir: __dirname,
    port: 80
  })

  app.on('/sites', function (req, res, ctx) {
    if (req.method === 'POST') {
      var domain = req.headers.domain
      var sitepath = path.join(__dirname, 'sites', domain)

      req.pipe(tar.extract(sitepath, {
        dmode: '555',
        fmode: '444'
      }))

      req.on('end', function () {
        site.deploy(domain, function (err, obj) {
          if (err) return app.error(res, 400, err.message)
          app.send(res, obj)
        })
      })
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  app.on('/redirects', function (req, res, ctx) {
    if (req.method === 'POST') {
      var query = ctx.query
      if (!query.redirect || !query.domain) {
        return app.error(res, 400, 'redirect and domain query params are required')
      } else {
        site.redirect(query, function (err) {
          if (err) return app.error(res, 400, err.message)
          app.send(res, query)
        })
      }
    } else {
      app.error(res, 405, 'Method not allowed')
    }
  })

  return app
}
