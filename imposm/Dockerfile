FROM python:3.12-slim AS build
# First, build the mapping.json file
COPY . .
RUN python main.py > ./mapping.json

FROM ghcr.io/openinframap/imposm3@sha256:39cae056ebd941f8eb112714859edf232f5714e185cafe638a35bac4155bf93b
COPY --from=build mapping.json /mapping.json
