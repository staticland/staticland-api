var level = require('level-party')
var through = require('through2')

module.exports = function (config, callback) {
  var db = config.db || level(config.dbDir)
  var site = require('./site')(db, config)
  var le = require('./letsencrypt')(config)
  var renewEvery = config.renewEvery * 24 * 60 * 60 * 1000
  var reload = require('./nginx-reload')
  var shouldReload = false

  site.createReadStream({ keys: false }).pipe(through.obj(function (data, enc, next) {
    var lastRenewal = Date.parse(data.certRenewed || data.certCreated)
    var timestamp = site.timestamp()
    var currentDate = Date.parse(timestamp)
    var diff = currentDate - lastRenewal
    if (diff >= renewEvery) {
      le.renew({
        email: data.email || config.email || 'hi@static.land',
        domain: data.domain,
        sitesDir: site.dirs.sitesDir,
        certsDir: site.dirs.certsDir,
        vhostsDir: site.dirs.vhostsDir,
        reloadNginx: site.reloadNginx,
        debug: site.debug
      }, function (err) {
        if (err) {
          console.log(err)
        }
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
