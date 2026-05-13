#!/usr/bin/env bash
set -euo pipefail

# MariaDB daily backup to Backblaze B2
# Retention: 7 days

DB_NAME="superflow_app"
DB_USER="myapp_user"
DB_PASS="asdqwe@123"
DB_HOST="mariadb-bzki-mariadb-1"
BACKUP_DIR="/home/super-service-app/backups"
B2_BUCKET="PrioraFlow"
B2_PREFIX="backups/mariadb"
RETENTION_DAYS=7

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Dump and compress
docker exec "${DB_HOST}" mysqldump -u"${DB_USER}" -p"${DB_PASS}" --single-transaction --quick --databases "${DB_NAME}" 2>/dev/null | gzip > "${DUMP_FILE}"

# Upload to B2
python3 -c "
import boto3, sys, os
from datetime import datetime, timedelta

s3 = boto3.client('s3',
    endpoint_url='https://s3.us-east-005.backblazeb2.com',
    aws_access_key_id='0057ceeaf39019a0000000001',
    aws_secret_access_key='K005bc4UC/nLqmMNYF6Z4UbRt70HBJQ',
    region_name='us-east-005'
)

key = '${B2_PREFIX}/${TIMESTAMP}.sql.gz'
s3.upload_file('${DUMP_FILE}', '${B2_BUCKET}', key)
print(f'Uploaded: {key}')

# Delete backups older than retention period
cutoff = datetime.utcnow() - timedelta(days=${RETENTION_DAYS})
response = s3.list_objects_v2(Bucket='${B2_BUCKET}', Prefix='${B2_PREFIX}/')
if 'Contents' in response:
    for obj in response['Contents']:
        last_modified = obj['LastModified'].replace(tzinfo=None)
        if last_modified < cutoff:
            s3.delete_object(Bucket='${B2_BUCKET}', Key=obj['Key'])
            print(f'Deleted old backup: {obj[\"Key\"]}')
"

# Remove local dump after upload
rm -f "${DUMP_FILE}"
echo "Backup complete: ${TIMESTAMP}"