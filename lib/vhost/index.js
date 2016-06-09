var fs = require('fs')
var path = require('path')
var reload = require('../nginx-reload')

var types = {
  ssl: require('./ssl'),
  redirect: require('./redirect')
}

module.exports.ssl = function (options, callback) {
  createVhost('ssl', options, callback)
}

module.exports.redirect = function (options, callback) {
  createVhost('redirect', options, callback)
}

function createVhost (type, options, callback) {
  var content = types[type](options, callback)
  var filepath = path.join(options.vhostsDir, options.domain + '.conf')
  fs.writeFile(filepath, content, function (err) {
    if (err) return callback(err)
    reload(options, callback)
  })
}
