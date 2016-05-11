var exec = require('child_process').exec

module.exports = function (opts, callback) {
  if (typeof opts === 'function') callback = opts
  opts = opts || {}
  opts.reload = opts.reload || 'sudo nginx -s reload'
  return exec(opts.reload, callback)
}
