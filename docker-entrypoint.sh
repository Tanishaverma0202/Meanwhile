#!/bin/sh
set -eu

port="${PORT:-80}"
sed "s/__PORT__/${port}/g" /etc/nginx/sites-available/default > /etc/nginx/conf.d/meanwhile.conf
rm -f /etc/nginx/sites-enabled/default

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf