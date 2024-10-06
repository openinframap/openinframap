FROM python:3.12-slim AS build
# First, build the mapping.json file
COPY . .
RUN python main.py > ./mapping.json

FROM ghcr.io/openinframap/imposm3:latest
COPY --from=build mapping.json /mapping.json