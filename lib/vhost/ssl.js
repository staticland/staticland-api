module.exports = function sslVhost (opts) {
  return `server {
  listen 80;
  server_name ${opts.domain};
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name ${opts.domain};
  root ${opts.sitesDir}/html/${opts.domain};

  ssl on;
  ssl_certificate ${opts.certsDir}/live/${opts.domain}/fullchain.pem;
  ssl_certificate_key ${opts.certsDir}/live/${opts.domain}/privkey.pem;
  ssl_trusted_certificate ${opts.certsDir}/live/${opts.domain}/fullchain.pem;

  ssl_session_timeout 5m;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';
  ssl_ecdh_curve secp384r1;
  ssl_prefer_server_ciphers on;
  ssl_stapling on;
  ssl_stapling_verify on;
  ssl_session_cache shared:SSL:10m;
  ssl_dhparam /etc/ssl/certs/dhparam.pem;

  add_header Strict-Transport-Security "max-age=15768000" always;
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;

  error_page 400 401 402 403 404 500 /404.html;

  location / {
    try_files $uri $uri/ $uri.html /200.html =404;
  }

  location /404.html {
    try_files /404.html @error;
    internal;
  }

  location @error {
    root /home/staticland/staticland-api/html;
  }

  location ~ /.well-known {
    root /home/ubuntu/staticland-api/html;
  }
}`
}
