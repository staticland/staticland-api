var test = require('tape')

var createMailer = require('../lib/email')
var config = require('../config')

test('send an email', function (t) {
  var mail = createMailer(config.email)

  mail.send({
    to: 'sethvincent@gmail.com',
    subject: 'staticland email',
    text: 'this is an email'
  }, function (err, res) {
    t.notOk(err)
    t.ok(res)
    t.end()
  })
})
