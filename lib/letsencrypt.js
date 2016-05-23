var fs = require('fs')
var path = require('path')
var http = require('http')
var letsencrypt = require('letiny')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

module.exports = function (opts) {
  var le = {}

  le.cert = function createCert (options, callback) {
    var domain = options.domain
    var dir = options.dir || ''
    var email = options.email || 'hi@static.land'
    var url = options.testing === true ? 'https://acme-staging.api.letsencrypt.org' : null
    var certDir = path.join(dir, domain)
    var server

    function challenge (domain, path, data, done) {
      server = http.createServer(function (req, res) {
        res.end(data)
        server.close()
      }).listen(5555, function () {
        done()
      })
    }

    mkdirp(certDir, function (err) {
      if (err) return callback(err)
      letsencrypt.getCert({
        url: url,
        email: email,
        domains: [domain],
        challenge: challenge,
        agreeTerms: true
      }, function (err, cert, key, ca, account) {
        if (err) {
          server.close()
          rimraf.sync(certDir)
          return callback(err)
        } else {
          fs.writeFileSync(path.join(certDir, '/account.pem'), account)
          fs.writeFileSync(path.join(certDir, '/privkey.pem'), key)
          fs.writeFileSync(path.join(certDir, '/fullchain.pem'), cert)
          fs.writeFileSync(path.join(certDir, '/ca.pem'), ca)
          callback(null)
        }
      })
    })
  }

  le.renew = function renew (options, callback) {}

  return le
}
