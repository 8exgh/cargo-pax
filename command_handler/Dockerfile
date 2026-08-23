FROM rust:1.70 as builder
WORKDIR /usr/src/commandhandler
COPY . .
RUN cargo install --path .

FROM debian:bullseye-slim
# RUN apt-get update && apt-get install -y extra-runtime-dependencies && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/cargo/bin/command_handler /usr/local/bin/command_handler

EXPOSE 9090

CMD ["command_handler"]