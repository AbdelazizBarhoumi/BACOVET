# Plan: BACOVET Technical Specification Document

## Goal
Create a comprehensive technical specification document (`TECHNICAL_SPEC.md`) at the project root that describes everything needed to provision a VM and run BACOVET in production.

## Document Structure

The spec will be organized into these sections:

### 1. Application Overview
- What BACOVET is (industrial KPI dashboard for textile manufacturing)
- Tech stack summary (Laravel 12 + React 19 + Inertia.js + Vite 7 + Tailwind CSS 4)
- Production URL: `https://bacovetaapp.novationcityapp.com`

### 2. System Requirements
- PHP >= 8.2 with extensions: mbstring, bcmath, intl, pdo_mysql, pdo_sqlite, openssl, curl, xml
- Node.js >= 18
- MySQL 8.x
- Composer
- npm
- Web server (nginx recommended)

### 3. Database Setup
- MySQL database: `bacovet`
- Credentials with placeholders: DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
- Migrations: `php artisan migrate --force`
- Seeders: `php artisan db:seed` (includes roles, users)

### 4. External Service Credentials (with placeholders + source)

#### 4a. Novacity ERP API
- NOVACITY_BASE_URL (production URL from Novacity)
- NOVACITY_API_KEY (from Novacity admin panel)
- NOVACITY_ADMIN_TOKEN (from Novacity admin panel)
- NOVACITY_TIMEOUT (default: 10)

#### 4b. Google Sheets API
- GOOGLE_SERVICE_ACCOUNT_JSON (path to service account JSON file from Google Cloud Console)
- 9 sheet ID variables (from the specific Google Sheets URLs)
- GOOGLE_DRIVE_MOCK_MODE=false for production

#### 4c. GPRO Consulting API
- GPRO_CONSULTING_BASE_URL (production URL from GPRO)
- GPRO_CONSULTING_API_KEY (from GPRO)

### 5. Application Configuration
- APP_KEY (generated via `php artisan key:generate`)
- APP_ENV=production
- APP_DEBUG=false
- APP_URL (production domain)
- SESSION_SECURE_COOKIE=true
- SESSION_DRIVER=database
- CACHE_STORE=database (or redis for better performance)
- QUEUE_CONNECTION=database

### 6. Mail Configuration
- SMTP credentials with placeholders (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD)
- MAIL_FROM_ADDRESS, MAIL_FROM_NAME
- Required for password reset and email verification

### 7. File Storage
- Local storage (default)
- S3 credentials if using AWS (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET, etc.)

### 8. Build & Deployment Steps
- Clone repo
- `composer install --no-dev --optimize-autoloader`
- `npm ci && npm run build`
- Configure .env
- `php artisan key:generate`
- `php artisan migrate --force`
- `php artisan config:cache`
- `php artisan route:cache`
- `php artisan view:cache`
- Set up cron: `* * * * * cd /path/to/app && php artisan schedule:work`
- Set up queue worker: `php artisan queue:work --sleep=3 --tries=3`
- Configure nginx

### 9. Sync Pipeline Configuration
- 5 sync commands (quality, production, logistics, drive, gpro)
- Toggle switches: SYNC_*_ENABLED env vars
- Intervals stored in sync_settings table, configurable via admin panel
- Scheduler must run continuously

### 10. Authentication & Authorization
- Laravel Fortify (login, registration, password reset, 2FA)
- 7 roles: it, direction, resp_production, chef_atelier, resp_qualite, methodes, planning_coupe
- Role middleware enforcement

### 11. Ports & Networking
- Port 80/443 for web traffic (nginx)
- Port 3306 for MySQL (internal only)
- No ports should be exposed externally except 80/443

### 12. Security Hardening Checklist
- APP_DEBUG=false
- SESSION_SECURE_COOKIE=true
- HTTPS enforced
- Database credentials with strong passwords
- File permissions (storage/, bootstrap/cache/ writable by web user)
- CSRF protection enabled
- Rate limiting on auth endpoints

### 13. Optional Enhancements
- Redis for cache/sessions (better performance)
- Queue worker with supervisor
- Log rotation
- Backup strategy for MySQL

## Files to Create
- `D:\projects\BACOVET\TECHNICAL_SPEC.md` — the main spec document

## Verification
- Read the generated document to confirm all sections are complete
- Cross-reference with .env file to ensure no env vars are missing
- Verify all external service credentials are documented with placeholders
