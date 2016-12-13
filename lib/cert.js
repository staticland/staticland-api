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

  cert.renew = function renew (options, callback) {
    assert.equal(typeof options, 'object', 'cert.renew: options object is required')
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
    certbot.renew(opts, callback)
  }

  return cert
}
