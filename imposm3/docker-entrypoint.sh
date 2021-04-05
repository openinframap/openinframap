#!/bin/bash

command=${1}

# Source DB_URL for cronjobs
echo "export DB_URL=$DB_URL" > ./.cronenv
chmod +x ./.cronenv

if [ -z $DB_URL ]; then
    echo "Required env variable DB_URL should be set to reach pgsql backend"
    exit 1
fi

echo "Executing ${command} command"

case $command in
"import")
    # Update OSM data
    if [ ! -z $OSM_FILE ]; then
        rm -f /data/files/imposm3/osm.pbf
        curl -o /data/files/imposm3/osm.pbf $OSM_FILE
    fi

    # Views cleanup
    psql -d $DB_URL -f ./schema/functions.sql

    # Imposm3 import
    /opt/imposm3/imposm3 import -connection $DB_URL -config /opt/imposm3/imposm3.conf -deployproduction -read /data/files/imposm3/osm.pbf -write -optimize -overwritecache -diff

    # View install
    psql -d $DB_URL -f ./schema/views.sql
    
    echo "Starting cron"
    cron

    echo "Import finished, now switching on continuous update"
    /opt/imposm3/imposm3 run -connection $DB_URL -config /opt/imposm3/imposm3.conf
    ;;
"run")
    echo "Starting cron"
    cron
    
    /opt/imposm3/imposm3 run -connection $DB_URL -config /opt/imposm3/imposm3.conf
    ;;
esac