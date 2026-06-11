# ntfy - Self-hosted Push Notification Server

Self-hosted [ntfy](https://ntfy.sh/) server for push notifications via HTTP.

## Setup

```bash
cd ~/my-infra/docker/ntfy
docker compose up -d
```

## Usage

### Publish a notification

```bash
# Via curl
curl -d "Hello from Hermes!" ntfy://localhost:8080/hermes

# Via HTTP
curl -d "Hello!" http://localhost:8080/hermes
```

### Subscribe to notifications

```bash
# CLI
ntfy subscribe localhost:8080/hermes

# Curl (stream)
curl -s http://localhost:8080/hermes/json
```

### Phone access (via Tailscale)

Add server URL in the ntfy Android/iOS app:
```
http://100.75.137.33:8080
```

Then subscribe to topic `hermes`.

## Configuration

- **server.yml**: Main server config (cache, attachments, auth)
- **docker-compose.yml**: Docker service definition
- **cache/**: Persistent cache volume (auto-created)

## Notes

- Auth is set to `read-write` (fully open) since this runs on a private Tailscale network
- Attachments up to 50MB are supported
- Cache duration: 12 hours
- Port: 8080 (host) -> 80 (container)
