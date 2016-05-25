# staticland-api

A secure home for your static sites.

## Features
- One command to deploy a site.
- Automatic SSL using Let's Encrypt.
- Use any static site generator.
- Host it yourself. Use it how you want.

## Limitations
- DNS records must be set up and propogated before deploying a site for the first time.
- Setting aliases or redirects is not currently supported.
- By default the server admin must explicitly give access to users. This will be optional in future releases.

## Deploying sites
Using the [staticland command-line tool]():

Login to a staticland server:

```
  staticland login \
    --email wat@static.land \
    --password thisisnotapassword \
    --server https://api.static.land
```

One command to deploy a site with SSL:

```
  staticland deploy \
    --source /path/to/site \
    --domain example.com
```

## Install

### Installing on Ubuntu 14.04

#### Install system dependencies

```
sudo apt-get update
sudo apt-get git bc build-essential nginx
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

#### nginx config

You can use the nginx config files found in [staticland/config](https://github.com/staticland/config).

#### Create cert for api server

```
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

#### Create `config.js` file

Copy the example config file:

```
cp example.config.js config.js
```

#### Create the users that are able to deploy sites

For each user, run the admin command:

```
./bin/admin {email} {password}
```

Example:

```
./bin/admin hi@example.com notverysecretpassword
```

This creates auth records & access permissions that uses the default required scope that's defined in the `config.js` file.

#### start the staticland server

```
forever start index.js
```

## License
[MIT](LICNESE.md)