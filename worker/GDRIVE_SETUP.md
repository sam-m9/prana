# Google Drive backup — setup (free, ~10 min, one time)

This makes backups **truly hands-off**: after one Google sign-in, PRANA silently
uploads a single rolling backup file to your Drive whenever you open the app and
it's been ~2 weeks. The file is overwritten in place, so you get one
`prana-backup.json` in your Drive, not a pile. PRANA can only see the one file it
creates (the narrow `drive.file` scope) — it cannot read the rest of your Drive.

You create one thing: a **Google OAuth Client ID**. It's public (it lives in the
app), not a password.

## Steps
1. Go to **[console.cloud.google.com](https://console.cloud.google.com)** →
   create a project (any name, e.g. `prana`).
2. **Enable the Drive API:** APIs & Services → **Library** → search "Google Drive
   API" → **Enable**.
3. **OAuth consent screen:** APIs & Services → **OAuth consent screen** →
   User type **External** → fill app name + your email → **Save**. Under
   **Test users**, add **samarthmaira9@gmail.com** — this is the account the
   backup will live in. (Staying in "testing" is fine for personal use — no
   Google review needed.)
4. **Create the credential:** APIs & Services → **Credentials** → **Create
   credentials** → **OAuth client ID** → Application type **Web application**.
   - **Authorized JavaScript origins:** add where PRANA is served from, e.g.
     `https://sam-m9.github.io` (and `http://localhost:8080` if you test locally).
     Origins only — no paths.
   - **Authorized redirect URIs** — add the **exact** URL(s) PRANA runs at,
     including the path, because sign-in briefly leaves the app and Google
     redirects back to one of these:
     - `https://sam-m9.github.io/prana/` — what you get opening it in Safari.
     - `https://sam-m9.github.io/prana/index.html` — what the **Home Screen
       icon** opens (per the app's manifest). Add both so sign-in works from
       either.
   - Click **Create** and copy the **Client ID**
     (`…-xxxx.apps.googleusercontent.com`).
5. In PRANA: **Home → YOUR DATA → Cloud backup · Google Drive** → paste the client
   ID → **Connect Google Drive**. The screen briefly leaves PRANA to Google's sign-in
   → **choose samarthmaira9@gmail.com** and approve → you land right back in PRANA,
   connected. Done.

## Notes
- **Which Google account?** Sign in as **samarthmaira9@gmail.com** in step 5 —
  that's where the backup lives. (Whatever account you approve is the one used.)
- **Why a redirect instead of a popup?** iOS blocks the popup handshake for an
  installed (Home-Screen) app and reports it back as an "origin/redirect
  mismatch" even with everything configured correctly — a full-page redirect
  works in every context, popup or standalone alike, which is why it's used here.
- **Restore:** download `prana-backup.json` from your Drive, then PRANA →
  **RESTORE** and pick it. (A one-tap in-app restore-from-Drive can be added
  later if you want it.)
- **Still can't run while the app is fully closed** — no web app can. "Hands-off"
  means no taps once connected; the upload happens the next time you open PRANA
  after it's due.
- **Revoke any time:** the **Disconnect** button in-app, or
  myaccount.google.com → Security → Third-party access.
