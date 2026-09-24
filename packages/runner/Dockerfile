# syntax=docker/dockerfile:1.7
# walkeros/flow: a runtime for prebuilt walkerOS flow artifacts (build them with `walkeros bundle`).

# Keep the node and alpine pins on the same alpine minor: the final stage runs
# this stage's node binary on that alpine's musl and libstdc++.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS node

# npm, yarn and the npm cache live only in this stage. The final stage copies
# node_modules out of it, so none of them reach the runtime image's layers.
FROM node AS pkg
ARG RUNNER_VERSION=latest
WORKDIR /app
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund \
    @walkeros/runner@${RUNNER_VERSION}

# The lockfile describes the intended tree, so it stays out of the runtime
# image; release.yml exports it from this stage as a build artifact beside the SBOM.
FROM scratch AS lockfile
COPY --from=pkg /app/package-lock.json /package-lock.json

FROM alpine:3.24.2@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6

# tini for signal handling: Scaleway SIGTERMs the container on every scale-in.
RUN apk upgrade --no-cache && apk add --no-cache libstdc++ tini

COPY --from=node /usr/local/bin/node /usr/local/bin/node

RUN addgroup -g 1001 walker && \
    adduser -D -u 1001 -G walker walker

WORKDIR /app

# node_modules stays owned by root: the runtime user can read it, not rewrite it.
COPY --from=pkg /app/node_modules /app/node_modules

# Only the artifact and cache directories are writable by the runtime user.
RUN mkdir -p /app/flow /app/cache && chown walker:walker /app/flow /app/cache

USER walker

ENV NODE_ENV=production
ENV PORT=8080
ENV BUNDLE=/app/flow/flow.mjs
# Sized for the 512 MB container: V8 fails with a heap-limit trace instead of
# being OOM-killed silently. Revisit to 768 if the container grows to 1 GB.
ENV NODE_OPTIONS=--max-old-space-size=384
ENV PATH="/app/node_modules/.bin:${PATH}"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const h=require('http');h.get('http://localhost:'+(process.env.PORT||8080)+'/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["runneros", "start"]
