FROM oven/bun:1 AS build
WORKDIR /app

ARG TARGETARCH

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates fontconfig libgraphite2-3 libharfbuzz0b libicu76 && \
    if [ "$TARGETARCH" = "arm64" ]; then \
      TECTONIC_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-aarch64-unknown-linux-musl.tar.gz"; \
    else \
      TECTONIC_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-gnu.tar.gz"; \
    fi && \
    curl -fsSL "$TECTONIC_URL" -o tectonic.tar.gz && \
    tar xzf tectonic.tar.gz -C /usr/local/bin && \
    rm tectonic.tar.gz && \
    tectonic --version && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN bun install

COPY . .

RUN bunx vite build

FROM oven/bun:1-slim AS production
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates fontconfig curl libgraphite2-3 libharfbuzz0b libicu76 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/bin/tectonic /usr/local/bin/tectonic
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/latex ./latex
COPY --from=build /app/data ./data
COPY --from=build /app/src/styles ./src/styles
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/src/types ./src/types
COPY --from=build /app/src/db ./src/db
COPY --from=build /app/src/server ./src/server
COPY --from=build /app/drizzle.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN groupadd --system app && useradd --system --gid app --create-home app && \
    chown -R app:app /app /home/app
USER app

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

ENTRYPOINT ["./docker-entrypoint.sh"]
