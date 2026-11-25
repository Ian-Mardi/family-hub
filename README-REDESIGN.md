# Family Hub — App redesign build

This package keeps the current Supabase-connected app and its authentication, family setup, invite flow, messaging, calendar, and Family AI, while replacing the app shell and introducing a Gallery.

## First, back up

Keep your current working folder and do not delete it until you verify this package.

## Install and setup

1. Extract the ZIP.
2. Copy your existing `.env.local` into this extracted folder. It should contain your current `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only.
3. Open your Supabase project → SQL Editor.
4. Open `supabase/migrations/20261124_family_gallery.sql` in this folder.
5. Copy its contents into Supabase SQL Editor and run it once. This adds the Gallery tables, private storage bucket, and task recurrence metadata.
6. Run `Start Family Hub.command`. First launch installs dependencies; internet is required.
7. Keep your previous project folder as a backup until you verify this build.

The migration adds a private storage bucket and family-scoped Gallery, album, memory, and photo-removal tables. It also adds a recurrence field to tasks. Existing tables and family records are not deleted.

## What is included in this build

- Apple-inspired visual refresh, softened controls, spacing, typography, and responsive layouts.
- Five primary app sections: Home, Messages, Calendar, Family AI, Gallery, and More (six destinations including More; Tasks are under More).
- Home widget toggles for Calendar, Messages, and a Gallery/Memories shortcut, stored locally per device.
- Individual appearance/accent color customization stored locally per device.
- Calendar month/day view and event creation/deletion from the existing database.
- Messages text search and image attachments. Images sent in the family group are recorded in Gallery. Private conversation photos are not added to the family Gallery.
- Gallery uploads, favorites, album creation/selection, memory proposals, one-member acceptance, basic slideshow navigation, and removal requests.
- Tasks moved to More, completion/reopen, and recurrence labels (weekly/monthly/yearly metadata).

## Limitations to be aware of

- This is an assembled development build, not a production-tested release. Dependency installation/build validation was blocked in the build environment.
- The Gallery migration must be applied manually in Supabase before Gallery features can work.
- The Gallery removal flow is a prototype approval flow; approved removals remove the Gallery record but preserve the underlying uploaded object and chat message. The removal-approval interface currently appears in the Memories area.
- Memory slideshow playback is manual Next/Previous, not music or generated video.
- Recurrence values are stored as task metadata; this build does not yet run a background scheduler to create recurring tasks automatically.
- Several planned refinements (full reactions/reply/pinning/unread tracking, announcement system, birthdays, and true push notifications) are not yet implemented in this batch.
- Widget layout and theme settings are currently local to the device rather than synced across devices.
- No service-role key is included in this package.

## Family Hub 2.1 repairs
Run `supabase/migrations/20261125_family_polls.sql` in Supabase SQL Editor to enable the new family poll manager and vote popup. Dashboard group-message preview is now loaded from the ensured group conversation and listens for message changes. Family AI history is saved locally per signed-in user on that device. Dashboard widgets now include Calendar, group chat preview, tasks, polls, memories, and an AI shortcut.
