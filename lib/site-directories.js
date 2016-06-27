var path = require('path')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

module.exports = function (config) {
  config = config || {}
  var sitesDir = config.sitesDir || path.join(__dirname, '..', 'sites')
  var certsDir = path.join(sitesDir, 'certs')
  var htmlDir = path.join(sitesDir, 'html')
  var vhostsDir = path.join(sitesDir, 'vhosts')

  function init () {
    mkdirp.sync(sitesDir)
    mkdirp.sync(certsDir)
    mkdirp.sync(htmlDir)
    mkdirp.sync(vhostsDir)
  }

  function create (domain, callback) {
    var cert = path.join(certsDir, domain)
    mkdirp(cert, callback)
  }

  function destroy (domain, callback) {
    var cert = path.join(certsDir, domain)
    var html = path.join(htmlDir, domain)
    var vhost = path.join(vhostsDir, domain + '.conf')
    rimraf(cert, function (err) {
      if (err) return callback(err)
      rimraf(html, function (err) {
        if (err) return callback(err)
        rimraf(vhost, callback)
      })
    })
  }

  return {
    init: init,
    create: create,
    destroy: destroy,
    sitesDir: sitesDir,
    certsDir: certsDir,
    htmlDir: htmlDir,
    vhostsDir: vhostsDir
  }
}
