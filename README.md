

# DataScribe AI

DataScribe AI is a voice-first and text-first AI automation platform with two major workflows:
- Structured Data Extraction (narrative input -> table + summary + exports)
- Form Fill Module (upload form -> AI-assisted semantic autofill -> downloadable filled form)

## Core modules

### 1) Structured Data Extraction Module
User provides voice or text input. AI converts unstructured narrative content into:
- Document type and title
- Metadata key-value pairs
- Structured table columns and rows
- Optional total row
- Summary

Then user can export output as PDF or Excel.

### 2) Form Fill Module
User uploads a form (PDF, Word, Excel, image-based forms). The system:
1. Reads and understands form structure.
2. Detects fields, questions, labels, and table regions.
3. Marks the form as ready-to-fill.
4. Accepts natural speech/text input from user.
5. Uses AI semantic mapping to fill correct fields even if wording differs.
6. Fills table rows/columns when form contains tabular sections.
7. Generates a filled version preserving original layout.
8. Allows download as PDF or Excel.

This enables complete hands-free form completion from a single voice/text narration.

## Key features

- Dual input modes: Voice and Text
- Real-time transcription via browser speech recognition
- AI extraction into structured tables
- AI summary generation
- Intelligent form understanding and ready-to-fill state
- Semantic field mapping (meaning-based, not exact keyword-only)
- Table-aware form filling for row/column sections
- PDF export
- Excel export (professional report layout)
- Safe frontend normalization for variable AI output formats
- Backend model fallback for reliability

## Tech stack

### Frontend
- React 19
- TypeScript
- Vite 6
- Tailwind CSS v4
- Motion (`motion/react`) for animations
- Lucide React icons

### Backend
- Node.js
- Express 4
- TypeScript runtime via `tsx`
- Dotenv

### AI layer
- `@google/genai`
- Gemini models:
  - Primary: `gemini-3-flash-preview`
  - Fallback: `gemini-2.5-flash`

### Export layer (browser-loaded CDN libraries)
- jsPDF
- jsPDF-AutoTable
- SheetJS (`xlsx`)

### Browser platform capabilities
- Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- File handling for uploaded form assets (Form Fill workflow)

## Architecture overview

### Extraction flow
1. Voice/Text input from UI
2. `POST /api/extract`
3. Gemini prompt with strict JSON format rules
4. Response sanitization + JSON parsing in backend
5. Result normalization in frontend
6. Table/summary rendering
7. PDF/Excel export

### Form Fill flow
1. User uploads form template
2. Form parser/reader identifies fillable structure
3. Form state changes to ready-to-fill
4. User narrates values in natural language
5. AI maps values to matching fields/tables semantically
6. System generates filled output with original form structure
7. User downloads completed document

## Project structure

```text
datascribe-ai/
|- src/
|  |- App.tsx          # Main UI, extraction flow, normalization, exports
|  |- main.tsx         # React root mount
|  `- index.css        # Tailwind import
|- server.ts           # Express API + Gemini integration + Vite middleware
|- vite.config.ts      # Vite config + React/Tailwind plugins
|- tsconfig.json       # TypeScript config
|- .env.example        # Environment template
|- .env.local          # Local secrets (not committed)
`- package.json        # Scripts and dependencies
```

## Environment variables

Create `.env.local` in project root:

```env
GEMINI_API_KEY="YOUR_API_KEY"
APP_URL="OPTIONAL_APP_URL"
```

Notes:
- `GEMINI_API_KEY` is required for AI extraction/fill operations.
- `APP_URL` is optional for local development.

## Installation and local run

Prerequisite:
- Node.js LTS recommended

Steps:
1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Gemini API key in `.env.local`.
3. Start local server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Available scripts

- `npm run dev`  
  Starts Express server (`server.ts`) with Vite middleware.

- `npm run build`  
  Builds frontend assets into `dist/`.

- `npm run preview`  
  Preview built frontend.

- `npm run lint`  
  Type check using `tsc --noEmit`.

- `npm run clean`  
  Removes `dist/`.

## API documentation

### POST `/api/extract`

Request body:

```json
{
  "text": "Narrative content to extract"
}
```

Success response shape:

```json
{
  "documentType": "string",
  "documentIcon": "emoji",
  "title": "string",
  "metadata": {
    "key": "value"
  },
  "columns": ["Column A", "Column B"],
  "rows": [["value 1A", "value 1B"]],
  "totalRow": ["Total", "value"],
  "summary": "string",
  "color": "amber"
}
```

Error responses:
- `400` when `text` is missing
- `500` when API key is missing, AI fails, or JSON is invalid

## Export behavior

### PDF export
- Generates branded report-style PDF
- Includes metadata block and structured table
- Supports total row highlighting

### Excel export
- Generates professional worksheet layout
- Includes title, exported timestamp, metadata section
- Includes table with filter and adjusted column widths

## Browser and permissions

- Modern Chromium browsers recommended
- Microphone permission required for voice mode
- If speech recognition is unsupported, Text Input mode is available

## Troubleshooting

- `API key not configured`  
  Verify `.env.local` has valid `GEMINI_API_KEY`, then restart `npm run dev`.

- `Invalid JSON from AI`  
  Retry with clearer input; backend already removes markdown fences and validates JSON.

- `PDF generation failed`  
  Check internet access and browser console for CDN script loading issues.

- Form mapping quality lower than expected  
  Provide more explicit field/value narration (for example, "Name is ..., Age is ..., Department is ...").

## Security notes

- Never commit `.env.local`
- Keep API keys private
- Validate uploaded files and sanitize parsed content in form workflows

## Metadata

- App Name: `DataScribe AI`
- Description: `Voice to Structured Data Intelligence + AI-powered Form Fill automation`
- Required browser permission: `microphone`

<img width="100%" src="https://raw.githubusercontent.com/phurushoth/Datascribe-AI/main/project%20screenshot.png">
