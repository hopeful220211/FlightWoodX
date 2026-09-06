#!/bin/sh
# Install as a Certbot deploy hook only on this existing Compose deployment.
set -eu
docker exec flightwoodx-nginx-1 nginx -t
docker exec flightwoodx-nginx-1 nginx -s reload
