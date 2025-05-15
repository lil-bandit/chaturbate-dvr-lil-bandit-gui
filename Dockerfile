FROM golang:1.23-alpine AS builder
WORKDIR /workspace

COPY ./ ./
RUN go build -o chaturbate-dvr .

FROM scratch AS runnable
WORKDIR /usr/src/app

COPY --from=builder /workspace/chaturbate-dvr /chaturbate-dvr

EXPOSE 8080

ENTRYPOINT ["/chaturbate-dvr"]