# Generate the Tegola config and bake it into a container.
FROM python:3.9-slim AS build
ARG TEGOLA_CONFIG=.

WORKDIR /app
COPY ./*.py ./
COPY ${TEGOLA_CONFIG}/layers.yml ${TEGOLA_CONFIG}/tegola.yml ./
RUN pip install PyYAML toml
RUN python generate_tegola_config.py ./tegola.yml ./layers.yml > ./config.toml

FROM gospatial/tegola:v0.20.0

ENV BOUNDS="-180,-85.0511,180,85.0511" \
    DB_URI=postgres://user:password@host:5432/database

COPY --from=build /app/config.toml /etc/tegola/config.toml

EXPOSE 80
ENTRYPOINT ["/opt/tegola"]
CMD ["serve", "--config", "/etc/tegola/config.toml"]