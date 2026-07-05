# FriendNest Setup

This version has been cleaned and logic-checked again.

## What changed in this version

- Online status no longer depends on the old presence-only logic.
- Online status now uses a `user_status` table with heartbeat updates.
- The other person shows **Online** only when they are logged in and their heartbeat is fresh.
- If the browser is closed without logout, the user becomes Offline automatically after about 75 seconds.
- Dashboard shows only useful pending items: unread messages, pending tasks, due-today tasks, and important tasks.
- Dashboard does not show total message count anymore.
- Certificates and media are labelled by the uploader email, so **My Files / Aishwarya's Files** and **My Certificates / Aishwarya's Certificates** are more reliable.
- Birthday card no longer has the image/photo placeholder section. It is now only a grand animated belated wish page and message card.
- Build was tested with `npm run build`.

## 1. Supabase project

Use your existing Supabase project.

## 2. Create the two login users

Go to:

Authentication → Users → Add user

Create two users:

1. Akshay
   - Email: `akshaygowtam.m.l@gmail.com`
   - Password: choose your FriendNest password
   - User metadata:

```json
{
  "full_name": "Akshay"
}
```

2. Aishwarya
   - Email: Aishwarya's real email
   - Password: choose her FriendNest password
   - User metadata:

```json
{
  "full_name": "Aishwarya"
}
```

Do not use Gmail passwords. These are FriendNest/Supabase login passwords.

## 3. Run the database setup

Open `friendnest_supabase_setup.sql`.

Replace:

```txt
AISHWARYA_EMAIL_HERE
```

with Aishwarya's real email.

Then go to:

Supabase → SQL Editor → New Query → paste SQL → Run

If you already ran the older SQL, run this new SQL again. It adds the required `user_status` table and owner-email columns.

## 4. Create `.env`

Copy `.env.example` and rename it to `.env`.

Use this format:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_ANON_KEY=your_anon_or_publishable_key

VITE_MY_EMAIL=akshaygowtam.m.l@gmail.com
VITE_AISHWARYA_EMAIL=aishwarya_real_email_here@gmail.com
VITE_AISHWARYA_NAME=Aishwarya
```

You can find the Supabase Project URL and publishable/anon key in:

Supabase → Project Settings → API

## 5. Run locally

```bash
npm install
npm run dev
```

After editing `.env`, always stop and restart the server:

```bash
Ctrl + C
npm run dev
```

## 6. Online status test

To test properly:

1. Open the website in one browser and login as Akshay.
2. Open an incognito/private window or another browser and login as Aishwarya.
3. Akshay should see Aishwarya as Online only while Aishwarya is logged in.
4. Logout Aishwarya or close her browser. Within about 75 seconds, Akshay should see Offline.

## 7. Belated birthday behavior

- If the login name is `Aishwarya` and the date is July 5, 2026, the belated birthday surprise opens automatically after login.
- After July 5, 2026 at 11:59 PM, it stops auto-opening.
- The top bar `Preview Belated Surprise` button is only for testing.

## Latest bug-fix notes
Run `friendnest_FULL_FIX_QUERY_CHAT_MEMORY_TASK.sql` in Supabase SQL Editor. It fixes Aishwarya message permissions, memory photo/text upload columns, and task completion tracking.

Task cards now show who completed a task and when. Memories now support photo upload plus text notes.
