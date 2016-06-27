var level = require('level-party')
var through = require('through2')

module.exports = function (config, callback) {
  var db = config.db || level(config.dbDir)
  var site = require('./site')(db, config)
  var le = require('./letsencrypt')(config)
  var renewEvery = config.renewEvery * 24 * 60 * 60 * 1000

  site.createReadStream({ keys: false }).pipe(through.obj(function (data, enc, next) {
    var lastRenewal = Date.parse(data.certRenewed || data.certCreated)
    var currentDate = Date.parse(site.timestamp())
    var diff = currentDate - lastRenewal
    if (diff >= renewEvery) {
      console.log('renewing', data.domain)
      console.log('email:', data.email || config.email || 'hi@static.land')
      console.log('domain:', data.domain)
      console.log('sitesDir:', site.dirs.sitesDir)
      console.log('certsDir:', site.dirs.certsDir)
      console.log('vhostsDir:', site.dirs.vhostsDir)
      console.log('reloadNginx:', site.reloadNginx)
      console.log('testing:', site.testing)
      le.renew({
        email: data.email || config.email || 'hi@static.land',
        domain: data.domain,
        sitesDir: site.dirs.sitesDir,
        certsDir: site.dirs.certsDir,
        vhostsDir: site.dirs.vhostsDir,
        reloadNginx: site.reloadNginx,
        testing: site.testing
      }, function (err) {
        if (err) {
          // console.log(err) 
        }
        next()
      })
    } else {
      console.log('not renewing', data.domain)
      next()
    }
  }))
}
