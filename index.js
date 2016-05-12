var http = require('http')
var config = require('./config')
var staticland = require('./lib/server')(config)

http.createServer(staticland).listen(config.port, function () {
  staticland.log('listening on 127.0.0.1:' + config.port)
})
