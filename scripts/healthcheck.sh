#!/usr/bin/env bash

set -euo pipefail

[[ "$(docker compose --env-file deploy.env ps --status running --services app)" == "app" ]]
