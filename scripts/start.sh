#!/usr/bin/env bash

set -euo pipefail

docker compose --env-file deploy.env up \
  --detach \
  --remove-orphans \
  --pull always \
  --wait \
  --wait-timeout 120 \
  db app
