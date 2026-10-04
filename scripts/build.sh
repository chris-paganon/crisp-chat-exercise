#!/usr/bin/env bash

set -euo pipefail

docker build --tag "$DOCKIY_APP_IMAGE" --platform "$DOCKIY_PLATFORM" --target app .
docker build --tag "$DOCKIY_MIGRATE_IMAGE" --platform "$DOCKIY_PLATFORM" --target migrate .
