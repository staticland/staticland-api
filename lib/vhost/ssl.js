module.exports = function sslVhost (opts) {
  return `server {
    listen 443 ssl;
    server_name ${opts.domain};
    root ${opts.sitesDir}/html/${opts.domain};

    ssl on;
    ssl_certificate ${opts.sitesDir}/certs/${opts.domain}/fullchain.pem;
    ssl_certificate_key ${opts.sitesDir}/certs/${opts.domain}/privkey.pem;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';
    ssl_prefer_server_ciphers on;
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate ${opts.sitesDir}/certs/${opts.domain}/ca.pem;

    ssl_session_cache shared:SSL:10m;
    ssl_dhparam /etc/ssl/certs/dhparam.pem;

    location / {
      try_files $uri $uri/ $uri.html @rewrites;
    }

    location @rewrites {
      rewrite ^(.+)$ /200.html last;
    }
  }`
}
