# Family Hub — updated project

## Quick start on your Mac
1. Put your original `.env.local` file (containing your existing Supabase URL and anon/publishable key) into this project folder. Do not use a service-role key.
2. Double-click **Start Family Hub.command**. If macOS blocks it, right-click the file and choose Open.
3. On first launch, it installs project dependencies. This requires internet and may take a few minutes.
4. The terminal window will display the local URL, usually http://localhost:5173. Open it in your browser.
5. Leave the terminal window open while using Family Hub. Close it to stop the app.

## What this frontend relies on
This project still uses your existing Supabase backend, schema, RLS policies, invitation RPC, and deployed `family-ai` Edge Function. This package does not change or deploy those backend services.

## Important
- The `.env.local` file is intentionally not included.
- Keep your original project folder as a backup until you've verified this version.
- The build could not be independently verified in this environment because dependency installation timed out; the code package is assembled, but that is not a claim of fully tested operation.
