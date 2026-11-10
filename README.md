# Aftab Students Book — Starter Website

## Included
- Responsive Hindi-first homepage
- Class 1–12 cards
- Board filter: Bihar Board, CBSE, ICSE, Other State Boards
- Medium filter
- Study material sections and one demo MCQ
- Mobile navigation

## Important
This is a front-end starter website. It does not yet include:
- Real textbook/notes PDF files
- Admin login or content upload
- Student accounts, database, payment or analytics
- Verified board-specific syllabus/content

Add only materials you own or are permitted to publish. Textbooks may be copyrighted. Verify syllabus and exam notices from the relevant board.

## Run locally
Open `index.html` in a browser.

## Publish on GitHub Pages
1. Create a GitHub repository named `aftabstudentsbook`.
2. Upload `index.html`, `style.css`, and `script.js` to the repository root.
3. Open Settings → Pages.
4. Under Build and deployment, choose Deploy from a branch → `main` → `/ (root)`.
5. Save and wait for the Pages URL.

## Connect aftabstudentsbook.in
1. Register the domain with a domain registrar.
2. In GitHub Pages → Custom domain, enter `aftabstudentsbook.in` and save.
3. At your domain registrar, add the DNS records GitHub Pages currently specifies. Commonly this includes A records for the apex domain and a CNAME for `www`; use the exact values shown by GitHub.
4. Enable Enforce HTTPS after DNS verification.

A domain name is not purchased or registered by this starter package.


## Admin demo
Open `admin.html`. Demo credentials: `admin` / `Aftab@2027`. Change these before showing the demo, but note that credentials are visible in browser JavaScript and are NOT secure. Data is stored in browser localStorage only. This is not a production admin system. Connect a backend and server-side authentication before publishing sensitive or real student data.


## Student portal demo
Open `student.html` to test student registration/login. The page generates a demo OTP in the browser and displays it on screen; it does not send SMS. Student profiles are stored in localStorage on that browser only. For production, integrate a verified SMS OTP provider, server-side authentication, database and secure session handling. Do not use demo OTP for real accounts.


## Supabase integration files
See `SUPABASE-SETUP.md` and run `supabase-setup.sql` in the SQL Editor before using the connected admin/student pages. Phone OTP requires an SMS provider configured in Supabase Auth. Admin email account must be created in Auth and promoted with the SQL command in the guide.
