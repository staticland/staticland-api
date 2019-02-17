# staticland-api

A secure home for your static sites.

## Features

- One command to deploy a site.
- Automatic SSL using Let's Encrypt.
- Use any static site generator.
- MIT licensed. Host it yourself. Use it how you want.

## Install

### Installing on Ubuntu 16.10

#### Install system dependencies

```bash
sudo apt-get update
sudo apt-get install git bc build-essential nginx
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

#### Install nvm & node

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.1/install.sh | bash
. ~/.bashrc
nvm install v6
```

#### Install certbot

```bash
wget https://dl.eff.org/certbot-auto
chmod a+x ./certbot-auto
./certbot-auto
```

#### Install staticland-api

```bash
git clone https://github.com/staticland/staticland-api.git
cd staticland-api
npm i
```

#### staticland config

Copy the example config file and make changes if needed:

```bash
cp example.config.js config.js
```

#### set NODE_ENV to production

In the `.bashrc` file of the user that will run the staticland server add:

```bash
export NODE_ENV="production"
```

#### nginx config

You can use the nginx config files found in [staticland/config](https://github.com/staticland/config).

Make sure to:

- replace any references to `api.static.land` to the hostname you're using
- change directory references if you place staticland or the sites in a different directory

#### Create cert for api server

```bash
cd ~
./certbot-auto certonly --standalone --agree-tos --redirect --duplicate --text --email hi@static.land -d api.static.land
```

#### restart nginx

```bash
sudo service nginx restart
```

#### install `forever`

```bash
npm i -g forever
```

#### set the STATICLAND_SECRET environment variable

```bash
export STATICLAND_SECRET=SomethingMoreSecretThanThis
```

#### start the staticland server

```bash
forever start index.js
```

#### renewing certificates 

```bash
crontab -e
```

##### add a cron job for renewing site certificates

```
00 00 * * * node /home/ubuntu/staticland-api/bin/renew
```

Sites will get cert renewals based on the `renewEvery` value of the config.js file. The default value of `30` means certs will be renewed every 30 days.

##### add a con job for renewing the api server certificate

```
* 00 * * 1 /home/ubuntu/certbot-auto renew --standalone --pre-hook "service nginx stop" --post-hook "service nginx start" --quiet
```

Every Monday at midnight certbot will check to see if the certificate needs to be renewed.

## License
[MIT](LICENSE.md)
