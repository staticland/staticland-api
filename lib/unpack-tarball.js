var tar = require('tar-fs')

module.exports = function unpackTarball (req, obj, sitepath, callback) {
  req.pipe(tar.extract(sitepath, {
    dmode: 0555,
    fmode: 0444
  }))

  req.on('end', callback)
}
