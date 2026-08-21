import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { Pool } from "pg";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const cleanJsonText = (rawText: string): string => {
  const noCodeFence = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstObj = noCodeFence.indexOf("{");
  const lastObj = noCodeFence.lastIndexOf("}");
  if (firstObj !== -1 && lastObj > firstObj) {
    return noCodeFence.slice(firstObj, lastObj + 1);
  }

  return noCodeFence;
};

const parseModelJson = (rawText: string): any => {
  return JSON.parse(cleanJsonText(rawText));
};

const mimeFromFileName = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeByExt: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  return mimeByExt[ext] || "application/octet-stream";
};

const tokenKeyFromSecret = (secret: string): Buffer =>
  crypto.createHash("sha256").update(secret).digest();

const encryptSecret = (value: string, secret: string): string => {
  const key = tokenKeyFromSecret(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
};

const decryptSecret = (value: string, secret: string): string => {
  const raw = Buffer.from(value, "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", tokenKeyFromSecret(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "30mb" }));
  app.use(cookieParser());

  const databaseUrl = process.env.DATABASE_URL;
  const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined }) : null;
  const googleClient = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`)
    : null;
  const sessionSecret = process.env.SESSION_SECRET || "development-only-change-this-secret";

  const requireUser = async (req: express.Request, res: express.Response) => {
    const token = req.cookies?.datascribe_session;
    if (!token) { res.status(401).json({ error: "Authentication required" }); return null; }
    try {
      const payload = jwt.verify(token, sessionSecret) as { userId: string };
      if (!pool) { res.status(503).json({ error: "Database is not configured" }); return null; }
      const result = await pool.query("select id, google_id, email, name, avatar_url from users where id = $1", [payload.userId]);
      if (!result.rows[0]) { res.clearCookie("datascribe_session"); res.status(401).json({ error: "Session is no longer valid" }); return null; }
      return result.rows[0];
    } catch { res.clearCookie("datascribe_session"); res.status(401).json({ error: "Session expired" }); return null; }
  };

  const getGoogleAccessToken = async (user: any): Promise<string | null> => {
    if (!googleClient || !user?.id) return null;
    const tokenRow = await pool!.query('select google_refresh_token_enc as "refreshToken" from users where id = $1', [user.id]);
    const encrypted = tokenRow.rows[0]?.refreshToken;
    if (!encrypted) return null;
    try {
      const refreshToken = decryptSecret(encrypted, sessionSecret);
      googleClient.setCredentials({ refresh_token: refreshToken });
      const { token } = await googleClient.getAccessToken();
      return token || null;
    } catch (error) {
      console.error("Unable to refresh Google access token:", error);
      return null;
    }
  };

  const driveRequest = async (user: any, url: string, init: RequestInit = {}) => {
    const accessToken = await getGoogleAccessToken(user);
    if (!accessToken) throw new Error("Google Drive is not connected. Please reconnect Google Drive.");
    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  };

  const ensureDriveFolder = async (user: any, name: string, parentId?: string): Promise<string> => {
    const q = [`name = '${name.replace(/'/g, "\\'")}'`, "mimeType = 'application/vnd.google-apps.folder'", "trashed = false", parentId ? `'${parentId}' in parents` : "'root' in parents"].join(" and ");
    const list = await driveRequest(user, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`);
    if (!list.ok) throw new Error(`Drive folder lookup failed (${list.status})`);
    const existing = (await list.json()).files?.[0];
    if (existing?.id) return existing.id;
    const create = await driveRequest(user, "https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }),
    });
    if (!create.ok) throw new Error(`Drive folder creation failed (${create.status})`);
    return (await create.json()).id;
  };

  const ensureDataScribeFolders = async (user: any) => {
    const root = await ensureDriveFolder(user, "DataScribe AI");
    const documents = await ensureDriveFolder(user, "Documents", root);
    const forms = await ensureDriveFolder(user, "Forms", root);
    const exports = await ensureDriveFolder(user, "Exports", root);
    return { root, documents, forms, exports };
  };

  const uploadToDrive = async (user: any, fileName: string, mimeType: string, data: Buffer, folderId: string) => {
    const boundary = `datascribe-${crypto.randomUUID()}`;
    const metadata = JSON.stringify({ name: fileName, mimeType, parents: [folderId] });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      data,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const response = await driveRequest(user, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: body as any,
    });
    if (!response.ok) throw new Error(`Drive upload failed (${response.status})`);
    return await response.json();
  };

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    console.log(`GEMINI_API_KEY loaded (${apiKey.substring(0, 4)}...${apiKey.slice(-4)})`);
  } else {
    console.warn("WARNING: GEMINI_API_KEY is missing.");
  }

  // ✅ Initialize AI
  const ai = new GoogleGenAI({
    apiKey,
  });

  // ✅ API Route
  app.post("/api/extract", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "API key not configured" });
      }

      const prompt = `You are an expert data extraction and document structuring AI. 
Analyze the given text and extract structured tabular data.

CRITICAL RULES:
1. Identify ONE document type.
2. Create professional column names.
3. Extract ALL data into rows.
4. Include metadata separately.
5. Add totalRow if possible.
6. Choose a suitable color.
7. columns must be an array of plain strings only.
8. rows must be an array of arrays; each row length must match columns length.
9. Do NOT return objects inside columns or rows.
10. totalRow must be an array matching columns length, or null if not applicable.

Respond ONLY in JSON:
{
  "documentType": "string",
  "documentIcon": "emoji",
  "title": "Title",
  "metadata": {},
  "columns": ["Column A", "Column B"],
  "rows": [["value 1A", "value 1B"], ["value 2A", "value 2B"]],
  "totalRow": ["Total", "value"],
  "summary": "",
  "color": ""
}

Text:
${text}`;

      // ✅ MAIN CALL (with fallback)
      let result;
      try {
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
      } catch (err) {
        console.warn("Primary model failed. Falling back...");
        result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
      }

      let rawText = result.text?.trim() || "";

      // ✅ Clean markdown (important)
      rawText = cleanJsonText(rawText);

      // ✅ Safe JSON parsing
      let parsedData;
      try {
        parsedData = parseModelJson(rawText);
      } catch (parseError) {
        console.error("JSON parse failed:", rawText);
        return res.status(500).json({
          error: "Invalid JSON from AI",
          raw: rawText,
        });
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(500).json({
        error: error.message || "Something went wrong",
      });
    }
  });

  // ✅ Form analysis route (template understanding)
  app.post("/api/form/analyze", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const { fileName, mimeType, fileDataBase64, fileTextContent } = req.body || {};

      if (!fileName || (!fileDataBase64 && !fileTextContent)) {
        return res.status(400).json({ error: "fileName and either fileDataBase64 or fileTextContent are required" });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "API key not configured" });
      }

      const resolvedMimeType = mimeType || mimeFromFileName(fileName);

      const prompt = `You are an expert form understanding AI.
Analyze the uploaded form and produce a form-fill schema that preserves the original field and table order as closely as possible.

Return ONLY valid JSON in this exact shape:
{
  "formTitle": "string",
  "formType": "string",
  "summary": "string",
  "fields": [
    {
      "key": "snake_case_unique_key",
      "label": "Visible field label",
      "type": "text|number|date|email|phone|textarea|select|checkbox|radio|unknown",
      "required": false,
      "description": "what this field expects"
    }
  ],
  "tableSections": [
    {
      "key": "snake_case_table_key",
      "title": "Visible table title",
      "columns": ["Column 1", "Column 2"],
      "description": "what this table captures"
    }
  ],
  "layoutBlocks": [
    {
      "kind": "field",
      "fieldKey": "field_key_from_fields"
    },
    {
      "kind": "table",
      "tableKey": "table_key_from_tableSections"
    }
  ],
  "instructions": ["special rules if any"]
}

Rules:
1) Detect field labels semantically.
2) Include only fillable data fields.
3) Keep keys stable and machine-friendly.
4) Preserve the original top-to-bottom order in fields, tableSections, and layoutBlocks.
5) layoutBlocks must reference only keys returned in fields/tableSections.
6) If no tables, return tableSections as [].
7) If uncertain, keep values conservative and still valid JSON.
8) Do not include markdown or explanations outside JSON.`;

      const usesExtractedText = typeof fileTextContent === "string" && fileTextContent.trim().length > 0;
      const analysisPrompt = usesExtractedText
        ? `${prompt}

