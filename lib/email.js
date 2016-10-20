var assert = require('assert')
var postmark = require('postmark')

module.exports = function createMailer (config, cb) {
  assert.equal(typeof config, 'object', 'config object is required')
  assert.equal(typeof config.fromEmail, 'string', 'config.fromEmail is required')
  assert.equal(typeof config.postmarkAPIKey, 'string', 'config.fromEmail property is required')

  var client = new postmark.Client(config.postmarkAPIKey)

  function send (msg, callback) {
    assert.equal(typeof msg, 'object', 'msg object is required')
    assert.equal(typeof msg.to, 'string', 'msg.to property is required and must be a string')
    assert.equal(typeof msg.subject, 'string', 'msg.subject property is required and must be a string')
    assert.ok(msg.text || msg.html, 'either msg.text or msg.html properties are required')
    assert.equal(typeof callback, 'function', 'callback function is required')

    client.sendEmail({
      'From': msg.from || config.fromEmail,
      'To': msg.to,
      'Subject': msg.subject,
      'TextBody': msg.text,
      'HtmlBody': msg.html,
      'Tag': msg.tag
    }, callback)
  }

  return {
    send: send
  }
}
