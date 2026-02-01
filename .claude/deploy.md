# QDog Deployment Guide

## Production Server
- **Host:** dakota.membies.com
- **User:** root
- **SSH Key:** ~/.ssh/id_wiki
- **App Directory:** /root/qdog

## Deploy Command
```bash
ssh -i ~/.ssh/id_wiki root@dakota.membies.com "cd /root/qdog && git pull && docker-compose -f docker-compose.prod.yml up --build -d"
```

## Manual Steps (if needed)

### 1. SSH into server
```bash
ssh -i ~/.ssh/id_wiki root@dakota.membies.com
```

### 2. Navigate to app
```bash
cd /root/qdog
```

### 3. Pull latest code
```bash
git pull origin master
```

### 4. Rebuild and restart containers
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### 5. Check logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

## Rollback
```bash
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml up --build -d
```

## Database
- SQLite stored in Docker volume `qdog-data`
- Persists across container rebuilds
- Backup: `docker cp qdog_qdog_1:/app/data/qdog.db ./backup.db`
