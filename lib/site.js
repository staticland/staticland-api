var fs = require('fs')
var path = require('path')
var Model = require('level-model')
var inherits = require('util').inherits
var xtend = require('xtend')
var pathExists = require('path-exists')

var vhost = require('./vhost')
var reload = require('./nginx-reload')
var le = require('./letsencrypt')()

module.exports = Site
inherits(Site, Model)

function Site (db, opts) {
  if (!(this instanceof Site)) return new Site(db, opts)
  this.reload = opts.reload
  this.rootDir = opts.rootDir
  this.certDir = opts.certDir || path.join(this.rootDir, 'certs')
  this.port = opts.port
  delete opts.reload
  delete opts.rootDir
  delete opts.port

  opts = xtend({
    properties: {
      domain: { type: 'string' },
      deploys: { type: 'number', default: 0 },
      certCreated: { type: ['string', 'null'], default: null },
      certUpdated: { type: ['string', 'null'], default: null }
    },
    indexKeys: ['domain'],
    required: ['domain']
  }, opts)

  Model.call(this, db, opts)
}

Site.prototype.redirect = function siteRedirect (options, callback) {
  var existingVhostPath = path.join(this.rootDir, 'vhosts', options.redirect + '.conf')
  pathExists(existingVhostPath).then(function (exists) {
    if (exists) {
      fs.unlink(existingVhostPath, function (err) {
        if (err) return callback(err)
        createVhost('redirect', options)
      })
    }
  })
}

Site.prototype.deploy = function siteDeploy (domain, callback) {
  var opts = {
    domain: domain,
    port: this.port,
    root: this.rootDir
  }

  var certDir = this.certDir
  this.findOrCreate(domain, function (err, site) {
    if (err) return callback(err)
    if (!site.createdCert) {
      le.cert({ dir: certDir, domain: domain, testing: false }, function (err) {
        if (err) return callback(err)
        createVhost('ssl', opts, function (err) {
          if (err) return callback(err)
          reload(function (err, stdout, stderr) {
            if (err) return callback(err)
            callback(null, site)
          })
        })
      })
    } else {
      createVhost('ssl', opts, function (err) {
        if (err) return callback(err)
        reload(function (err, stdout, stderr) {
          if (err) return callback(err)
          callback(null, site)
        })
      })
    }
  })
}

Site.prototype.findOrCreate = function findOrCreate (domain, callback) {
  var self = this

  this.findOne('domain', domain, function (err, site) {
    if (err) console.log(err)
    if (!site) console.log('creating site record')
    site = site || { domain: domain }
    self.save(site, function (err, site) {
      if (err) return callback(err)
      site.deploys++
      self.update(site.key, site, callback)
    })
  })
}

function createVhost (type, opts, callback) {
  var content = vhost[type](opts, callback)
  var filepath = path.join(__dirname, '..', 'vhosts', opts.domain + '.conf')
  fs.writeFile(filepath, content, callback)
}
