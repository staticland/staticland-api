var xtend = require('xtend')

var config = {
  shared: {
    title: 'staticland',
    port: 3322
  },
  development: {},
  production: {}
}

var env = process.env.NODE_ENV || 'development'
module.exports = xtend(config.shared, config[env])
