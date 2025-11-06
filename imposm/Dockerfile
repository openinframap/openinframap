FROM python:3.12-slim AS build
# First, build the mapping.json file
COPY . .
RUN python main.py > ./mapping.json

FROM ghcr.io/openinframap/imposm3:1f00c6c08c8e0779f2fc8b738da2369dee8ac5b5
COPY --from=build mapping.json /mapping.json
