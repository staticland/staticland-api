var path = require('path')
var xtend = require('xtend')

var config = {
  shared: {
    title: 'staticland',
    port: 3322,
    secret: 'this is not very secret',
    sitesDir: path.join(__dirname, 'sites'),
    dbDir: path.join(__dirname, 'sites', 'db'),
    requiredScopes: {
      useAPI: 'api:access',
      createUser: 'user:create'
    }
  },
  development: {
    requestCerts: false,
    reloadNginx: 'echo "restarting nginx"'
  },
  staging: {
    requestCerts: true,
    secret: process.env.STATICLAND_SECRET,
    testing: true
  },
  production: {
    secret: process.env.STATICLAND_SECRET,
    testing: false
  }
}

var env = process.env.NODE_ENV || 'development'
module.exports = xtend(config.shared, config[env])
