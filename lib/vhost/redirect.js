module.exports = function redirectVhost (opts) {
  return `server {
    listen 80;
    listen 443 ssl http2;
    server_name ${opts.redirect};
    return 301 ${opts.domain}$request_uri;
  }`
}
