# Family Hub 2.1

This update addresses four reported issues:

- Refined message interface spacing, bubbles, composer and conversation list.
- Added six Home dashboard widget choices: calendar, group chat preview, tasks, active polls, memory shortcut and Family AI shortcut.
- The Home group-chat preview fetches the newest message from the family group conversation and subscribes to realtime message changes.
- Family AI conversation history is saved per signed-in user in browser local storage, so refreshes no longer clear the conversation on that device. This is local-device history, not cross-device synced history.
- Added Poll management in More: create, edit, remove, and voting pop-up polls. Polls appear on app open until the signed-in member votes or dismisses them for that session.

## Required database migration

Run `supabase/migrations/20261125_family_polls.sql` in the Supabase SQL Editor after the previous Family Hub migrations.

## Caveats

The group preview realtime listener depends on Supabase Realtime being enabled for the `messages` table and the `ensure_family_group` RPC being present as in the existing project. Poll voting is stored in the poll's JSON votes field; this prototype uses client-side updates and is intended for a small family app, not hardened public-scale voting. Family AI history is browser-local and does not synchronize to other devices.
