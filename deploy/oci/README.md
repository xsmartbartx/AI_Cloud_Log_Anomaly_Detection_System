# Deploy Linegist on an OCI VM

One VM running Docker Compose: Postgres, a one-off migration and the app. HTTPS comes either from **your existing Caddy** (the VM already serves other sites, see [If the VM already runs Caddy](#if-the-vm-already-runs-caddy)) or from a Caddy this stack starts for you (`--profile standalone`). Everything here was built and tested locally on arm64: the migration runs and is repeatable, the app container is healthy and runs as a non-root user, and the API, Console and purge endpoints work against a real Postgres. What has **not** been tested is anything on OCI itself, plus Clerk and Stripe (they need your accounts).

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
sudo mkdir -p /opt/linegist && sudo chown "$USER": /opt/linegist   # the checkout must belong to the user who deploys
git clone <your repo url> /opt/linegist                            # a private repo needs a deploy key you create
cd /opt/linegist/deploy/oci
cp .env.example .env && chmod 600 .env
```

Add your user to the `docker` group (or run the compose commands with `sudo`) so the scripts below work from cron.

Edit `.env`:
- `LINEGIST_HOST` (already `linegist.onenexora.com`)
- `POSTGRES_PASSWORD`: `openssl rand -hex 24`
- `CRON_SECRET` and `CONSOLE_SHARED_SECRET`: `openssl rand -hex 32` each (the Console secret is shared with the Console owner, see `docs/console-contract.md`)
- Clerk and Stripe values when you have them. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_CLERK_SIGN_IN_URL` are **baked into the image at build time**, so changing them needs a rebuild (`up -d --build`), not just a restart.

## 4. Start

```bash
# Fresh VM with nothing else on ports 80/443: also start Caddy from this stack
docker compose --env-file .env --profile standalone up -d --build

# VM that already runs Caddy or nginx: do NOT start a second one (it would fight for 80/443)
docker compose --env-file .env up -d --build
```

The order is automatic: Postgres becomes healthy, `migrate` applies the SQL files and exits, then the app starts (and Caddy, with the profile). The app listens on `127.0.0.1:3100` only (`LINEGIST_PORT`). Check:

```bash
docker compose ps
curl -s http://127.0.0.1:3100/api/health                       # works from the VM itself
curl -I https://linegist.onenexora.com/api/health               # 200 over HTTPS once DNS and the proxy are set
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
- `backup.sh` writes a compressed `pg_dump` to `/var/backups/linegist` (override with `BACKUP_DIR`; the folder is private, mode 700, files mode 600) and keeps the newest 14. It dumps to a plain file first and checks that `pg_dump` succeeded and finished, so a failed dump exits with an error and **never deletes older backups**. **A backup on the same VM is not enough.** Copy the files off it, for example to OCI Object Storage with the OCI CLI (which you configure), or to another machine. Run it once by hand and look at the file before trusting the schedule.

Restore (the dump uses `--clean --if-exists`, so it works on a database that already has the tables). Stop the app so nothing writes during the restore, and the whole restore runs as one transaction that stops at the first error:

```bash
cd /opt/linegist/deploy/oci
docker compose stop app
gunzip -c /var/backups/linegist/linegist-<time>.sql.gz \
  | docker compose exec -T db psql -X -v ON_ERROR_STOP=1 --single-transaction -U linegist -d linegist
docker compose start app
```

The backup and restore commands were tested locally against a real Postgres 16: a good backup, a failing `pg_dump` (older backups kept), a partial dump (rejected), and a restore into a damaged, populated database that brought back the deleted and changed rows. Still do one restore rehearsal on the VM into a scratch copy before you rely on it.

## Updates

```bash
cd /opt/linegist && git pull && cd deploy/oci && docker compose --env-file .env up -d --build
```

Migrations run on every `up` and are safe to repeat. They only move forward, so to roll back a bad migration restore a backup. To roll back code only, check out the previous commit and rebuild.

To avoid building on a small VM: build the image on your machine or in CI for the VM's architecture, push it to a registry (OCIR, GHCR), set `image:` in the compose file and drop the `build:` blocks. The CI workflow already builds the image on every pull request, so a broken Dockerfile is caught before you deploy.

## If the VM already runs Caddy

Your public DNS already points `onenexora.com`, `sentinel`, `console`, `account` and `status` at one OCI address (`92.5.69.99` when this was written), and `sentinel.onenexora.com` answers through Caddy. If Linegist goes on that same VM, you add one site block to the Caddy that is already there, and one DNS record. Do not start a second Caddy.

### Look before you change anything (read-only)

```bash
free -h; df -h /                                   # Postgres plus the app want about 1 GB free RAM and a few GB of disk
docker ps --format 'table {{.Names}}\t{{.Ports}}'   # is Caddy in Docker or on the host? what already uses which ports?
ss -ltnp | grep -E ':(80|443|3100)\b'              # something already on 3100? set LINEGIST_PORT to another number
```

If memory is tight, build the image elsewhere and pull it (see Updates): the Next build is the heavy part, not running it.

### Bring Linegist up behind the existing proxy

1. Do steps 3 and 4 above **without** `--profile standalone`.
2. Add a site block to the existing Caddyfile. Pick the case that matches `docker ps`:

   **Caddy runs on the host (systemd):**
   ```
   linegist.onenexora.com {
   	encode zstd gzip
   	request_body {
   		max_size 6MB
   	}
   	reverse_proxy 127.0.0.1:3100
   }
   ```

   **Caddy runs in Docker:** attach the app to Caddy's network with the override file (`docker-compose.caddy-network.yml`, instructions at its top), then use
   ```
   linegist.onenexora.com {
   	encode zstd gzip
   	request_body {
   		max_size 6MB
   	}
   	reverse_proxy linegist-app:3000
   }
   ```

   Validate before reloading: `caddy validate --config /path/to/Caddyfile` (in Docker: `docker exec <caddy> caddy validate --config /etc/caddy/Caddyfile`). Reload with `caddy reload ...` (a graceful reload does not drop the other sites).

3. **DNS** at Squarespace (that is where `onenexora.com` is served from, per its name servers): Domains, `onenexora.com`, DNS settings, add an **A record**, host `linegist`, value = the VM's public IP (the same one the other hosts use). The menu names may differ slightly. It must resolve before Caddy can get a certificate for the new name: `dig +short linegist.onenexora.com`.
4. Verify: `curl -I https://linegist.onenexora.com/api/health` is 200, and the other sites still answer.

### Cut over `sentinel.onenexora.com` (later, when Linegist works)

Only once sign-in and a scan work on `linegist.onenexora.com`. Replace the existing `sentinel.onenexora.com` block with a redirect, and point NEXORA's product card at the new host:

```
sentinel.onenexora.com {
	redir https://linegist.onenexora.com{uri} permanent
}
```

### Roll back

Nothing here touches the other sites' containers or data. To undo: remove the `linegist.onenexora.com` block and reload Caddy, delete the A record, and `docker compose down` (add `-v` only if you also want the Linegist database deleted).

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
