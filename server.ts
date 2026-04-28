import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "30mb" }));

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
    try {
      const { fileName, mimeType, fileDataBase64 } = req.body || {};

      if (!fileName || !fileDataBase64) {
        return res.status(400).json({ error: "fileName and fileDataBase64 are required" });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "API key not configured" });
      }

      const resolvedMimeType = mimeType || mimeFromFileName(fileName);

      const prompt = `You are an expert form understanding AI.
Analyze the uploaded form and produce a form-fill schema.

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
  "instructions": ["special rules if any"]
}

Rules:
1) Detect field labels semantically.
2) Include only fillable data fields.
3) Keep keys stable and machine-friendly.
4) If no tables, return tableSections as [].
5) If uncertain, keep values conservative and still valid JSON.
6) Do not include markdown or explanations outside JSON.`;

      let result;
      try {
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: fileDataBase64,
              },
            },
          ],
        });
      } catch (err) {
        console.warn("Primary model failed for /api/form/analyze. Falling back...");
        result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: fileDataBase64,
              },
            },
          ],
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
    try {
      const { formSchema, userInput } = req.body || {};

      if (!formSchema || !userInput) {
        return res.status(400).json({ error: "formSchema and userInput are required" });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "API key not configured" });
      }

      const prompt = `You are an expert AI form filler.
Given a form schema and user narrative input, map values intelligently by meaning.

FORM_SCHEMA:
${JSON.stringify(formSchema, null, 2)}

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
3) If a value is missing, set empty string.
4) If no table data present, return filledTables as [].
5) Do not include markdown or explanations outside JSON.`;

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

