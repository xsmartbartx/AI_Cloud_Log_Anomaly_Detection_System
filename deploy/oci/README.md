# Deploy Linegist on an OCI VM

One VM running Docker Compose: Postgres, a one-off migration, the app, and Caddy (HTTPS, automatic certificates). Everything here was built and tested locally on arm64: the migration runs and is repeatable, the app container is healthy and runs as a non-root user, and the API, Console and purge endpoints work against a real Postgres. What has **not** been tested is anything on OCI itself, plus Clerk and Stripe (they need your accounts).

## You will need

- An OCI compute instance (arm64 Ampere or x86 both work; the image is built on the VM's own architecture). **2 GB RAM or more** for building. On a 1 GB VM the Next build can run out of memory: add swap, or build the image elsewhere and pull it (see [Updates](#updates)).
- A reserved public IP attached to the instance, so DNS does not break on a reboot.
- Control of DNS for `onenexora.com`.
- Clerk (production) and Stripe keys when you go live. Until then the app starts but fails closed: `/app` returns an error rather than letting anyone in.

## 1. Network

1. In the VCN, allow ingress **TCP 80 and 443** from `0.0.0.0/0` and **22** from your own IP only (security list or network security group).
2. Open the same ports on the VM's own firewall. Some OCI images ship with iptables rules that block 80 and 443 even when the VCN allows them. Check with `sudo iptables -L INPUT -n --line-numbers`, and if needed add rules before the final reject and persist them (the exact commands depend on the image: Ubuntu uses `netfilter-persistent`, Oracle Linux uses `firewalld`).

## 2. DNS

Add an **A record** `linegist` pointing at the VM's reserved public IP (at whoever hosts DNS for `onenexora.com`). Wait until `dig +short linegist.onenexora.com` returns the IP **before** the first start, because Caddy requests its certificate on startup and repeated failures can hit Let's Encrypt rate limits.

If you later want the old `sentinel.onenexora.com` to keep working, add it as a second host in `Caddyfile` with `redir https://linegist.onenexora.com{uri} permanent`.

## 3. Install Docker and get the code

Install Docker Engine and the Compose plugin by following Docker's official instructions for your OS. Then:

```bash
sudo git clone <your repo url> /opt/linegist     # a private repo needs a deploy key you create
cd /opt/linegist/deploy/oci
cp .env.example .env && chmod 600 .env
```

Edit `.env`:
- `LINEGIST_HOST` (already `linegist.onenexora.com`)
- `POSTGRES_PASSWORD`: `openssl rand -hex 24`
- `CRON_SECRET` and `CONSOLE_SHARED_SECRET`: `openssl rand -hex 32` each (the Console secret is shared with the Console owner, see `docs/console-contract.md`)
- Clerk and Stripe values when you have them. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_CLERK_SIGN_IN_URL` are **baked into the image at build time**, so changing them needs a rebuild (`up -d --build`), not just a restart.

## 4. Start

```bash
docker compose --env-file .env up -d --build
docker compose ps
docker compose logs -f app caddy
```

The order is automatic: Postgres becomes healthy, `migrate` applies the SQL files and exits, then `app` starts, then Caddy. Check:

```bash
curl -I https://linegist.onenexora.com/api/health        # 200 over HTTPS
```

## 5. Webhooks

Point these at the public host (details in `replica/setup-checklist.md`):
- Stripe: `https://linegist.onenexora.com/api/webhooks/stripe`
- Clerk: `https://linegist.onenexora.com/api/webhooks/clerk`

## 6. Scheduled jobs

```bash
sudo crontab -e
0 3 * * *   /opt/linegist/deploy/oci/purge.sh  >> /var/log/linegist-purge.log  2>&1
30 3 * * *  /opt/linegist/deploy/oci/backup.sh >> /var/log/linegist-backup.log 2>&1
```

- `purge.sh` deletes retained findings older than 30 days. It runs inside the app container, so the secret never appears on a command line.
- `backup.sh` writes a compressed `pg_dump` to `/var/backups/linegist` (override with `BACKUP_DIR`) and keeps the newest 14. **A backup on the same VM is not enough.** Copy the files off it, for example to OCI Object Storage with the OCI CLI (which you configure), or to another machine. Run it once by hand and look at the file before trusting the schedule.

Restore:

```bash
gunzip -c /var/backups/linegist/linegist-<time>.sql.gz | docker compose exec -T db psql -U linegist -d linegist
```

Test a restore into a throwaway database at least once. An untested backup is a hope.

## Updates

```bash
cd /opt/linegist && git pull && cd deploy/oci && docker compose --env-file .env up -d --build
```

Migrations run on every `up` and are safe to repeat. They only move forward, so to roll back a bad migration restore a backup. To roll back code only, check out the previous commit and rebuild.

To avoid building on a small VM: build the image on your machine or in CI for the VM's architecture, push it to a registry (OCIR, GHCR), set `image:` in the compose file and drop the `build:` blocks. The CI workflow already builds the image on every pull request, so a broken Dockerfile is caught before you deploy.

## Hardening checklist

- SSH keys only, password login off; port 22 limited to your IP
- Automatic security updates for the OS (`unattended-upgrades` on Ubuntu)
- `.env` is `chmod 600` and not in git; the database port is not published (compose publishes only 80 and 443)
- Container logs rotate (10 MB x 3 per service, set in the compose file)
- Uptime check on `/api/health` from outside, and an alert to your email
- One VM is one point of failure. If that matters, move Postgres to a managed database and run two app instances behind an OCI load balancer. The app is stateless, and `PG_POOL_MAX` controls its connection use per instance.

## Things to know

- **Request size:** samples can be 4 MB. Caddy allows up to 6 MB (`request_body` in the `Caddyfile`). Any other proxy or load balancer in front must allow at least that, and nginx's 1 MB default does not.
- **Rate limits** are kept in memory per app instance. With one instance that is exact; with several, each keeps its own counts.
- **Clerk and the domain:** the Clerk production instance is on `onenexora.com`, so sign-in is shared with `account.onenexora.com`. Add `https://linegist.onenexora.com` to its allowed origins and redirect URLs.
