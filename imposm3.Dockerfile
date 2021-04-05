FROM python:3.6-slim AS builder

COPY ./imposm3/requirements.txt .
COPY ./mapping ./mapping

RUN pip3 install -r requirements.txt \
    && python3 ./mapping/main.py > /opt/mapping.json

# Only Alpine with imposm3
FROM debian:bullseye-slim
ARG IMPOSM3_VERSION=0.11.1

RUN groupadd --gid 10001 -r osm \
    && useradd --uid 10001 -d /home/osm -r -s /bin/false -g osm osm \
    && mkdir -p /opt/imposm3 /data/files/imposm3/cache /data/files/imposm3/diffs /data/files/imposm3/expired \
    && chown -R osm:osm /opt/imposm3 /data/files/imposm3 \
    && apt-get update \
    && apt-get -y --no-install-recommends install curl ca-certificates gnupg cron \
    && curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
    && echo "deb http://apt.postgresql.org/pub/repos/apt bullseye-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get -y --no-install-recommends install postgresql-client-13 libpq-dev libgeos-dev \
    && apt-get clean \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

VOLUME /data/files/imposm3

WORKDIR /opt/imposm3

RUN curl -L https://github.com/omniscale/imposm3/releases/download/v${IMPOSM3_VERSION}/imposm-${IMPOSM3_VERSION}-linux-x86-64.tar.gz -o imposm3.tar.gz \
    && tar -xvf imposm3.tar.gz --strip 1 \
    && rm -f imposm3.tar.gz

COPY --chown=osm:osm ./imposm3/docker-entrypoint.sh ./imposm3/imposm3.conf ./imposm3/clean-expire.sh ./imposm3/crontab ./
COPY --chown=osm:osm ./schema ./schema
COPY --chown=osm:osm --from=builder /opt/mapping.json .

RUN chmod 775 -R . \
    && chmod +x ./docker-entrypoint.sh ./clean-expire.sh \
    && chmod gu+rw /var/run \
    && chmod gu+s /usr/sbin/cron

USER osm

RUN crontab -u osm ./crontab

ENTRYPOINT ["./docker-entrypoint.sh"]