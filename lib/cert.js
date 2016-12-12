var assert = require('assert')
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')

var rimraf = require('rimraf')

var createCertbot = require('certbot-wrapper')

module.exports = function (config) {
  var le = {}
  config.cmd = 'letsencrypt'
  certbot = createCertbot(config)

  le.createCert = function createCert (options, callback) {
    if (config.requestCerts === false) return callback()

    var opts = {
      args: {
        standalone: true,
        domains: options.domains,
        agreeTos: true,
        email: options.email || 'hi@static.land',
        text: true
      }
    }

    if (config.debug) opts.args.staging = true

    certbot.certonly(opts, function (err, stdout, stderr) {
      console.log('err', err)
      console.log('stdout', stdout)
      console.log('stderr', stderr)

        if (err) {
          return callback(err)
        } else {
          callback(null, stdout)
        }
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
