# Imposter - Social Deception Role Assignment

Add hidden traitor roles to any game. Transform cooperative board games, party games, or group activities by secretly assigning one player as the imposter, thief, saboteur, or traitor.

**Examples**: Play Monopoly with a secret thief stealing money, or any co-op game where one player secretly works against the group.

## Features

- 🎮 Retro pixel art aesthetic with CRT scanlines
- 🎭 Random imposter selection
- 🔒 Secure room-based gameplay
- 📱 Mobile responsive
- ⚡ Real-time multiplayer with WebSockets

## Development

```bash
# Install dependencies
npm install

# Run development (client on :3000, server on :3001)
npm start

# Or run separately
npm run dev     # Client only
npm run server  # Server only
```

## Production Deployment

### Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# Server
CORS_ORIGIN=https://yourdomain.com
PORT=3001

# Client (for build)
VITE_SOCKET_URL=https://yourdomain.com
```

### Build & Deploy

```bash
# Build client
npm run build

# Run production server
npm run server:prod
```

### Digital Ocean Setup

1. **Create Droplet** (Ubuntu recommended)
2. **Install Node.js** (v18+)
3. **Clone repo and install dependencies**
4. **Set environment variables**
5. **Build client**: `npm run build`
6. **Serve built files**: Use nginx/Apache to serve `dist/` folder
7. **Run server**: Use PM2 or systemd to run `npm run server:prod`

### Systemd Service

Create `/etc/systemd/system/imposter.service`:

```ini
[Unit]
Description=Imposter Game Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/imposter
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="CORS_ORIGIN=https://yourdomain.com"
ExecStart=/usr/bin/npm run server:prod
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable imposter
sudo systemctl start imposter
```

### Nginx Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve client build
    location / {
        root /path/to/imposter/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy WebSocket/API to Node server
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Cloudflare

WebSockets work fine through Cloudflare. No special configuration needed.

## Security Features

- ✅ Input validation (20 char max, alphanumeric only)
- ✅ Rate limiting (2s cooldown on room creation)
- ✅ Room size limits (max 10 players)
- ✅ Host validation (only host can start game)
- ✅ Stale room cleanup (30min inactivity timeout)
- ✅ Memory leak prevention
- ✅ CORS protection

## Tech Stack

- **Frontend**: Preact, Signals, Socket.io-client, Vite
- **Backend**: Node.js, Express, Socket.io
- **Styling**: Custom CSS (retro/pixel art theme)

## License

MIT
