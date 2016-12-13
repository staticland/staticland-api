var assert = require('assert')
var path = require('path')

var createCertbot = require('certbot-wrapper')

module.exports = function createCert (config) {
  assert.equal(typeof config, 'object', 'cert: options object is required')
  assert.equal(typeof config.letsEncryptDir, 'string', 'cert: options.letsEncryptDir string is required')
  assert.equal(typeof config.letsEncryptCommand, 'string', 'cert: options.letsEncryptCommand string is required')
  assert.equal(typeof config.letsEncryptChallengeDir, 'string', 'cert: options.letsEncryptChallengeDir string is required')
  config.cmd = config.letsEncryptCommand

  var cert = {}
  var certbot = createCertbot(config)

  cert.create = function createCert (options, callback) {
    assert.equal(typeof options, 'object', 'cert.create: options object is required')

    if (config.requestCerts === false) return callback()

    var opts = {
      args: {
        text: true,
        quiet: true,
        noSelfUpgrade: true,
        agreeTos: true,
        webroot: true,
        webrootPath: config.letsEncryptChallengeDir,
        domains: options.domain,
        email: options.email || 'hi@static.land',
        configDir: path.join(config.letsEncryptDir, 'config'),
        logsDir: path.join(config.letsEncryptDir, 'logs'),
        workDir: path.join(config.letsEncryptDir, 'work')
      }
    }

    if (config.debug) opts.args.staging = true
    certbot.certonly(opts, callback)
  }

  // cert.renew = function renew (options, callback) {
  //   var domain = options.domain
  //   var email = options.email || 'hi@static.land'
  //
  //   letsencrypt.getCert({
  //     url: url,
  //     email: email,
  //     domains: [options.domain],
  //     challenge: function challenge (domain, challengepath, data, done) {
  //       var challengeDir = path.join(config.dirs.sitesDir, 'html', domain, '.well-known', 'acme-challenge')
  //       var filename = challengepath.split('/acme-challenge/')[1]
  //
  //       mkdirp(challengeDir, function () {
  //         fs.writeFile(path.join(challengeDir, filename), data, function (err) {
  //           if (err) return done(err)
  //           done()
  //         })
  //       })
  //     },
  //     certFile: path.join(certDir, '/fullchain.pem'),
  //     caFile: path.join(certDir, '/ca.pem'),
  //     privateKey: path.join(certDir, '/privkey.pem'),
  //     accountKey: path.join(certDir, '/account.pem'),
  //     agreeTerms: true
  //   }, function (err, cert, key, ca, account) {
  //     if (err) return callback(err)
  //     fs.writeFileSync(path.join(certDir, '/account.pem'), account)
  //     fs.writeFileSync(path.join(certDir, '/privkey.pem'), key)
  //     fs.writeFileSync(path.join(certDir, '/fullchain.pem'), cert)
  //     fs.writeFileSync(path.join(certDir, '/ca.pem'), ca)
  //     callback(null)
  //   })
  // }

  return cert
}
