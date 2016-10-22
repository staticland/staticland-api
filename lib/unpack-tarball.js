var tar = require('tar-fs')
var octal = require('octal')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

module.exports = function unpackTarball (req, htmlpath, callback) {
  rimraf(htmlpath, function (err) {
    if (err) return callback(err)

    mkdirp(htmlpath, function (err) {
      if (err) return callback(err)

      var tarstream = tar.extract(htmlpath, {
        dmode: octal(555),
        fmode: octal(444)
      })
      req.on('end', callback)
      req.pipe(tarstream)
    })
  })
}
