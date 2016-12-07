var path = require('path')
var xtend = require('xtend')
 
var config = {
  shared: {
    title: 'staticland',
    host: 'http://127.0.0.1',
    port: 3322,
    secret: 'this is not very secret',
    sitesDir: path.join(__dirname, 'sites'),
    dbDir: path.join(__dirname, 'sites', 'db'),
    renewEvery: 30,
    reservedSubdomains: [], // consider the reserved-usernames package, require('reserved-usernames')
    requiredScopes: {
      useAPI: 'api:access'
    },
    email: {
      fromEmail: 'hi@example.com',
      postmarkAPIKey: 'your api key'
    }
  },
  development: {
    requestCerts: false,
    reloadNginx: 'echo "restarting nginx"'
  },
  staging: {
    requestCerts: true,
    debug: true
  },
  production: {
    secret: process.env.STATICLAND_SECRET,
    debug: false
  }
}

var env = process.env.NODE_ENV || 'development'
module.exports = xtend(config.shared, config[env])
