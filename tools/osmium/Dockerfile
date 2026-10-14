# osmium-tool, used by scripts/build-region.sh to pre-filter a Geofabrik
# extract down to the objects the imposm mapping actually imports.
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends osmium-tool \
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["osmium"]
