var level = require('level-party')
var through = require('through2')

module.exports = function (config, callback) {
  var db = config.db || level(config.dbDir)
  var site = require('./site')(db, config)
  var cert = require('./cert')(config)
  var renewEvery = config.renewEvery * 24 * 60 * 60 * 1000
  var reload = require('./nginx-reload')
  var shouldReload = false

  site.createReadStream({ keys: false }).pipe(through.obj(function (data, enc, next) {
    var lastRenewal = Date.parse(data.certRenewed || data.certCreated)
    var timestamp = site.timestamp()
    var currentDate = Date.parse(timestamp)
    var diff = currentDate - lastRenewal
    if (diff >= renewEvery) {
      cert.create({
        email: data.email || (config.email && config.email.fromEmail) || 'hi@static.land',
        domain: data.domain,
        debug: site.debug
      }, function (err, stdout, stderr) {
        if (err) console.log(err, stdout, stderr)
        shouldReload = true
        data.certRenewed = timestamp
        site.update(data, function (err, updated) {
          if (err) console.log(err)
          next()
        })
      })
    } else {
      next()
    }
  }, function () {
    if (shouldReload) reload(config, callback)
    else callback()
  }))
}
