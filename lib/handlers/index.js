module.exports = function (config) {
  return {
    accounts: require('./accounts')(config)
  }
}