The original file could not be sent as a supported binary attachment, so the form content is provided below as extracted text. Infer the fillable structure from this text while preserving order as closely as possible.

FILE_NAME:
${String(fileName)}

EXTRACTED_FORM_TEXT:
${String(fileTextContent)}`
        : prompt;

      const buildAnalyzeContents = () => (
        usesExtractedText
          ? analysisPrompt
          : [
              { text: analysisPrompt },
              {
                inlineData: {
                  mimeType: resolvedMimeType,
                  data: fileDataBase64,
                },
              },
            ]
      );

      let result;
      try {
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: buildAnalyzeContents(),
        });
      } catch (err) {
        console.warn("Primary model failed for /api/form/analyze. Falling back...");
        result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: buildAnalyzeContents(),
        });
      }

      const rawText = result.text?.trim() || "";
      let parsedData;
      try {
        parsedData = parseModelJson(rawText);
      } catch (parseError) {
        console.error("Form schema parse failed:", rawText);
        return res.status(500).json({
          error: "Invalid JSON from AI while analyzing form",
          raw: cleanJsonText(rawText),
        });
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Form analyze error:", error);
      res.status(500).json({
        error: error.message || "Form analyze failed",
      });
    }
  });

  // ✅ Form fill route (semantic value mapping)
  app.post("/api/form/fill", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const { formSchema, userInput, focusFieldKey, focusFieldLabel, existingFilledFields } = req.body || {};

      if (!formSchema || !userInput) {
        return res.status(400).json({ error: "formSchema and userInput are required" });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "API key not configured" });
      }

      const prompt = `You are an expert AI form filler.
