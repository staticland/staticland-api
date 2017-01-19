var http = require('http')
var corsify = require('corsify')
var config = require('./config')
var staticland = require('./lib/server')(config)

var cors = corsify({
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': config.clientHost,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization'
})

http.createServer(cors(staticland)).listen(config.port, function () {
  console.log('listening on 127.0.0.1:' + config.port)
})
