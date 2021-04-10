#!/bin/bash

echo "Starting cron"

crond -b -l 6

echo "Seeding cache"

./seed.sh &

echo "Starting Tegola"
/opt/tegola serve --config /opt/tegola_config/config.toml
