FROM golang:1.27.2-alpine@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS builder
ARG GO_PROXY=https://proxy.golang.org|direct
ENV GOTOOLCHAIN=local CGO_ENABLED=0 GOMAXPROCS=1 GOFLAGS=-p=1 GOMEMLIMIT=384MiB GOPROXY=${GO_PROXY}
RUN apk add --no-cache git
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build go install github.com/caddyserver/xcaddy/cmd/xcaddy@v0.4.7
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build xcaddy build v2.11.7 --replace golang.org/x/net=golang.org/x/net@v0.60.0 --output /caddy

FROM caddy:2.11.7-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
COPY --from=builder /caddy /usr/bin/caddy
RUN addgroup -g 10001 edge && adduser -D -u 10001 -G edge edge && chown -R 10001:10001 /data /config /etc/caddy
COPY --chown=10001:10001 infrastructure/caddy /etc/caddy
USER 10001:10001
EXPOSE 8080 8443
HEALTHCHECK --interval=15s --timeout=6s --start-period=20s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8081/health/ready
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
