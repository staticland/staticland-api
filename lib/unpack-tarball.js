var tar = require('tar-fs')
var octal = require('octal')

module.exports = function unpackTarball (req, htmlpath, callback) {
  var tarstream = tar.extract(htmlpath, {
    dmode: octal(555),
    fmode: octal(444)
  })
  req.on('end', callback)
  req.pipe(tarstream)
}
