# DataScribe v0.2 — Real modules 1–6

This iteration keeps the approved UI and working Gemini extraction/Form Fill flow, while replacing more mock plumbing with real persistence and Google Drive storage.

## Real modules now

1. **Google authentication** — Google OAuth 2.0, HTTP-only session cookie, OAuth state protection.
2. **Dashboard data** — counts and recent documents come from PostgreSQL.
3. **Documents** — extraction results are persisted as user-owned document records.
4. **Form-fill persistence** — an analyzed form becomes a user-owned form-fill document session; AI-filled values are saved back to that record.
5. **Export history** — generated PDF/Excel exports are registered in PostgreSQL. The browser still downloads the file normally.
6. **Google Drive storage** — Drive can be connected with a separate consent step. DataScribe creates `DataScribe AI/Documents`, `DataScribe AI/Forms`, and `DataScribe AI/Exports`. Uploaded source forms and generated exports can be stored there.

## Local setup

1. Create a PostgreSQL database. Supabase's free PostgreSQL tier is suitable for development.
2. Run `db-schema.sql` in the database SQL editor.
3. Add values to `.env.local`:

```env
GEMINI_API_KEY="..."
DATABASE_URL="postgresql://..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"
SESSION_SECRET="a-long-random-secret"
APP_URL="http://localhost:3000"
```

4. In Google Cloud Console:
   - create a Web application OAuth client;
   - add `http://localhost:3000/auth/google/callback` as an authorized redirect URI;
   - enable the Google Drive API for the same project.
5. Run:

```bash
npm install
npm run dev
```

## Authentication test

1. Open `/login`.
2. Click **Continue with Google**.
3. Confirm the user is created in `users`.
4. Refresh the dashboard; the session should persist.
5. Sign out; protected pages should require login again.

## Form-fill test

1. Sign in.
2. Open Form Fill.
3. Upload/analyze a sample DOCX.
4. Confirm a `form-fill` document appears in PostgreSQL.
5. Apply AI field mappings.
6. Confirm the same document's `result_json` and status update.

## Export test

1. Generate a PDF or Excel export.
2. The browser should download it.
3. A row should appear in `exports`.
4. If Drive is connected, the export is also uploaded to `DataScribe AI/Exports`.
5. Open Exports and confirm it appears there.

## Drive test

1. Open the Drive connection page.
2. If Drive is not connected, DataScribe sends you through a separate Google consent flow for `drive.file`.
3. After consent, DataScribe creates the three folders.
4. Upload a form; the source file is stored under `Forms`.
5. Generate an export; the export is stored under `Exports`.

## Security notes

- Gemini and Google OAuth secrets stay on the server.
- Google refresh tokens are encrypted at rest using a key derived from `SESSION_SECRET`.
- AI/form/document APIs require an authenticated session.
- Document queries are scoped to the authenticated user's ID.
- Drive uploads are attempted only through the authenticated user's OAuth token.
- If Drive is not connected, a local browser export can still succeed and the export history record is retained without a Drive file ID.

## Important

The Google Drive OAuth scope is deliberately requested separately from basic Google sign-in. This keeps login lightweight and lets the user explicitly connect Drive when they want DataScribe storage.
