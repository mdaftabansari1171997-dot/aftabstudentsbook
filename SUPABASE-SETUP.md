# Aftab Students Book — Supabase setup

The project URL and publishable key supplied in chat have been added to `backend-config.js`.
A publishable key is designed for browser use. Never share or add a `service_role`/secret key.

## 1. Run database setup
1. Open https://supabase.com/dashboard and select project `tvxyxigtxpzufbrxmybz`.
2. Open SQL Editor → New query.
3. Copy all of `supabase-setup.sql`, paste it and click Run.
4. Confirm tables `profiles` and `study_materials` exist and Storage contains a **private** `study-pdfs` bucket.

## 2. Enable student phone OTP
1. Authentication → Providers → Phone: enable Phone.
2. Configure an SMS provider and its credentials in Supabase Auth. SMS providers may have their own charges.
3. Authentication → URL Configuration: add your deployed website URL to Site URL and Redirect URLs.
4. Student portal (`student.html`) uses Supabase SMS OTP; it no longer displays a fake OTP.

## 3. Create the admin
1. Authentication → Users → Add user. Create an admin account with an email and strong password.
2. Copy that user's UUID.
3. In SQL Editor run:
   `update public.profiles set role = 'admin' where id = 'PASTE-USER-UUID-HERE';`
4. Use the email/password on `admin.html`.

## 4. Publish
Upload all website files (including `backend-config.js`, `supabase-setup.sql`) to your hosting / GitHub Pages repository root.
Set the custom domain in your hosting settings and configure DNS at your registrar. The domain must be registered separately.

## Important limitations and safety
- The browser uses only the publishable key. Database access is restricted by Row Level Security policies in the SQL file.
- Phone OTP will not work until a supported SMS provider is configured in Supabase.
- The admin login is email/password and requires you to create and promote your admin user as described above.
- PDFs are stored in a private bucket; authenticated users can request short-lived signed links.
- This setup does not automatically import or redistribute copyrighted textbooks. Upload only material you own or are licensed to share.
- Take a backup before changing an existing live project. This starter does not modify or migrate any existing customer database.


## BA and university content
The admin form now supports BA Semester 1–6, BA Part 1–3 and other college courses, plus a Bihar university selector. If the original SQL was already run, run this additive migration in SQL Editor:
```
alter table public.study_materials add column if not exists university text;
```
Choose `Urdu` in the Medium field when adding Urdu study materials. Upload only material you are allowed to distribute.
