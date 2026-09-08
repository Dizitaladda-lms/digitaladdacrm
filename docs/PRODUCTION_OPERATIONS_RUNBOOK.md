# 🛠️ DIZITALADDA CRM - Production Operations Runbook

## 1. System Health Monitoring & Uptime

### Health Check Endpoints
- **Liveness Endpoint**: `GET https://<api-domain>/api/health`
  - Returns `200 OK` with `{ status: "UP", timestamp: "..." }`.
- **Database Readiness Endpoint**: `GET https://<api-domain>/api/health/db`
  - Performs live query (`SELECT 1`) on PostgreSQL pool.

### Automated Monitoring Configuration (BetterUptime / Pingdom / UptimeRobot)
1. **HTTP Monitor URL**: `https://<api-domain>/api/health`
2. **Frequency**: 1 minute interval.
3. **Response Timeout**: 10 seconds.
4. **Alert Channels**: Slack `#devops-alerts`, SMS / PagerDuty to Incident Lead.

---

## 2. Automated PostgreSQL Backups & Disaster Recovery

### Daily Automated Backup (Cron Script)
Run daily at 02:00 UTC:
```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/dizitaladda_crm"
mkdir -p $BACKUP_DIR

# Dump schema + data with compression
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/dizitaladda_crm_backup_$TIMESTAMP.dump"

# Retain backups for 30 days
find $BACKUP_DIR -type f -name "*.dump" -mtime +30 -delete
```

### Database Restore Procedure
To restore from a backup snapshot:
```bash
# 1. Terminate active connections
psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'dizitaladda_crm' AND pid <> pg_backend_pid();"

# 2. Restore database
pg_restore -h $DB_HOST -U $DB_USER -d dizitaladda_crm --clean --if-exists -v "/backups/dizitaladda_crm/dizitaladda_crm_backup_<TIMESTAMP>.dump"
```

---

## 3. SSL / HTTPS & Custom Domain Configuration

1. **Cloudflare / Reverse Proxy Configuration**:
   - SSL/TLS encryption mode: **Full (Strict)**.
   - Always Use HTTPS: **Enabled**.
   - Minimum TLS Version: **TLS 1.2**.
   - HSTS: **Enabled** (max-age 31536000, includeSubDomains, preload).
2. **DNS Records**:
   - `crm.dizitaladda.com` -> CNAME -> Render / Server Hostname.
   - `api-crm.dizitaladda.com` -> CNAME -> Render / Backend Hostname.

---

## 4. Error Tracking & Alerting (Winston / Sentry / CloudWatch)

1. **Winston Error Logs**:
   - Stored in `server/logs/error.log` and `server/logs/combined.log`.
2. **Alert Trigger Criteria**:
   - HTTP 500 rate exceeds 1% of requests over 5 minutes.
   - DB connection pool saturation (`pg-pool timeout`).
   - Unhandled promise rejection or process exit.

---

## 5. Incident Response & Escalation Protocol

| Severity Level | Response SLA | Action Plan |
|:---|:---|:---|
| **P1 - Outage (System Down)** | < 15 Minutes | Incident Lead investigates health status, checks DB pool, restarts container or fails over to standby DB. |
| **P2 - Critical Bug (e.g. Payments/Auth failing)** | < 1 Hour | Rollback previous commit or deploy emergency hotfix via CI. |
| **P3 - Minor UI / Export Issue** | < 24 Hours | Scheduled patch release. |

### Emergency Incident Contact
- **Primary Technical Lead**: DevOps / Engineering Team (`devops@dizitaladda.com`)
- **Escalation Manager**: System Administrator (`admin@dizitaladda.com`)
