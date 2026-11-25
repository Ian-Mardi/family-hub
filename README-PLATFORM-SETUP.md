# Family Hub platform stage — setup

This package adds the early-access request page at `/welcome`, a family-approval gate for new family creation, and a developer dashboard that listens only on `127.0.0.1` (your Mac, not the LAN/internet).

## First-time setup

1. **Keep a backup** of your working Family Hub folder before replacing it.
2. Copy your existing `.env.local` file into this package's root folder so the family app continues to connect to your existing Supabase project.
3. In Supabase, open **SQL Editor**, paste and run `supabase/migrations/20261123_family_signup_requests.sql`.
4. Copy `.dev.env.example` to a new file named `.dev.env`. Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase project settings. The service-role key is privileged: it belongs only in this local `.dev.env` file, never in `.env.local`, never in frontend code, never in a ZIP you share, and never in a public hosting environment.
5. Double-click **Start Family Hub.command** to start the family app as before. The public product page is available at `http://localhost:5173/welcome`. Existing app/login remains at `http://localhost:5173/`.
6. Double-click **Start Developer Dashboard.command** to start the developer console. The first run installs dependencies if needed. The console opens at `http://127.0.0.1:5174` (or paste that address in your browser). Keep the terminal open while using the dashboard.
7. In the dashboard, inspect the existing family and rename it **Testing Family**.

## Access requests

Visitors on `/welcome` can submit a request. They do not get a family workspace immediately. The signed-in applicant can see their approval status, and a family setup screen is shown only after an approval request for their sign-in email is approved (or if they already have a family, or enter an existing family invitation).

The local developer console can approve/reject requests and inspect family data. It is intentionally a temporary development-only feature and should not be deployed or exposed publicly. Approval currently allows family creation, not automatically provisioning a workspace.

## Limits and caution

- This build is an early-access prototype, not production SaaS infrastructure.
- The developer dashboard is local-only, but it uses a privileged service-role key. Protect `.dev.env`, keep the console on your own Mac, and stop the console when you're not using it.
- Family isolation still relies on your existing Supabase policies and backend. The admin console can inspect multiple families by design for this development phase.
- This package has not been independently build-tested here: dependency installation timed out in this environment. The server JavaScript syntax was checked, but a complete compile, database migration, and live Supabase verification remain pending.
- Do not publicly deploy the developer console or its service-role key. A future production release should remove the cross-family console and replace this early-access workflow with a proper hosted authorization/provisioning service.
