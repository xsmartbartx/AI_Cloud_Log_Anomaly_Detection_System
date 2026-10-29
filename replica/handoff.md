# Handoff: what only the owner can do

Everything else is deployed (linegist.onenexora.com, `sentinel` 302 redirect, product card, backups on cron with a tested restore). Date: 2026-10-29.

## 1. Off-site backup (about 10 minutes)

Today the VM has no off-site copy of anything: `/opt/backups/offsite.env` does not exist. NEXORA's `offsite-copy.sh` encrypts each nightly archive with a PUBLIC key and uploads it, so the VM can write the copy but never read it back.

1. Create a bucket or storage box at a provider other than OCI (Backblaze B2, Hetzner Storage Box).
2. On your own machine make a GPG keypair and keep the private half offline: `gpg --full-generate-key`, then `gpg --armor --export <id> > backup-public.asc`.
3. On the VM, as `opc`:
   ```bash
   gpg --import backup-public.asc
   rclone config                                   # add the remote
   install -m 600 /dev/null /opt/backups/offsite.env
   # put in it:  OFFSITE_GPG_RECIPIENT=<key id or e-mail>
   #             OFFSITE_REMOTE=<remote>:<bucket>/nexora
   /opt/nexora/infrastructure/deployment/offsite-copy.sh   # run once, check the file arrived
   ```
4. Add the cron line `30 3 * * * /opt/nexora/infrastructure/deployment/offsite-copy.sh >> /opt/backups/offsite.log 2>&1`.
5. Tell Claude "off-site configured". It then extends the copy to `~/linegist-backups/*.sql.gz`, runs one test and adds the cron line.

Do one real decrypt-and-restore from the off-site copy on your machine before trusting it.

## 2. Console contract

`git log` shows you wrote nearly all of `apps/console`, so you are probably the Console owner and there is no one to send this to. If someone else owns it, send them `docs/console-contract.md` and the message below.

> Linegist (the former Sentinel) now has a read-only usage endpoint for the Console:
> `GET https://linegist.onenexora.com/api/internal/usage?org=<clerk org id>`, signed with HMAC-SHA256 over `"<unix ts>.<org>"` (300 s window). Full contract and test vectors: `docs/console-contract.md` in the Linegist repo. The shared secret is `CONSOLE_SHARED_SECRET` in `~/linegist/deploy/oci/.env` on the VM; get it from the VM, never through chat. Three questions: who owns billing (Linegist runs its own Stripe checkout today), do you need a two-secret rotation overlap, and do you need a bulk endpoint for an admin overview?

If it is you: read the secret from the VM, add the signer from the contract's Node example to the Console, and check it against the three test vectors before the first call.

## 3. Later

| when | what |
| --- | --- |
| about 2026-11-26 | Change `redir ... temporary` to `permanent` for `sentinel.onenexora.com` in `infrastructure/edge/Caddyfile`, PR, `deploy.sh edge`. Keep the old `nexora-sentinel-1` container until then (it is the rollback). |
| before launch | Trademark lawyer's view on Linegist. Brief: name Linegist, class 9/42 (software, SaaS log triage), US/EU/CA. Known near-match to raise: Lingvist (one letter away, language-learning software). Screening results are in `replica/brand.md`. |
| before launch | Terms and Privacy reviewed by a lawyer; list every processor (Clerk, Stripe, host, database, analytics, error tracking). |
| before launch | Real logo, then regenerate the OG image (`apps/sentinel-web/app/opengraph-image.tsx`). |
| before launch | Clerk and Stripe values in the VM `.env`, rebuild the image (the Clerk key is baked in), then `npm run check:stripe`. |
