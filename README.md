# OIM Backend
Backend to produce tiles with Tegola help. Mapping.yml rules the layers produced in the MVT tiles

OSM data is updated with imposm3

## Architecture
Basically, all data (pgsql + pbf files) should be hosted on a dedicated /data volume
Software binaries and git clones are in /opt
User osm owns both software and datas

Logs go in /var/log

## Setup
Follow OSM guidelines at https://wiki.openstreetmap.org/wiki/Debian/Stretch/FR:Installation

### Install dependencies
#### DB
    apt install postgresql postgis osmosis

#### Golang
Download binaries at https://golang.org/dl/

    tar -C /opt/go -xvf go1.13.4.linux-amd64.tar.gz
    export GOROOT=/opt/go
    export GOPATH=/opt/imposm3
    export PATH=$GOPATH/bin:$GOROOT/bin:$PATH

#### Imposm3
Download binaries at https://github.com/omniscale/imposm3/releases

    tar -C /opt/imposm3 -xvf imposm-0.8.1-linux-x86-64.tar.gz

#### Tegola
    wget https://github.com/go-spatial/tegola/releases/download/v0.10.2/tegola_linux_amd64.zip
    unzip tegola_linux_amd64.zip
    mkdir -p /home/osm/go/bin
    cp tegola /home/osm/go/bin

### Setup pgsql: Move datadir to a dedicated volume
    mkdir -p /data/pgsql/11/main
    chown postgres:postgres -R /data/pgsql

    Edit /etc/postgresql/11/main/postgresql.conf and change the data directory
    Use initdb to build a proper data directory: /usr/lib/postgresql/11/bin/initdb -D /data/pgsql/11/main
    Rename or delete original datadir to avoid any error: mv /var/lib/postgresql/11/main /var/lib/postgresql/11/main.bak
    Restart service: systemctl restart postgresql

Then you should get a running status for postgresql service listening on port 5432

### Create osm database
With postgres user:

    createuser osm
    psql -c "ALTER USER osm WITH PASSWORD '#votremdp#';"

    createdb -E UTF8 -O osm
    psql -c "CREATE EXTENSION hstore;" -d osm
    psql -c "CREATE EXTENSION postgis;" -d osm

#### Mapbox vt-utils
Download https://github.com/mapbox/postgis-vt-util/blob/master/postgis-vt-util.sql

As osm user:

    psql -f postgis-vt-util.sql -d osm
    psql -f functions.sql -d osm

### Import OSM data
Download pbf of your choice at https://download.geofabrik.de/
    
    sudo mkdir /data/files
    sudo chmod osm:osm /data/files

And then do the initial import with Imposm3
    
    sudo mkdir /data/updates
    sudo chown osm:osm /data/updates
    sudo chmod 2774 /data/updates
    cd /data/updates
    /opt/imposm3/imposm3 import -cachedir . -config /opt/oim-styles/osmosis/imposm3.conf -mapping /opt/oim-styles/mapping.yml -deployproduction -read /data/files/france-latest.osm.pbf -write -optimize -overwritecache -diff
    cp /data/updates/last.state.txt /data/updates/state.txt

## Running

### Manage tile server
    /home/osm/go/bin/tegola serve --config /opt/oim-styles/config.toml

### Continuous OSM data update
Osmosis is used to maintain the database uptodate with the last imposm3 known state.
This repository provides all needed scripts and services and you only need to link them as follow:

    sudo ln -s /opt/oim-styles/osmosis/update.service /etc/systemd/system/osm-update.service
    sudo ln -s /opt/oim-styles/osmosis/update.timer /etc/systemd/system/osm-update.timer
    sudo systemctl daemon-reload
    sudo systemctl enable osm-update.timer
    sudo systemctl start osm-update.timer 
