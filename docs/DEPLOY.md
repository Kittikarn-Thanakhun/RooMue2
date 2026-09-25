# Deploying Roo_mue to the web (Vercel + Neon)

This deploys the **web app** to Vercel with a **Neon PostgreSQL** database.

> The Thai sign-language mode works fully (it runs in the browser). The ASL
> fingerspelling (A–Z) mode runs `models/asl-alphabet/model.onnx` (~340MB)
> server-side via `onnxruntime-node` (`/api/sign-alphabet`) — generate that
> file locally with `python scripts/export_asl_alphabet.py` (see its
> docstring). **This is too large for Vercel's serverless function size
> limit**, so the A–Z mode will not work on a default Vercel deploy; host it
> on a platform with a larger function/container size limit (or a small VPS)
> if you need it in production. The Thai-word mode is unaffected either way.

---

## 1. Create the database (Neon — free)

1. Go to **https://neon.tech** → sign up (GitHub login is fine).
2. **Create a project** (any name, pick a region near you).
3. Copy the **connection string** — it looks like:
   `postgresql://USER:PASSWORD@ep-xxxx.aws.neon.tech/neondb?sslmode=require`

## 2. Create the tables

On your computer, put the Neon string in `.env`:

```env
DATABASE_URL="postgresql://...neon.../neondb?sslmode=require"
```

Then create the schema in the Neon database:

```bash
pnpm install
pnpm db:push
```

You should see "Your database is now in sync with your Prisma schema."

## 3. Push the code to GitHub

The repo is already at `github.com/Pug-03/OBEC_Roo_mue`. Make sure the latest
commit is pushed:

```bash
git push origin main
```

## 4. Deploy on Vercel

1. Go to **https://vercel.com** → sign up / log in with **GitHub**.
2. **Add New → Project** → import `OBEC_Roo_mue`.
3. Framework is auto-detected as **Next.js** — leave build settings default.
4. Open **Environment Variables** and add the values from the table below.
5. Click **Deploy**. First build takes a few minutes.

### Environment variables to set on Vercel

| Name | Value | Required |
| --- | --- | --- |
| `DATABASE_URL` | your Neon connection string | ✅ |
| `NEXTAUTH_SECRET` | a random secret — generate with `openssl rand -base64 32` | ✅ |
| `NEXTAUTH_URL` | your site URL, e.g. `https://roomue.vercel.app` | ✅ |
| `TEST_LOGIN_CODE` | e.g. `12345678` (demo login code) | optional |
| `ENABLE_TEST_LOGIN` | `true` to allow the demo login, else `false` | optional |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Google sign-in | optional |
| `SMS_API_KEY` / `SMS_SENDER` | for real OTP SMS on registration | optional |

## 5. After the first deploy

- Set `NEXTAUTH_URL` to the real URL Vercel gave you, then **redeploy** if you
  guessed it earlier.
- For Google sign-in, add `https://YOUR-URL/api/auth/callback/google` to the
  authorized redirect URIs in Google Cloud Console.

## Notes

- Every push to `main` triggers an automatic redeploy.
- Local dev now also uses Postgres (Neon). The old SQLite `dev.db` is no longer
  used.