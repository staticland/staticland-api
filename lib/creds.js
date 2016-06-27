module.exports = function creds (req) {
  var auth = req.headers.authorization
  if (auth && auth.indexOf('Bearer') > -1) {
    return auth.split('Bearer ')[1]
  } else {
    return false
  }
}
