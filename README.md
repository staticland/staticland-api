# staticland-api

A secure home for your static sites.

## Features

- One command to deploy a site.
- Automatic SSL using Let's Encrypt.
- Use any static site generator.
- MIT licensed. Host it yourself. Use it how you want.

## Install

### Installing on Ubuntu 14.04

#### Install system dependencies

```
sudo apt-get update
sudo apt-get install git bc build-essential nginx
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

#### Install nvm & node

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.1/install.sh | bash
. ~/.bashrc
nvm install v6
```

#### Install certbot

```
wget https://dl.eff.org/certbot-auto
chmod a+x ./certbot-auto
./certbot-auto
```

#### Install staticland-api

```
https://github.com/staticland/staticland-api.git
cd staticland-api
npm i
```

#### staticland config

Copy the example config file and make changes if needed:

```
cp example.config.js config.js
```

#### nginx config

You can use the nginx config files found in [staticland/config](https://github.com/staticland/config).

Make sure to:

- replace any references to `api.static.land` to the hostname you're using
- change directory references if you place staticland or the sites in a different directory

#### Create cert for api server

```
cd ~
./certbot-auto certonly --standalone --agree-tos --redirect --duplicate --text --email hi@static.land -d api.static.land
```

#### restart nginx

```
sudo service nginx restart
```

#### install `forever`

```
npm i -g forever
```

#### start the staticland server

```
forever start index.js
```


## License
[MIT](LICNESE.md)