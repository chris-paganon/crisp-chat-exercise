#!/usr/bin/env bash

set -euo pipefail

docker compose --env-file deploy.env up --detach --wait --wait-timeout 60 db
docker compose --env-file deploy.env run --rm --pull always migrate
