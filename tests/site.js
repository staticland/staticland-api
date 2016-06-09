var fs = require('fs')
var test = require('tape')
var config = require('../config')
var db = require('memdb')()
var site = require('../lib/site')(db, config)

test('site object has a dirs object & creates directories', function (t) {
  t.ok(site.dirs)
  t.ok(site.dirs.sitesDir)
  t.ok(site.dirs.certsDir)
  t.ok(site.dirs.htmlDir)
  t.ok(site.dirs.vhostsDir)
  t.end()

  t.test('site creates dirs.sitesDir', function (t) {
    fs.stat(site.dirs.sitesDir, function (err, info) {
      t.notOk(err)
      t.ok(info)
      t.end()
    })
  })

  t.test('site creates dirs.certsDir', function (t) {
    fs.stat(site.dirs.certsDir, function (err, info) {
      t.notOk(err)
      t.ok(info)
      t.end()
    })
  })

  t.test('site creates dirs.htmlDir', function (t) {
    fs.stat(site.dirs.htmlDir, function (err, info) {
      t.notOk(err)
      t.ok(info)
      t.end()
    })
  })

  t.test('site creates dirs.vhostsDir', function (t) {
    fs.stat(site.dirs.vhostsDir, function (err, info) {
      t.notOk(err)
      t.ok(info)
      t.end()
    })
  })
})

test('site.firstDeploy', function (t) {
  site.firstDeploy('test1.com', function (err, obj) {
    t.notOk(err)
    t.ok(obj)
    t.equal(obj.deploys, 1)
    t.end()
  })

  t.test('site.firstDeploy creates directories', function (t) {
    fs.stat(site.dirs.sitesDir, function (err, info) {
      t.notOk(err)
      t.ok(info)
      t.end()
    })
  })
})

test('site.redirect', function (t) {
  site.redirect({
    redirect: 'from.example.com',
    domain: 'to.example.com'
  }, function (err) {
    t.notOk(err)
    t.end()
  })
})

test('site.find', function (t) {
  site.firstDeploy('test2.com', function (err, obj) {
    t.notOk(err)
    site.find('test2.com', function (err, found) {
      t.notOk(err)
      t.ok(found)
      t.equal(found.deploys, 1)
      t.end()
    })
  })
})

test('site.destroy', function (t) {
  site.destroy('test2.com', function (err) {
    t.notOk(err)
    site.find('test2.com', function (err, obj) {
      t.ok(err)
      t.equal(err.message, 'Not found')
      t.end()
    })
  })
})
