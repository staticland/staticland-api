var http = require('http')
var config = require('./config')
var staticland = require('./lib/server')(config)

config.hooks = {
  deploy: function (opts, cb) {
    console.log('hooks.deploy', opts)
    cb(null, opts)
  },
  createUser: function (opts, cb) {
    console.log('hooks.createUser', opts)
    cb(null, opts)
  },
  addOwner: function (opts, cb) {
    console.log('hooks.addOwner', opts)
    cb(null, opts)
  }
}

http.createServer(staticland).listen(config.port, function () {
  staticland.log('listening on 127.0.0.1:' + config.port)
})
