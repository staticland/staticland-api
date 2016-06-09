var exec = require('child_process').exec

module.exports = function (config, callback) {
  if (typeof config === 'function') callback = config
  config = config || {}
  config.reloadNginx = config.reloadNginx || 'sudo nginx -s reload'
  return exec(config.reloadNginx, callback)
}
