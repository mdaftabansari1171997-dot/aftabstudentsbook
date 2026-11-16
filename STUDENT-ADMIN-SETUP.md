# Aftab Students Book — Admin + Student setup

## Student self-registration
The existing Student Portal already supports self-registration with:
- Full name
- Mobile number
- Email address
- Password (minimum 6 characters)

If Supabase email confirmation is enabled, students must click the verification link in their email before logging in. This uses Email + Password; no SMS OTP provider is required.

## Admin dashboard
The existing Admin Panel uses a Supabase email/password account whose profile role must be `admin`. It includes a student directory, search, profile editing, and Enable / Disable login controls. Disabling is a soft access lock; it does not delete the student's auth account, test results, or certificates.

## Required safe database migration
Before using the profile filters or the Admin Enable/Disable control on an existing database:
1. Back up the Supabase database.
2. Open Supabase Dashboard → SQL Editor.
3. Run `supabase-student-admin-migration.sql`.
4. Confirm `profiles` has `board`, `class_level`, `medium`, `updated_at` columns and the role check allows `student`, `admin`, `disabled`.

This migration only adds profile columns and expands the role constraint. It does not delete or rewrite existing student records or change login credentials.

## Admin access
Create the admin in Supabase Authentication → Users, then set their existing profile role to `admin` using the user's UUID. Never put a Supabase service-role secret in browser code.

## Publishing
Student registration and Admin features remain dependent on the existing Supabase project and its Row Level Security policies. Verify the SQL migration in a backup/test project before applying it to production.