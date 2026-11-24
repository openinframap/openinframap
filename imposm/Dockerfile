# Build mapping.json (arch-independent)
FROM python:3.12-slim AS mapping
WORKDIR /src
COPY . .
RUN python main.py > ./mapping.json

# Compile imposm for the build target architecture (arm64 on Apple Silicon, amd64 elsewhere).
# The published ghcr.io/openinframap/imposm3 image is amd64-only and SIGSEGVs under QEMU.
FROM golang:1.23-bookworm AS imposm-build
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgeos-dev libleveldb-dev gcc g++ \
 && rm -rf /var/lib/apt/lists/*
ENV CGO_ENABLED=1
ARG IMPOSM_VERSION=v0.14.2
RUN go install "github.com/omniscale/imposm3/cmd/imposm@${IMPOSM_VERSION}"

FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgeos-c1v5 libleveldb1d ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=imposm-build /go/bin/imposm /usr/local/bin/imposm
COPY --from=mapping /src/mapping.json /mapping.json
ENTRYPOINT ["imposm"]
