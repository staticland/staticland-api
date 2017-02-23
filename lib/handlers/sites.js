var path = require('path')
var JSONStream = require('JSONStream')
var through = require('through2')
var send = require('appa/send')
var error = require('appa/error')

var unpackTarball = require('../unpack-tarball')
var siteDirectories = require('../site-directories')

module.exports = function (db, config) {
  var township = config.township
  var accounts = township.accounts
  var hooks = config.hooks
  var scopes = config.scopes

  var dirs = siteDirectories(config)
  dirs.init()

  var site = require('../site')(db, config)

  return {
    index: index,
    item: item,
    owner: owner,
    redirect: redirect
  }

  function index (req, res, ctx) {
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
        return error(403, 'Authorization failed').pipe(res)
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

      township.verify(req, function (err, account, token) {
        if (err) return error(403, 'Authorization failed').pipe(res)
        if (!account) return error(403, 'Authorization failed').pipe(res)
        site.findByDomain(domain, function (err, obj) {
          if (err || !obj) return firstDeploy(account)
          deploy(account, obj)
        })
      })
    } else if (req.method === 'GET') {
      var owner = ctx.query.owner

      if (owner) {
        return site.find('owners', owner)
          .pipe(JSONStream.stringify())
          .pipe(res)
      } else {
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
      }
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  }

  function item (req, res, ctx) {
    var domain = ctx.params.domain

    if (req.method === 'GET') {
      site.findByDomain(domain, function (err, data) {
        if (err) return error(404, 'site not found').pipe(res)
        send(data).pipe(res)
      })
    } else if (req.method === 'DELETE') {
      township.verify(req, function (err, token) {
        if (err) return error(403, 'Authorization failed').pipe(res)
        if (!token) return error(400, 'token auth required').pipe(res)

        site.findByDomain(domain, function (err, data) {
          if (err) return error(404, 'site not found').pipe(res)
          if (!site.isOwner(token.auth.key, data)) return error(403, 'Authorization failed').pipe(res)
          send(data).pipe(res)
        })

        site.destroy(domain, function (err) {
          if (err) return error(404, 'site not found').pipe(res)
          send(200, { message: 'site destroyed' })
        })
      })
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  }

  function owner (req, res, ctx) {
    township.verify(req, function (err, token) {
      if (err) return error(403, 'Authorization failed').pipe(res)
      if (!token) return error(400, 'token auth required').pipe(res)

      if (!ctx.body.owner) {
        return error(400, 'owner property required').pipe(res)
      } else if (!ctx.body.domain) {
        return error(400, 'domain property required').pipe(res)
      }

      var ownerEmail = ctx.body.owner
      var domain = ctx.body.domain

      if (req.method === 'POST') {
        accounts.findByEmail(ownerEmail, function (err, accountData) {
          if (err) return error(400, err.message || 'Error adding owner to site').pipe(res)
          site.addOwner({ domain: domain, owner: accountData.key }, function (err, updated) {
            if (err) return error(400, err.message || 'Error adding owner to site').pipe(res)
            hooks.addOwner({ user: accountData, site: updated }, function (err) {
              if (err) return error(400, err.message || 'Error adding owner to site').pipe(res)
              send(updated).pipe(res)
            })
          })
        })
      } else if (req.method === 'DELETE') {
        accounts.findByEmail(ownerEmail, function (err, accountData) {
          if (err) return error(400, err.message || 'Error removing owner from site').pipe(res)
          site.removeOwner({ domain: domain, owner: accountData.key }, function (err, updated) {
            if (err) return error(400, err.message || 'Error removing owner from site').pipe(res)
            send(updated).pipe(res)
          })
        })
      } else {
        error(405, 'Method not allowed').pipe(res)
      }
    })
  }

  function redirect (req, res, ctx) {
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
  }
}
