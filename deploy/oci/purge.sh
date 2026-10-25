#!/bin/sh
# Daily: delete retained findings older than 30 days. Runs inside the app container so the secret never appears on a command line.
# crontab:  0 3 * * *  /opt/linegist/deploy/oci/purge.sh >> /var/log/linegist-purge.log 2>&1
cd "$(dirname "$0")" || exit 1
docker compose exec -T app node -e "
fetch('http://127.0.0.1:3000/api/cron/purge', { headers: { authorization: 'Bearer ' + process.env.CRON_SECRET } })
  .then(async (r) => { console.log(new Date().toISOString(), r.status, await r.text()); process.exit(r.ok ? 0 : 1); })
  .catch((e) => { console.error(new Date().toISOString(), e.message); process.exit(1); });
"
