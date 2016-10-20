var fs = require('fs')
var path = require('path')
var letsencrypt = require('letiny')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

module.exports = function (config) {
  var le = {}

  le.cert = function createCert (options, callback) {
    if (config.requestCerts === false) return callback()

    var domain = options.domain
    var email = options.email || 'hi@static.land'
    var url = options.debug === true ? 'https://acme-staging.api.letsencrypt.org' : null
    var certDir = path.join(config.dirs.certsDir, domain)

    mkdirp(certDir, function (err) {
      if (err) return callback(err)
      mkdirp.sync(path.join(certDir, '.well-known', 'acme-challenge'))
      letsencrypt.getCert({
        url: url,
        email: email,
        domains: [domain],
        challenge: function challenge (domain, challengepath, data, done) {
          var challengeDir = path.join(certDir, '.well-known', 'acme-challenge')
          var filename = challengepath.split('/acme-challenge/')[1]

          mkdirp(challengeDir, function () {
            fs.writeFile(path.join(challengeDir, filename), data, function (err) {
              if (err) return done(err)
              done()
            })
          })
        },
        agreeTerms: true
      }, function (err, cert, key, ca, account) {
        if (err) {
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

  le.renew = function renew (options, callback) {
    var domain = options.domain
    var dir = options.certsDir || ''
    var email = options.email || 'hi@static.land'
    var url = options.debug === true ? 'https://acme-staging.api.letsencrypt.org' : null
    var certDir = path.join(dir, domain)

    letsencrypt.getCert({
      url: url,
      email: email,
      domains: [options.domain],
      challenge: function challenge (domain, challengepath, data, done) {
        var challengeDir = path.join(config.dirs.sitesDir, 'html', domain, '.well-known', 'acme-challenge')
        var filename = challengepath.split('/acme-challenge/')[1]

        mkdirp(challengeDir, function () {
          fs.writeFile(path.join(challengeDir, filename), data, function (err) {
            if (err) return done(err)
            done()
          })
        })
      },
      certFile: path.join(certDir, '/fullchain.pem'),
      caFile: path.join(certDir, '/ca.pem'),
      privateKey: path.join(certDir, '/privkey.pem'),
      accountKey: path.join(certDir, '/account.pem'),
      agreeTerms: true
    }, function (err, cert, key, ca, account) {
      if (err) return callback(err)
      fs.writeFileSync(path.join(certDir, '/account.pem'), account)
      fs.writeFileSync(path.join(certDir, '/privkey.pem'), key)
      fs.writeFileSync(path.join(certDir, '/fullchain.pem'), cert)
      fs.writeFileSync(path.join(certDir, '/ca.pem'), ca)
      callback(null)
    })
  }

  return le
}
