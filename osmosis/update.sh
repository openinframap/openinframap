#!/bin/sh

(cd /data/updates && \
osmosis --rri workingDirectory=. --wxc update.osc.gz && \
/opt/imposm3/imposm3 diff -quiet -config /opt/oim-styles/osmosis/imposm3.conf update.osc.gz)
