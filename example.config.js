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
    letsEncryptDir: '/home/staticland/letsencrypt',
    letsEncryptCommand: '/home/staticland/certbot-auto',
    letsEncryptChallengeDir: '/home/staticland/api/html',
    reservedSubdomains: [], // consider the reserved-usernames package, require('reserved-usernames')
    requiredScopes: {
      useAPI: 'api:access'
    },
    emailTransport: `smtps://${process.env.GMAIL_USER}%40gmail.com:${process.env.GMAIL_PASS}@smtp.gmail.com`,
    email: 'hi@static.land',
    clientHost: 'http://127.0.0.1:9966'
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