Given a form schema and user narrative input, map values intelligently by meaning while preserving the form's original field and table structure.

FORM_SCHEMA:
${JSON.stringify(formSchema, null, 2)}

EXISTING_FILLED_FIELDS:
${JSON.stringify(existingFilledFields || {}, null, 2)}

CURRENT_FOCUS_FIELD_KEY:
${focusFieldKey ? JSON.stringify(String(focusFieldKey)) : "null"}

CURRENT_FOCUS_FIELD_LABEL:
${focusFieldLabel ? JSON.stringify(String(focusFieldLabel)) : "null"}

USER_INPUT:
${String(userInput)}

Return ONLY valid JSON in this exact shape:
{
  "filledFields": {
    "field_key": "mapped value"
  },
  "filledTables": [
    {
      "key": "table_key_from_schema",
      "title": "table title",
      "columns": ["Column 1", "Column 2"],
      "rows": [["value1", "value2"]]
    }
  ],
  "unmappedInfo": ["facts that did not map cleanly"],
  "summary": "short fill summary"
}

Rules:
1) Use keys from schema fields and schema tableSections only.
2) Preserve schema column order for each table.
3) If CURRENT_FOCUS_FIELD_KEY is present and the user gives a short answer, prioritize mapping that answer to that field.
4) Never overwrite an already-filled value with a conflicting guess unless the new input clearly corrects it.
5) If a value is missing, set empty string.
6) If no table data present, return filledTables as [].
7) Do not include markdown or explanations outside JSON.`;

      let result;
      try {
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
      } catch (err) {
        console.warn("Primary model failed for /api/form/fill. Falling back...");
        result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
      }

      const rawText = result.text?.trim() || "";
      let parsedData;
      try {
        parsedData = parseModelJson(rawText);
      } catch (parseError) {
        console.error("Form fill parse failed:", rawText);
        return res.status(500).json({
          error: "Invalid JSON from AI while filling form",
          raw: cleanJsonText(rawText),
        });
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Form fill error:", error);
      res.status(500).json({
        error: error.message || "Form fill failed",
      });
    }
  });


  // ===== Authentication: Google OAuth =====
  app.get("/auth/google", (_req, res) => {
    if (!googleClient) return res.status(503).send("Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie("datascribe_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 10 * 60 * 1000 });
    const url = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
      state,
    });
    res.redirect(url);
  });

  app.get("/auth/google/drive", async (req, res) => {
    if (!googleClient) return res.status(503).send("Google OAuth is not configured.");
    const sessionToken = req.cookies?.datascribe_session;
    if (!sessionToken) return res.redirect("/login");
    try {
      jwt.verify(sessionToken, sessionSecret);
      const state = crypto.randomBytes(24).toString("hex");
      res.cookie("datascribe_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 10 * 60 * 1000 });
      res.cookie("datascribe_drive_oauth", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 10 * 60 * 1000 });
      const url = googleClient.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file"],
        prompt: "consent",
        state,
      });
      res.redirect(url);
    } catch { res.redirect("/login"); }
  });

  app.get("/auth/google/callback", async (req, res) => {
    if (!googleClient || !pool) return res.status(503).send("Google OAuth/database is not configured.");
    try {
      const code = String(req.query.code || "");
      const returnedState = String(req.query.state || "");
      if (!code) return res.status(400).send("Missing OAuth authorization code.");
      if (!returnedState || returnedState !== req.cookies?.datascribe_oauth_state) return res.status(400).send("Invalid OAuth state. Please restart sign-in.");
      const driveReauth = req.cookies?.datascribe_drive_oauth === "1";
      res.clearCookie("datascribe_oauth_state");
      res.clearCookie("datascribe_drive_oauth");
      const { tokens } = await googleClient.getToken(code);
      const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token!, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) return res.status(400).send("Google account information is incomplete.");
      const refreshToken = tokens.refresh_token || null;
      const encryptedRefreshToken = refreshToken ? encryptSecret(refreshToken, sessionSecret) : null;
      const result = await pool.query(`
        insert into users (google_id, email, name, avatar_url, google_refresh_token_enc)
        values ($1, $2, $3, $4, $5)
        on conflict (google_id) do update set
          email = excluded.email,
          name = excluded.name,
          avatar_url = excluded.avatar_url,
          google_refresh_token_enc = coalesce(excluded.google_refresh_token_enc, users.google_refresh_token_enc),
          updated_at = now()
        returning id, google_id, email, name, avatar_url
      `, [payload.sub, payload.email, payload.name || payload.email.split("@")[0], payload.picture || null, encryptedRefreshToken]);
      const session = jwt.sign({ userId: result.rows[0].id }, sessionSecret, { expiresIn: "7d" });
      res.cookie("datascribe_session", session, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.redirect(`${process.env.APP_URL || `http://localhost:${PORT}`}/${driveReauth ? "setup-complete" : "dashboard"}`);
    } catch (error: any) {
      console.error("Google OAuth callback failed:", error);
      res.status(500).send("Google sign-in failed. Please try again.");
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ user: { id: user.id, googleId: user.google_id, email: user.email, name: user.name, avatarUrl: user.avatar_url } });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("datascribe_session");
    res.json({ ok: true });
  });

  // ===== Form-fill persistence, export history and Google Drive =====
  app.post("/api/form-sessions", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const { title, documentType = "Form", schema, status = "processing", sourceFileName, sourceMimeType, sourceFileBase64 } = req.body || {};
    if (!title || !schema) return res.status(400).json({ error: "title and schema are required" });
    try {
      let driveFileId: string | null = null;
      if (sourceFileName && sourceFileBase64) {
        try {
          const folders = await ensureDataScribeFolders(user);
          const uploaded = await uploadToDrive(user, sourceFileName, sourceMimeType || mimeFromFileName(sourceFileName), Buffer.from(sourceFileBase64, "base64"), folders.forms);
          driveFileId = uploaded.id || null;
        } catch (driveError) {
          console.warn("Original form could not be saved to Drive:", driveError);
        }
      }
      const result = await pool!.query(`insert into documents (user_id, title, document_type, workflow, status, drive_file_id, result_json, form_schema_json) values ($1,$2,$3,'form-fill',$4,$5,$6,$7) returning id`, [user.id, title, documentType, status, driveFileId, JSON.stringify({}), JSON.stringify(schema)]);
      res.status(201).json({ documentId: result.rows[0].id, driveFileId });
    } catch (error) { console.error(error); res.status(500).json({ error: "Unable to create form session." }); }
  });

  app.patch("/api/form-sessions/:id", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const { result, status } = req.body || {};
    try {
      const updated = await pool!.query(`update documents set result_json = coalesce($1, result_json), status = coalesce($2, status), updated_at = now() where id = $3 and user_id = $4 returning id`, [result ? JSON.stringify(result) : null, status || null, req.params.id, user.id]);
      if (!updated.rows[0]) return res.status(404).json({ error: "Form session not found" });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "Unable to update form session." }); }
  });

  app.get("/api/exports", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const result = await pool!.query(`select e.id, e.document_id as "documentId", e.file_name as "fileName", e.format, e.drive_file_id as "driveFileId", e.created_at as "createdAt", d.title as "documentTitle" from exports e left join documents d on d.id = e.document_id where e.user_id = $1 order by e.created_at desc limit 100`, [user.id]);
      res.json({ exports: result.rows });
    } catch { res.status(500).json({ error: "Unable to load export history." }); }
  });

  app.post("/api/exports", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const { documentId = null, fileName, format, mimeType, fileDataBase64, saveToDrive = true } = req.body || {};
    if (!fileName || !format || !fileDataBase64) return res.status(400).json({ error: "fileName, format and fileDataBase64 are required" });
    try {
      let driveFileId: string | null = null;
      let driveFile: any = null;
      let driveError: string | null = null;
      if (saveToDrive) {
        try {
          const folders = await ensureDataScribeFolders(user);
          driveFile = await uploadToDrive(user, fileName, mimeType || mimeFromFileName(fileName), Buffer.from(fileDataBase64, "base64"), folders.exports);
          driveFileId = driveFile.id || null;
        } catch (error: any) {
          driveError = error?.message || "Google Drive upload failed";
        }
      }
      const result = await pool!.query(`insert into exports (user_id, document_id, file_name, format, drive_file_id) values ($1,$2,$3,$4,$5) returning id, created_at as "createdAt"`, [user.id, documentId, fileName, format, driveFileId]);
      res.status(201).json({ export: { ...result.rows[0], driveFileId }, driveError });
    } catch (error: any) {
      console.error("Export save failed:", error);
      res.status(500).json({ error: error.message || "Unable to save export." });
    }
  });

  app.get("/api/drive/status", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const result = await pool!.query("select google_refresh_token_enc is not null as connected from users where id = $1", [user.id]);
      res.json({ connected: Boolean(result.rows[0]?.connected) });
    } catch { res.status(500).json({ error: "Unable to check Drive status." }); }
  });

  app.post("/api/drive/setup", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const folders = await ensureDataScribeFolders(user);
      res.json({ connected: true, folders });
    } catch (error: any) { res.status(500).json({ error: error.message || "Unable to connect Google Drive." }); }
  });

  // ===== Real dashboard/document data =====
  app.get("/api/dashboard", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const [documents, forms, exports, issues, recent] = await Promise.all([
        pool!.query("select count(*)::int as count from documents where user_id = $1", [user.id]),
        pool!.query("select count(*)::int as count from documents where user_id = $1 and workflow = 'form-fill' and status = 'completed'", [user.id]),
        pool!.query("select count(*)::int as count from exports where user_id = $1", [user.id]),
        pool!.query("select count(*)::int as count from documents where user_id = $1 and status = 'attention'", [user.id]),
        pool!.query("select id, user_id as \"userId\", title, document_type as \"documentType\", workflow, status, drive_file_id as \"driveFileId\", created_at as \"createdAt\", updated_at as \"updatedAt\" from documents where user_id = $1 order by created_at desc limit 8", [user.id]),
      ]);
      res.json({ documents: documents.rows[0].count, forms: forms.rows[0].count, exports: exports.rows[0].count, issues: issues.rows[0].count, recentDocuments: recent.rows });
    } catch (error: any) {
      console.error("Dashboard query failed:", error);
      res.status(500).json({ error: "Unable to load dashboard data. Make sure the database schema is installed." });
    }
  });

  app.get("/api/documents", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const q = String(req.query.q || "").trim();
      const result = q
        ? await pool!.query("select id, user_id as \"userId\", title, document_type as \"documentType\", workflow, status, drive_file_id as \"driveFileId\", created_at as \"createdAt\", updated_at as \"updatedAt\" from documents where user_id = $1 and (title ilike $2 or document_type ilike $2) order by created_at desc limit 100", [user.id, `%${q}%`])
        : await pool!.query("select id, user_id as \"userId\", title, document_type as \"documentType\", workflow, status, drive_file_id as \"driveFileId\", created_at as \"createdAt\", updated_at as \"updatedAt\" from documents where user_id = $1 order by created_at desc limit 100", [user.id]);
      res.json({ documents: result.rows });
    } catch { res.status(500).json({ error: "Unable to load documents." }); }
  });

  app.get("/api/documents/:id", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const result = await pool!.query("select id, user_id as \"userId\", title, document_type as \"documentType\", workflow, status, drive_file_id as \"driveFileId\", result_json as \"result\", created_at as \"createdAt\", updated_at as \"updatedAt\" from documents where id = $1 and user_id = $2", [req.params.id, user.id]);
      if (!result.rows[0]) return res.status(404).json({ error: "Document not found" });
      res.json({ document: result.rows[0] });
    } catch { res.status(500).json({ error: "Unable to load document." }); }
  });

  app.post("/api/documents", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const { title, documentType, workflow, status = "completed", driveFileId = null, result = null } = req.body || {};
    if (!title || !documentType || !["extraction", "form-fill"].includes(workflow)) return res.status(400).json({ error: "title, documentType and valid workflow are required" });
    try {
      const resultRow = await pool!.query("insert into documents (user_id, title, document_type, workflow, status, drive_file_id, result_json) values ($1,$2,$3,$4,$5,$6,$7) returning id, user_id as \"userId\", title, document_type as \"documentType\", workflow, status, drive_file_id as \"driveFileId\", created_at as \"createdAt\", updated_at as \"updatedAt\"", [user.id, title, documentType, workflow, status, driveFileId, result ? JSON.stringify(result) : null]);
      res.status(201).json({ document: resultRow.rows[0] });
    } catch { res.status(500).json({ error: "Unable to save document." }); }
  });

  // Keep unknown API paths as JSON responses (avoid HTML fallback)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // ✅ Vite setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

