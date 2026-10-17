# NaviSecret — Data Migration, Backup & Recovery Guide

This guide describes safe procedures for backing up, migrating, verifying, and restoring PostgreSQL database tables, user records, and storage assets in the **NaviSecret** platform without data loss.

---

## 1. Architectural Context

NaviSecret uses PostgreSQL 15+ as its native database engine with:
- **Core Tables:** `locations_current`, `share_rules`, `locations_history`, `profiles`, `friend_requests`, `groups`, `group_members`, `chat_rooms`, `messages`, `location_reactions`, `bump_events`, `favorite_places`, `visited_cells`, `sharing_policies`.
- **GeoDrop Tables:** `geo_drops`, `drop_claims`, `drop_shares`, `drop_location_logs`.
- **System Schemas:** `auth` (users, sessions), `storage` (buckets, object metadata).
- **PostGIS Extensions:** Spatial indexing and proximity calculation functions.
- **Row Level Security (RLS):** Strict multi-tenant privacy boundaries enforced on every table.

---

## 2. Backup Procedures (Export)

Always create consistent backups before performing updates, schema migrations, or server transfers.

### 2.1. Full Cluster Backup (Schema + Data)

```bash
# Create timestamped custom-format PostgreSQL dump
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec -t navisecret_db pg_dump -U postgres -F c -b -v postgres > navisecret_backup_${TIMESTAMP}.dump

# Verify backup file size
ls -lh navisecret_backup_${TIMESTAMP}.dump
```

### 2.2. Schema-Only Export (DDL)

```bash
docker exec -t navisecret_db pg_dump -U postgres --schema-only postgres > navisecret_schema.sql
```

### 2.3. Data-Only Export (Excluding DDL)

```bash
docker exec -t navisecret_db pg_dump -U postgres --data-only --exclude-schema=extensions postgres > navisecret_data.sql
```

### 2.4. Storage Files Backup

Avatar images and encrypted media files reside in the `navisecret_storage_data` volume:

```bash
# Archive storage volume to tarball
docker run --rm \
  -v navisecret_storage_data:/data:ro \
  -v $(pwd):/backup \
  alpine tar -czf /backup/navisecret_storage_${TIMESTAMP}.tar.gz -C /data .
```

---

## 3. Migration from Remote/Hosted Supabase to NaviSecret Self-Hosted

If migrating existing data from a remote Supabase project to your self-hosted NaviSecret instance:

### Step 1: Dump Remote Supabase Database

```bash
# Using direct connection string from your Supabase Project Settings > Database
pg_dump "postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres" \
  -F c -b -v -f remote_supabase_dump.dump
```

### Step 2: Test Restore in an Isolated Environment

> [!IMPORTANT]
> Never restore directly into production without verifying in a temporary test container first.

```bash
# Start a temporary test PostgreSQL container
docker run -d --name navisecret_migration_test \
  -e POSTGRES_PASSWORD=testpass \
  supabase/postgres:15.6.1.130

# Wait for database to initialize
sleep 10

# Perform test restore
docker exec -i navisecret_migration_test pg_restore -U postgres -d postgres -c < remote_supabase_dump.dump

# Inspect integrity and verify no fatal errors occurred
docker logs navisecret_migration_test --tail 50

# Remove test container when verified
docker rm -f navisecret_migration_test
```

### Step 3: Restore to Target Self-Hosted PostgreSQL

```bash
# Stop backend consumers temporarily to prevent concurrent writes
docker compose stop web auth rest realtime storage

# Restore database from verified dump
docker exec -i navisecret_db pg_restore -U postgres -d postgres --clean --if-exists < remote_supabase_dump.dump

# Restart all services
docker compose start
```

---

## 4. Post-Migration Verification Checklist

Execute this verification script to validate row counts, foreign key integrity, and RLS policies:

```bash
docker exec -i navisecret_db psql -U postgres -d postgres << 'EOF'
-- 1. Table Row Counts
SELECT
  schemaname || '.' || relname AS table_name,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 2. Verify RLS is Enabled Across All Application Tables
SELECT
  relname AS table_name,
  CASE WHEN relrowsecurity THEN 'ENABLED (OK)' ELSE 'DISABLED (CRITICAL RISK)' END AS rls_status
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER BY relname;

-- 3. Verify Realtime Publication
SELECT pubname, puballtables FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 4. Verify Active Users
SELECT count(*) AS total_registered_users FROM auth.users;

-- 5. Verify Storage Buckets
SELECT id, name, public FROM storage.buckets;
EOF
```

---

## 5. Automated Backup Cron Job

To automatically back up the database daily on your production host, add this cron job (`crontab -e`):

```bash
# Daily NaviSecret backup at 03:00 AM (keeps last 14 days)
0 3 * * * cd /opt/navisecret && docker exec navisecret_db pg_dump -U postgres -F c postgres > /var/backups/navisecret/navisecret_$(date +\%Y\%m\%d).dump && find /var/backups/navisecret -type f -mtime +14 -delete
```

---

## 6. Disaster Recovery & Rollback Plan

If a deployment or schema migration encounters critical issues:

1. **Stop traffic:**
   ```bash
   docker compose stop web
   ```
2. **Restore previous snapshot:**
   ```bash
   docker exec -i navisecret_db pg_restore -U postgres -d postgres -c < /var/backups/navisecret/navisecret_PREVIOUS_WORKING.dump
   ```
3. **Verify database state:**
   ```bash
   docker exec -i navisecret_db psql -U postgres -d postgres -c "SELECT count(*) FROM locations_current;"
   ```
4. **Resume traffic:**
   ```bash
   docker compose start web
   ```
