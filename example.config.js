var path = require('path')
var xtend = require('xtend')

var config = {
  shared: {
    title: 'staticland',
    port: 3322,
    secret: 'this is not very secret',
    db: path.join(__dirname, 'db'),
    requiredScope: 'api:access',
    testing: true
  },
  development: {},
  production: {
    secret: process.env.STATICLAND_SECRET
  }
}

var env = process.env.NODE_ENV || 'development'
module.exports = xtend(config.shared, config[env])
