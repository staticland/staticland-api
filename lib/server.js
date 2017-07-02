var level = require('level-party')
var createApp = require('appa')
var send = require('appa/send')
var xtend = require('xtend')

var createTownship = require('township')
var createReset = require('township-reset-password-token')
var createEmail = require('township-email')

module.exports = function staticland (config) {
  config.log = xtend({
    serializers: {
      req: function asReqValue (req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          headers: { domain: req.headers.domain, host: req.headers.host },
          remoteAddress: req.connection.remoteAddress,
          remotePort: req.connection.remotePort
        }
      }
    }
  }, config.log)

  config.hooks = config.hooks || {}
  config.hooks.createUser = config.hooks.createUser || noop
  config.hooks.addOwner = config.hooks.addOwner || noop
  config.hooks.deploy = config.hooks.deploy || noop

  config.db = config.db || level(config.dbDir)
  var db = config.db

  var app = createApp(config)
  var township = createTownship(db, config)
  var reset = createReset(db, config)

  var email = createEmail({
    transport: config.emailTransport
  })

  config.township = township
  config.reset = reset
  config.email = email

  /* route handlers */
  var sites = require('./handlers/sites')(db, config)
  var accounts = require('./handlers/accounts')(db, config)
  var oldAccounts = require('./handlers/accounts-old.js')(db, config)

  /* index route */
  app.on('/', function (req, res, ctx) {
    send({ hello: 'welcome to staticland' }).pipe(res)
  })

  /* site routes */
  app.on('/sites', { parse: false }, sites.index)
  app.on('/sites/:domain', sites.item)
  app.on('/sites/redirect', sites.redirect)
  app.on('/sites/:domain/owner', sites.owner)

  /* account routes */
  app.on('/accounts/register', accounts.register)
  app.on('/accounts/login', accounts.login)
  app.on('/accounts/verify', accounts.verify)
  app.on('/accounts/logout', accounts.logout)
  app.on('/accounts/destroy', accounts.destroy)
  app.on('/accounts/password-reset/:email', accounts.passwordReset)
  app.on('/accounts/password-reset-confirm/', accounts.passwordResetConfirm)

  /* accounts backwards compatibility */
  app.on('/auth', oldAccounts.auth)
  app.on('/auth/verify', oldAccounts.verify)
  app.on('/password', oldAccounts.password)

  return app
}

function noop (opts, cb) { return cb(null, opts) }
