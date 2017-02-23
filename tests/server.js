var http = require('http')
var path = require('path')
var test = require('tape')
var memdb = require('memdb')
var tar = require('tar-fs')
var createTownship = require('township')

var db = memdb()
var createServer = require('../lib/server')
var config = require('../example.config')
var township = createTownship(db, config)
var scopes = config.scopes

var server
var token

function createAdminAccount (creds, callback) {
  creds.scopes = [
    scopes.app.admin,
    scopes.sites.read,
    scopes.sites.write,
    scopes.sites.destroy
  ]

  township.accounts.register(creds, callback)
}

var staticland = require('staticland')({
  server: config.host + ':' + config.port
})

test('start server', function (t) {
  config.db = db
  server = http.createServer(createServer(config)).listen(config.port, function () {
    t.end()
  })
})

test('create an account', function (t) {
  var creds = { email: 'hi@example.com', password: 'hihi' }
  createAdminAccount(creds, function (err, account) {
    t.notOk(err)
    t.ok(account)
    t.ok(account.key)
    t.ok(account.token)
    token = account.token
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
