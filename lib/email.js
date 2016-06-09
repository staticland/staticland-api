var nodemailer = require('nodemailer')
var sendgrid = require('nodemailer-sendgrid-transport')

module.exports = function (opts, cb) {
  var emailer = {}
  var options = {
    auth: {
      api_user: opts.SENDGRID_USER,
      api_key: opts.SENDGRID_PASS
    }
  }

  emailer.transport = nodemailer.createTransport(sendgrid(options))
  return emailer
}
