# Deployment Guide

This guide covers deploying Forja to production environments.

---

## Docker Compose (Recommended)

The simplest production deployment uses Docker Compose.

### 1. Server Requirements

- Linux server (Ubuntu 22.04+ recommended)
- Docker Engine 24+ and Docker Compose v2
- 1GB RAM minimum (256MB DB + 512MB App + overhead)
- 1 vCPU minimum
- 10GB disk space

### 2. Setup

```bash
# Clone the repository
git clone https://github.com/Pl3ntz/forja.git
cd forja

# Create production environment file
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` with production values:

```env
# Database
POSTGRES_USER=cvbuilder
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=cvbuilder

# Auth (REQUIRED — generate with: openssl rand -hex 32)
BETTER_AUTH_SECRET=<your-64-char-hex-string>
BETTER_AUTH_URL=https://your-domain.com

# PDF
PDF_CONCURRENCY=2

# Admin
ADMIN_EMAIL=admin@your-domain.com
ADMIN_SEED_PASSWORD=<strong-admin-password>

# Demo (disable in production)
SEED_DEMO=false

# AI (optional)
GROQ_API_KEY=<your-groq-api-key>
```

**Important:** Generate strong, unique passwords:
```bash
# Auth secret
openssl rand -hex 32

# Database password
openssl rand -base64 24

# Admin password
openssl rand -base64 18
```

### 4. Start Services

```bash
docker compose up -d
```

This will:
1. Pull/build images
2. Start PostgreSQL
3. Wait for DB health check
4. Run migrations
5. Seed admin user
6. Start the application

### 5. Verify

```bash
# Check service status
docker compose ps

# Check health
curl -s http://localhost:4321/api/health

# View logs
docker compose logs -f app
```

---

## Reverse Proxy Setup

### With Traefik (included in docker-compose.yml)

The `docker-compose.yml` includes Traefik labels for automatic HTTPS:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=easypanel"
  - "traefik.http.routers.forja.rule=Host(`your-domain.com`)"
  - "traefik.http.routers.forja.entrypoints=https"
  - "traefik.http.routers.forja.tls.certresolver=letsencrypt"
  - "traefik.http.services.forja.loadbalancer.server.port=4321"
```

**Requirements:**
- Traefik running on the same Docker network (`easypanel`)
- DNS pointing to your server
- Traefik configured with Let's Encrypt cert resolver

### With Nginx

If you prefer Nginx as a reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4321;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### With Caddy

```Caddyfile
your-domain.com {
    reverse_proxy localhost:4321
}
```

Caddy handles HTTPS automatically.

---

## Resource Limits

The `docker-compose.yml` defines resource constraints:

| Service | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|---------|-----------|-------------|-------------|-----------------|
| `app` | 0.50 | 1GB | 0.25 | 256MB |
| `db` | 0.25 | 256MB | 0.10 | 128MB |

Adjust in `docker-compose.yml` under `deploy.resources` based on your server capacity.

---

## Health Checks

Both services have health checks configured:

| Service | Check | Interval | Timeout | Retries | Start Period |
|---------|-------|----------|---------|---------|-------------|
| `db` | `pg_isready` | 10s | 5s | 5 | 10s |
| `app` | `curl /api/health` | 30s | 10s | 3 | 30s |

Services auto-restart on failure (`restart: unless-stopped`).

---

## Backups

### Database Backup

```bash
# Create a backup
docker compose exec db pg_dump -U cvbuilder cvbuilder > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose exec -T db psql -U cvbuilder cvbuilder < backup_20250101.sql
```

### Automated Backups

Add a cron job:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/forja && docker compose exec -T db pg_dump -U cvbuilder cvbuilder | gzip > /backups/cv_$(date +\%Y\%m\%d).sql.gz
```

---

## Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose build
docker compose up -d

# Migrations run automatically on startup
```

The `docker-entrypoint.sh` runs `drizzle-kit migrate` on every start, so schema changes are applied automatically.

---

## Monitoring

### Logs

```bash
# Follow app logs
docker compose logs -f app

# Follow database logs
docker compose logs -f db

# Last 100 lines
docker compose logs --tail 100 app
```

### Health Endpoint

```bash
# Quick health check
curl -sf http://localhost:4321/api/health && echo "OK" || echo "DOWN"
```

### Resource Usage

```bash
# Container stats
docker stats forja-app forja-postgres
```

---

## Troubleshooting

### App won't start

```bash
# Check logs
docker compose logs app

# Common issues:
# - DATABASE_URL wrong → "Database not reachable"
# - BETTER_AUTH_SECRET missing → auth initialization fails
# - Port 4321 in use → "address already in use"
```

### Database connection issues

```bash
# Check if database is running
docker compose ps db

# Check database logs
docker compose logs db

# Test connection manually
docker compose exec db psql -U cvbuilder -d cvbuilder -c "SELECT 1"
```

### PDF generation fails

```bash
# Check if Tectonic is available
docker compose exec app tectonic --version

# Test PDF generation
docker compose exec app bun run build:pdf
```

### Out of memory

Increase memory limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 1G
```

### Slow AI responses

- Check your `GROQ_API_KEY` quota at [Groq Console](https://console.groq.com)
- ATS scores are cached for 5 minutes — second request should be instant
- The 30-second timeout prevents hanging requests

---

## Platform-Specific Notes

### EasyPanel

The `docker-compose.yml` is pre-configured for EasyPanel with Traefik integration via the `easypanel` external network.

### Railway / Render / Fly.io

For platforms that provide a managed database:
1. Set `DATABASE_URL` to the provided PostgreSQL connection string
2. Remove the `db` service from `docker-compose.yml`
3. Build and deploy the `app` service only

### VPS (DigitalOcean, Hetzner, etc.)

Follow the Docker Compose instructions above. Ensure:
- Firewall allows ports 80 and 443 (for reverse proxy)
- Port 4321 is NOT exposed publicly (only via reverse proxy)
- Swap is configured if RAM is limited (1GB minimum)
