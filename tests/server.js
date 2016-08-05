var http = require('http')
var path = require('path')
var test = require('tape')
var memdb = require('memdb')
var tar = require('tar-fs')

var config = require('../config')
var createAdminAccount = require('../lib/create-admin-account')
var createServer = require('../lib/server')
var server
var token

var staticland = require('staticland')({
  server: config.host + ':' + config.port
})

test('start server', function (t) {
  config.db = memdb()
  server = http.createServer(createServer(config)).listen(config.port, function () {
    t.end()
  })
})

test('create an account', function (t) {
  var creds = { basic: { email: 'hi@example.com', password: 'hihi' } }
  createAdminAccount(config, creds, function (err, account) {
    t.notOk(err)
    t.ok(account)
    t.ok(account.key)
    t.ok(account.auth)
    t.ok(account.auth.basic)
    t.equal(account.auth.basic.email, 'hi@example.com')
    t.notOk(account.auth.basic.hash)
    t.notOk(account.auth.basic.salt)
    t.ok(account.access.scopes)
    t.ok(account.token)
    t.end()
  })
})

test('log in', function (t) {
  var options = { email: 'hi@example.com', password: 'hihi' }
  staticland.login(options, function (err, res, body) {
    t.notOk(err)
    t.ok(res)
    t.ok(body)
    token = body.token
    t.end()
  })
})

test('deploy', function (t) {
  var tarstream = tar.pack(path.join(__dirname, 'example-site'))
  var options = { domain: 'hi.com', authorization: `Bearer ${token}` }
  staticland.deploy(tarstream, options, function (err, res, body) {
    t.notOk(err)
    t.ok(res)
    t.ok(body)
    t.end()
  })
})

test('add owner', function (t) {
  t.end()
})

test('close server', function (t) {
  server.close()
  t.end()
})
