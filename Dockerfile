FROM golang:1.23-alpine AS builder
WORKDIR /workspace

# Install tzdata to get timezone info
RUN apk add --no-cache tzdata

COPY ./ ./
RUN go build -o chaturbate-dvr .

# Final stage: use Alpine instead of scratch to retain timezone info
FROM alpine:latest AS runnable

# Set time zone
ENV TZ=Europe/Copenhagen

# Install tzdata again to support TZ variable
RUN apk add --no-cache tzdata

WORKDIR /usr/src/app
COPY --from=builder /workspace/chaturbate-dvr /chaturbate-dvr

ENTRYPOINT ["/chaturbate-dvr"]
