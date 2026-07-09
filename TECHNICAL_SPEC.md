# BACOVET — Technical Specification Document

> **Version:** 1.0
> **Date:** June 30, 2026
> **Application:** BACOVET — Industrial KPI Dashboard for Textile Manufacturing
> **Production URL:** `https://bacovetaapp.novationcityapp.com`

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [System Requirements](#2-system-requirements)
3. [Database Setup](#3-database-setup)
4. [External Service Credentials](#4-external-service-credentials)
5. [Application Configuration](#5-application-configuration)
6. [Mail Configuration](#6-mail-configuration)
7. [File Storage](#7-file-storage)
8. [Build & Deployment](#8-build--deployment)
9. [Sync Pipeline](#9-sync-pipeline)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Ports & Networking](#11-ports--networking)
12. [Security Hardening](#12-security-hardening)
13. [Optional Enhancements](#13-optional-enhancements)

---

## 1. Application Overview

BACOVET is an industrial KPI dashboard for a Moroccan textile manufacturing facility. It syncs production, quality, logistics, and development data from multiple external APIs, stores it locally, and presents it as a React single-page application served through Laravel using Inertia.js.

**Technology Stack:**

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Laravel | 12.x |
| Frontend | React | 19.x |
| SPA Bridge | Inertia.js | 2.x |
| Build Tool | Vite | 7.x |
| CSS | Tailwind CSS | 4.x |
| Routing (FE) | TanStack Router | latest |
| Forms | react-hook-form + Zod | latest |
| Charts | Recharts | latest |
| PHP | PHP | >= 8.2 (CI pins 8.3) |
| Node.js | Node.js | >= 18 |
| Database | MySQL | 8.x |
| Auth | Laravel Fortify | 1.30+ |

---

## 2. System Requirements

### Operating System

- Linux (Ubuntu 22.04/24.04 LTS recommended, or any modern distribution)
- 2+ CPU cores, 4GB+ RAM recommended
- 20GB+ disk space

### Required Software

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| PHP | 8.2 | Application runtime |
| PHP Extensions | mbstring, bcmath, intl, pdo_mysql, pdo_sqlite, openssl, curl, xml | Required by Laravel |
| MySQL | 8.0 | Primary database |
| Node.js | 18.x | Frontend build |
| npm | 9+ | Package management |
| Composer | 2.x | PHP dependency management |
| Nginx | 1.18+ | Reverse proxy / static file serving |

### PHP Extensions Check

```bash
php -m | grep -E "mbstring|bcmath|intl|pdo_mysql|openssl|curl|xml"
```

All listed extensions must be present. Install missing ones:

```bash
sudo apt install php8.3-mbstring php8.3-bcmath php8.3-intl php8.3-mysql php8.3-curl php8.3-xml php8.3-openssl
```

---

## 3. Database Setup

### MySQL Installation & Configuration

```bash
sudo apt install mysql-server
sudo mysql_secure_installation
```

### Create Database & User

```sql
CREATE DATABASE bacovet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bacovet_user'@'127.0.0.1' IDENTIFIED BY '<YOUR_STRONG_PASSWORD>';
GRANT ALL PRIVILEGES ON bacovet.* TO 'bacovet_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### Environment Variables

| Variable | Production Value | Description |
|----------|-----------------|-------------|
| `DB_CONNECTION` | `mysql` | Database driver |
| `DB_HOST` | `127.0.0.1` | Database host (use localhost via TCP) |
| `DB_PORT` | `3306` | MySQL port |
| `DB_DATABASE` | `bacovet` | Database name |
| `DB_USERNAME` | `bacovet_user` | Database user |
| `DB_PASSWORD` | `<YOUR_STRONG_PASSWORD>` | Database password |

### Post-Deploy Migration

```bash
php artisan migrate --force
php artisan db:seed --force
```

The seeder creates 7 roles: `it`, `direction`, `resp_production`, `chef_atelier`, `resp_qualite`, `methodes`, `planning_coupe`.

---

## 4. External Service Credentials

### 4a. Novacity ERP API

Primary data source for quality, production, and logistics KPIs.

| Variable | Placeholder | Source |
|----------|------------|--------|
| `NOVACITY_BASE_URL` | `https://api.novacity.com` | Provided by Novacity onboarding |
| `NOVACITY_API_KEY` | `your-novacity-api-key` | Novacity admin dashboard → API Keys |
| `NOVACITY_ADMIN_TOKEN` | `your-novacity-admin-token` | Novacity admin dashboard → Admin Tokens |
| `NOVACITY_TIMEOUT` | `10` | Request timeout in seconds (default: 10) |

**Authentication method:** API key sent as `x-api-key` header on all requests. Admin token sent as `Authorization: Bearer <token>` on `/api/admin/jobs` and `/api/admin/jobs/{id}/run` endpoints only.

### 4b. Google Sheets API

Imports data from 9 specific spreadsheets containing supplementary quality and development metrics.

| Variable | Placeholder | Source |
|----------|------------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `/path/to/service-account.json` | Google Cloud Console → IAM → Service Accounts → Create key |
| `GOOGLE_DRIVE_MOCK_MODE` | `false` | Set to `false` for production |
| `GOOGLE_DRIVE_TIMEOUT` | `15` | Request timeout in seconds |

**Service Account Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable the Google Sheets API
4. Create a Service Account → Generate JSON key
5. Share each spreadsheet with the service account email (Viewer access)

**Sheet ID Variables** (extract from spreadsheet URLs — the long string between `/d/` and `/edit`):

| Variable | Spreadsheet Name | Placeholder |
|----------|-----------------|-------------|
| `GOOGLE_DRIVE_BR_PRINT_SHEET_ID` | BR Print | `1AbCDef...` |
| `GOOGLE_DRIVE_BR_CARE_LABEL_SHEET_ID` | BR Care Label | `1AbCDef...` |
| `GOOGLE_DRIVE_BR_ACCESSOIRES_SHEET_ID` | BR Accessoires | `1AbCDef...` |
| `GOOGLE_DRIVE_BR_COMPO_SHEET_ID` | BR Compo | `1AbCDef...` |
| `GOOGLE_DRIVE_INSPECTION_COMMANDE_SHEET_ID` | Inspection Commande | `1AbCDef...` |
| `GOOGLE_DRIVE_DOT_HOT_SHEET_ID` | Dot Hot | `1AbCDef...` |
| `GOOGLE_DRIVE_DEVELOPMENT_SHEET_ID` | Development | `1AbCDef...` |
| `GOOGLE_DRIVE_GAMMES_SHEET_ID` | Gammes | `1AbCDef...` |
| `GOOGLE_DRIVE_COTATION_SHEET_ID` | Cotation | `1AbCDef...` |

### 4c. GPRO Consulting API

External consulting data feed for chain planning, article master, OF dates, and packet follow-up.

| Variable | Placeholder | Source |
|----------|------------|--------|
| `GPRO_CONSULTING_BASE_URL` | `https://api.gpro-consulting.com` | Provided by GPRO onboarding |
| `GPRO_CONSULTING_API_KEY` | `your-gpro-api-key` | GPRO admin portal → API access |
| `GPRO_CONSULTING_TIMEOUT` | `10` | Request timeout in seconds |

**Authentication method:** API key sent as `x-api-key` header.

**Endpoints consumed:**
- `/api/v1/chain-planning`
- `/api/v1/article-master`
- `/api/v1/of-dates`
- `/api/v1/suivi-paquets`

---

## 5. Application Configuration

### Core Application Variables

| Variable | Production Value | Description |
|----------|-----------------|-------------|
| `APP_NAME` | `BACOVET` | Application display name |
| `APP_ENV` | `production` | Environment mode |
| `APP_KEY` | *(generated)* | Encryption key — run `php artisan key:generate` |
| `APP_DEBUG` | `false` | Disable debug mode in production |
| `APP_URL` | `https://bacovetaapp.novationcityapp.com` | Production URL |
| `APP_LOCALE` | `en` | Default locale |
| `APP_FALLBACK_LOCALE` | `en` | Fallback locale |
| `APP_MAINTENANCE_DRIVER` | `file` | Maintenance mode driver |

### Session Configuration

| Variable | Production Value | Description |
|----------|-----------------|-------------|
| `SESSION_DRIVER` | `database` | Session storage driver |
| `SESSION_LIFETIME` | `480` | Session timeout in minutes (8 hours) |
| `SESSION_ENCRYPT` | `false` | Encrypt session data |
| `SESSION_PATH` | `/` | Cookie path |
| `SESSION_DOMAIN` | `null` | Cookie domain (null = root domain) |
| `SESSION_SECURE_COOKIE` | `true` | HTTPS-only cookies — **must be true in production** |
| `SESSION_HTTP_ONLY` | `true` | No JavaScript access to cookies |
| `SESSION_SAME_SITE` | `lax` | CSRF protection for cross-site requests |

### Cache & Queue

| Variable | Production Value | Description |
|----------|-----------------|-------------|
| `CACHE_STORE` | `database` | Cache driver (consider `redis` for better performance) |
| `QUEUE_CONNECTION` | `database` | Queue driver |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |

### Logging

| Variable | Production Value | Description |
|----------|-----------------|-------------|
| `LOG_CHANNEL` | `stack` | Log channel |
| `LOG_STACK` | `single` | Log stack |
| `LOG_LEVEL` | `warning` | Log verbosity (use `debug` only for troubleshooting) |

---

## 6. Mail Configuration

Required for password reset and email verification flows.

### SMTP Configuration

| Variable | Placeholder | Source |
|----------|------------|--------|
| `MAIL_MAILER` | `smtp` | Mail transport |
| `MAIL_HOST` | `smtp.your-provider.com` | Your SMTP server host |
| `MAIL_PORT` | `587` | SMTP port (587 for TLS, 465 for SSL) |
| `MAIL_USERNAME` | `your-email@domain.com` | SMTP username |
| `MAIL_PASSWORD` | `your-smtp-password` | SMTP password |
| `MAIL_SCHEME` | `tls` | Encryption scheme |
| `MAIL_FROM_ADDRESS` | `noreply@bacovet.com` | Sender email address |
| `MAIL_FROM_NAME` | `BACOVET` | Sender display name |

### Alternative Transports

The application also supports Amazon SES, Postmark, and Resend. Configure the relevant API key in `config/services.php` if using one of these.

---

## 7. File Storage

### Local Storage (Default)

Files are stored in `storage/app/private` and `storage/app/public`.

Ensure proper permissions:

```bash
chown -R www-data:www-data storage/
chown -R www-data:www-data bootstrap/cache/
chmod -R 775 storage/
chmod -R 775 bootstrap/cache/
```

### AWS S3 (Optional)

| Variable | Placeholder | Source |
|----------|------------|--------|
| `AWS_ACCESS_KEY_ID` | `your-aws-access-key` | AWS IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | `your-aws-secret-key` | AWS IAM → Users → Security credentials |
| `AWS_DEFAULT_REGION` | `us-east-1` | AWS region |
| `AWS_BUCKET` | `your-bucket-name` | S3 bucket name |
| `AWS_URL` | *(optional)* | Custom URL for S3-compatible services |
| `AWS_ENDPOINT` | *(optional)* | Custom endpoint (e.g., for MinIO) |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `false` | Set `true` for MinIO |

---

## 8. Build & Deployment

### Step 1: Server Setup

```bash
# Install system dependencies
sudo apt update
sudo apt install -y php8.3 php8.3-{mbstring,bcmath,intl,mysql,curl,xml,openssl,fpm} \
  mysql-server nginx nodejs npm composer git

# Install Node.js 18+ (if not available via apt)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Clone & Configure

```bash
# Clone the repository
git clone <repository-url> /var/www/bacovet
cd /var/www/bacovet

# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Install JS dependencies and build frontend
npm ci
npm run build

# Create environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

### Step 3: Configure .env

Edit `/var/www/bacovet/.env` and fill in:

- All database credentials (Section 3)
- All external API credentials (Section 4)
- Application settings (Section 5)
- Mail configuration (Section 6)
- Set `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`

### Step 4: Database Migration

```bash
php artisan migrate --force
php artisan db:seed --force
```

### Step 5: Cache Configuration

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan icons:cache
```

### Step 6: Nginx Configuration

Create `/etc/nginx/sites-available/bacovet`:

```nginx
server {
    listen 80;
    server_name bacovetaapp.novationcityapp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bacovetaapp.novationcityapp.com;

    root /var/www/bacovet/public;
    index index.php;

    # SSL certificates (obtain via Let's Encrypt or your CA)
    ssl_certificate /etc/letsencrypt/live/bacovetaapp.novationcityapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bacovetaapp.novationcityapp.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # Max upload size
    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bacovet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bacovetaapp.novationcityapp.com
```

### Step 8: Set Up Cron

```bash
# Edit crontab
crontab -e

# Add this line:
* * * * * cd /var/www/bacovet && php artisan schedule:work >> /dev/null 2>&1
```

### Step 9: Set Up Queue Worker

```bash
# Create a systemd service for the queue worker
sudo nano /etc/systemd/system/bacovet-worker.service
```

```ini
[Unit]
Description=BACOVET Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/bacovet
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --max-time=3600
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable bacovet-worker
sudo systemctl start bacovet-worker
```

### Step 10: Permissions

```bash
sudo chown -R www-data:www-data /var/www/bacovet
sudo chmod -R 775 /var/www/bacovet/storage
sudo chmod -R 775 /var/www/bacovet/bootstrap/cache
```

---

## 9. Sync Pipeline

BACOVET syncs data from three external sources on a configurable schedule. All intervals are stored in the `sync_settings` database table and can be adjusted at runtime through the admin panel.

### Sync Commands

| Command | Source | Description |
|---------|--------|-------------|
| `sync:quality` | Novacity ERP | Quality inspection metrics (8 queries) |
| `sync:production` | Novacity ERP | Production line performance (19 queries/endpoints) |
| `sync:logistics` | Novacity ERP | Warehouse/logistics data (15 queries/endpoints) |
| `sync:drive` | Google Sheets | Secondary quality and development data (9 sheets) |
| `sync:gpro` | GPRO Consulting | Chain planning, article master, OF dates, packet tracking |
| `sync:full` | All Novacity | Runs quality + production + logistics sequentially |

### Toggle Switches

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_NOVACITY_QUALITY_ENABLED` | `true` | Enable/disable quality sync |
| `SYNC_NOVACITY_PRODUCTION_ENABLED` | `true` | Enable/disable production sync |
| `SYNC_NOVACITY_LOGISTICS_ENABLED` | `true` | Enable/disable logistics sync |
| `SYNC_GOOGLE_DRIVE_ENABLED` | `true` | Enable/disable Google Sheets sync |
| `SYNC_GPRO_ENABLED` | `true` | Enable/disable GPRO sync |
| `SYNC_HISTORY_ENABLED` | `true` | Enable sync history logging |

### Scheduler

The scheduler runs every minute via cron and checks the database for configured intervals. Each sync command has overlap protection:

- `sync:quality` — 5 minute overlap window
- `sync:production` — 5 minute overlap window
- `sync:logistics` — 10 minute overlap window
- `sync:drive` — 10 minute overlap window
- `sync:gpro` — 5 minute overlap window

---

## 10. Authentication & Authorization

### Authentication (Laravel Fortify)

- Login via `matricule` or `email` + password
- Password reset via email
- Email verification
- Two-factor authentication (optional, with confirmation)
- Rate limiting: 5 attempts per minute on login/2FA

### Role-Based Access Control

7 roles are seeded into the database:

| Role | Description | Access Scope |
|------|-------------|-------------|
| `it` | IT / Administrator | Full access to all features |
| `direction` | Direction (Management) | Executive KPIs and reports |
| `resp_production` | Production Manager | Production KPIs and management |
| `chef_atelier` | Workshop Chief | Workshop-level production data |
| `resp_qualite` | Quality Manager | Quality inspection KPIs |
| `methodes` | Methods / Planning | Development and methods data |
| `planning_coupe` | Cutting Planning | Cutting and logistics data |

### Middleware

- `role:it,direction,...` — checks user's role slug against allowed list
- `audit` — logs all POST/PUT/PATCH/DELETE operations to `audit_logs` table
- `active.user` — blocks disabled accounts

---

## 11. Ports & Networking

### Required Ports

| Port | Service | Exposure |
|------|---------|----------|
| 80 | HTTP (nginx) | Public (redirects to 443) |
| 443 | HTTPS (nginx) | Public |
| 3306 | MySQL | **Internal only** (127.0.0.1) |

### Ports NOT Needed in Production

These are development-only ports and should **not** be exposed:

| Port | Service | Dev Only |
|------|---------|----------|
| 8005 | Laravel dev server | Yes |
| 5173 | Vite HMR | Yes |
| 3001 | Novacity mock API | Yes |
| 3002 | Google Drive mock API | Yes |
| 3003 | GPRO Consulting mock API | Yes |

### Firewall Rules

```bash
# Allow only HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH for administration
sudo ufw enable
```

---

## 12. Security Hardening

### Critical Production Settings

| Setting | Value | Reason |
|---------|-------|--------|
| `APP_DEBUG` | `false` | Prevents stack traces from leaking to users |
| `APP_ENV` | `production` | Enables production optimizations |
| `SESSION_SECURE_COOKIE` | `true` | Ensures cookies are only sent over HTTPS |
| `SESSION_HTTP_ONLY` | `true` | Prevents JavaScript access to session cookies |
| `LOG_LEVEL` | `warning` | Reduces log noise in production |

### File Permissions

```bash
# Web user should own the application
sudo chown -R www-data:www-data /var/www/bacovet

# Storage and cache must be writable
sudo chmod -R 775 /var/www/bacovet/storage
sudo chmod -R 775 /var/www/bacovet/bootstrap/cache

# Protect sensitive files
chmod 600 /var/www/bacovet/.env
```

### Application Security Features

- CSRF protection enabled (exemptions: `browser-log`, `auth/login`)
- Rate limiting: 5 login attempts per minute
- Session regeneration on login
- Password hashing with Bcrypt (12 rounds)
- Role-based middleware enforcement
- Audit logging on all write operations

### Infrastructure Recommendations

- Use a dedicated database user with minimal privileges (no `DROP`, `ALTER` on production)
- Enable MySQL general query log for initial monitoring, then disable
- Set up fail2ban for SSH and nginx brute-force protection
- Regular security updates: `sudo apt update && sudo apt upgrade`
- Use SSH key authentication, disable password login

---

## 13. Optional Enhancements

### Redis (Recommended)

For better cache and session performance, install Redis and update:

```
CACHE_STORE=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=<your-redis-password>
REDIS_PORT=6379
```

```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

### Supervisor for Queue Workers

Instead of a basic systemd service, use Supervisor for process management:

```ini
[program:bacovet-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/bacovet/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/bacovet/storage/logs/worker.log
stopwaitsecs=3600
```

### Log Rotation

Configure logrotate for Laravel logs:

```
/var/www/bacovet/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0664 www-data www-data
}
```

### Database Backups

```bash
# Add to crontab for daily backups
0 2 * * * mysqldump -u bacovet_user -p'<password>' bacovet | gzip > /var/backups/bacovet/bacovet_$(date +\%Y\%m\%d).sql.gz
```

### Monitoring

Consider setting up:
- Uptime monitoring (UptimeRobot, Pingdom, or similar)
- Error tracking (Sentry or Laravel's built-in error tracking)
- Log aggregation (Papertrail — config already exists in `config/logging.php`)

---

## Quick Reference: All Environment Variables

### Required (must configure)

```
APP_NAME=BACOVET
APP_ENV=production
APP_KEY=<generated via php artisan key:generate>
APP_DEBUG=false
APP_URL=https://bacovetaapp.novationcityapp.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bacovet
DB_USERNAME=<your-db-user>
DB_PASSWORD=<your-db-password>

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true

NOVACITY_BASE_URL=<novacity-production-url>
NOVACITY_API_KEY=<your-novacity-api-key>
NOVACITY_ADMIN_TOKEN=<your-novacity-admin-token>

GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
GOOGLE_DRIVE_MOCK_MODE=false
GOOGLE_DRIVE_BR_PRINT_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_BR_CARE_LABEL_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_BR_ACCESSOIRES_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_BR_COMPO_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_INSPECTION_COMMANDE_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_DOT_HOT_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_DEVELOPMENT_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_GAMMES_SHEET_ID=<sheet-id>
GOOGLE_DRIVE_COTATION_SHEET_ID=<sheet-id>

GPRO_CONSULTING_BASE_URL=<gpro-production-url>
GPRO_CONSULTING_API_KEY=<your-gpro-api-key>

MAIL_MAILER=smtp
MAIL_HOST=<smtp-host>
MAIL_PORT=587
MAIL_USERNAME=<smtp-username>
MAIL_PASSWORD=<smtp-password>
MAIL_SCHEME=tls
MAIL_FROM_ADDRESS=noreply@bacovet.com
MAIL_FROM_NAME=BACOVET
```

### Optional (defaults work, can customize)

```
NOVACITY_TIMEOUT=10
GPRO_CONSULTING_TIMEOUT=10
GOOGLE_DRIVE_TIMEOUT=15
SESSION_LIFETIME=480
BCRYPT_ROUNDS=12
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=warning
CACHE_STORE=database
QUEUE_CONNECTION=database
SYNC_NOVACITY_QUALITY_ENABLED=true
SYNC_NOVACITY_PRODUCTION_ENABLED=true
SYNC_NOVACITY_LOGISTICS_ENABLED=true
SYNC_GOOGLE_DRIVE_ENABLED=true
SYNC_GPRO_ENABLED=true
SYNC_HISTORY_ENABLED=true
```
