var send = require('appa/send')
var error = require('appa/error')

module.exports = function (db, config) {
  var township = config.township
  var reset = config.reset
  var email = config.email

  return {
    register: register,
    login: login,
    logout: logout,
    destroy: destroy,
    passwordReset: passwordReset,
    passwordResetConfirm: passwordResetConfirm,
    verify: verify
  }

  function register (req, res, ctx) {
    township.register(req, res, ctx, function (err, code, data) {
      if (err) return error(400, err.message).pipe(res)
      send(code, data).pipe(res)
    })
  }

  function login (req, res, ctx) {
    township.login(req, res, ctx, function (err, code, data) {
      if (err) return error(400, err.message).pipe(res)
      send(code, data).pipe(res)
    })
  }

  function logout (req, res, ctx) {
    township.logout(req, res, ctx, function (err, code, data) {
      if (err) return error(400, err.message).pipe(res)
      send(code, data).pipe(res)
    })
  }

  function destroy (req, res, ctx) {
    township.destroy(req, res, ctx, function (err, code, data) {
      if (err) return error(400, err.message).pipe(res)
      send(code, data).pipe(res)
    })
  }

  function verify (req, res, ctx) {
    township.verify(req, function (err, code, data) {
      if (err) return error(400, err.message).pipe(res)
      send(code, data).pipe(res)
    })
  }

  function passwordReset (req, res, ctx) {
    var userEmail = ctx.params.email

    if (req.method === 'POST') {
      township.accounts.findByEmail(userEmail, function (err, account) {
        if (err) return error(404, 'account not found').pipe(res)
        var accountKey = account.auth.key

        reset.create({ accountKey: accountKey }, function (err, token) {
          if (err) return error(500, 'problem creating reset token').pipe(res)

          var reseturl = `${config.clientHost}/reset-password?accountKey=${accountKey}&resetToken=${token}&email=${userEmail}`

          var emailOptions = {
            to: userEmail,
            from: config.fromEmail,
            subject: 'Reset your password at StaticLand',
            html: `<div>
              <p>Hello!</p>
              <p>You recently requested to reset your password. If that wasn't you, you can delete this email.</p>
              <p>Reset your password by clicking this link:</p>
              <p><b><a href="${reseturl}">Reset password</a></b></p>
              <p>Or by following this url:</p>
              <p><a href="${reseturl}">${reseturl}</a></p>
            </div>`
          }

          email.send(emailOptions, function (err, info) {
            if (err) return error(500, 'problem sending confirmation email').pipe(res)

            send({ message: 'Check your email to finish resetting your password' }).pipe(res)
          })
        })
      })
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  }

  function passwordResetConfirm (req, res, ctx) {
    var body = ctx.body

    if (req.method === 'POST') {
      var options = {
        key: body.accountKey,
        basic: {
          email: body.email,
          password: body.newPassword
        }
      }

      township.accounts.auth.update(options, function (err, account) {
        if (err) return error(400, 'problem confirming password reset').pipe(res)
        reset.confirm({ token: body.resetToken, accountKey: body.accountKey }, function (err) {
          if (err) return error(400, 'reset token not valid').pipe(res)
          send({ message: 'password successfully reset' }).pipe(res)
        })
      })
    } else {
      error(405, 'Method not allowed').pipe(res)
    }
  }
}
