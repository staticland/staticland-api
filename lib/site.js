var fs = require('fs')
var path = require('path')
var Model = require('level-model')
var inherits = require('util').inherits
var xtend = require('xtend')
var pathExists = require('path-exists')

var vhost = require('./vhost')
var letsencrypt = require('./letsencrypt')
var siteDirectories = require('./site-directories')

module.exports = Site
inherits(Site, Model)

function Site (db, config) {
  if (!(this instanceof Site)) return new Site(db, config)
  this.testing = config.testing
  this.dirs = siteDirectories(config)
  this.requestCerts = config.requestCerts
  this.reloadNginx = config.reloadNginx
  this.le = letsencrypt(config)

  config = xtend({
    properties: {
      domain: { type: 'string' },
      deploys: { type: 'number', default: 0 },
      owners: { type: 'array', default: [] },
      certCreated: { type: ['string', 'null'], default: null },
      certRenewed: { type: ['string', 'null'], default: null }
    },
    indexKeys: ['domain', 'owners'],
    required: ['domain'],
    unique: ['domain'] // is this correct syntax?
  }, config)

  Model.call(this, db, config)
}

Site.prototype.redirect = function siteRedirect (options, callback) {
  options.vhostsDir = this.dirs.vhostsDir
  options.reloadNginx = this.reloadNginx
  var existingVhost = path.join(options.vhostsDir, options.redirect + '.conf')
  pathExists(existingVhost).then(function (exists) {
    if (!exists) return callback()
    fs.unlink(existingVhost, function (err) {
      if (err) return callback(err)
      vhost.redirect(options, callback)
    })
  })
}

Site.prototype.firstDeploy = function siteDeploy (domain, callback) {
  var self = this

  this.find(domain, function (err, site) {
    if (err) console.log('creating site with domain', domain)

    var options = {
      domain: domain,
      sitesDir: self.dirs.sitesDir,
      certsDir: self.dirs.certsDir,
      vhostsDir: self.dirs.vhostsDir,
      reloadNginx: self.reloadNginx,
      testing: self.testing
    }

    if (!site) {
      self.dirs.create(domain, function (err) {
        if (err) return callback(err)
        self.le.cert(options, function (err) {
          if (err) return callback(err)
          vhost.ssl(options, save)
        })
      })
    } else {
      vhost.ssl(options, save)
    }

    function save (err) {
      if (err) return callback(err)
      site = { domain: domain, deploys: 1 }
      self.save(site, callback)
    }
  })
}

Site.prototype.destroy = function (domain, callback) {
  var self = this
  this.find(domain, function (err, site) {
    if (err) return callback(err)
    self.delete(site.key, function (err) {
      if (err) return callback(err)
      self.dirs.destroy(domain, callback)
    })
  })
}

Site.prototype.find = function find (domain, callback) {
  this.findOne('domain', domain, function (err, site) {
    if (err) return callback(new Error('Not found'))
    else return callback(null, site)
  })
}
