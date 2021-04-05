#!/bin/bash

echo "Tidying imposm3 expired logs"

# Delete expire files older than $1 minutes
find /data/files/imposm3/expired -mmin $1 -type f -name "*.tiles" -delete

# Delete empty subdirs
find /data/files/imposm3/expired/* -type d -empty -delete