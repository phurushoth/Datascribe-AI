# DataScribe AI Project Architecture Guide

This file is a study guide for the project. It explains what each file does, how the frontend and backend are connected, how data moves through the app, and what the important functions in the code are doing.

Use this when you need to explain the project clearly to someone else.

## 1. Project Purpose

DataScribe AI has two main workflows:

1. Structured Data Extraction
   The user gives voice input or text input. The app sends that narrative data to the backend, the backend calls Gemini, and the result is shown as:
   - document type
   - metadata
   - columns
   - rows
   - total row
   - summary

2. Form Fill Module
   The user uploads a form, the app analyzes its fields and table sections, then the user gives natural language answers by text or voice. The app maps those answers into the correct form fields and lets the user edit and export the result.

## 2. High-Level Architecture

The app is a full-stack TypeScript project.

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Express + TypeScript runtime with `tsx`
- AI integration: Google Gemini via `@google/genai`
- Export support:
  - PDF export using `jsPDF` and `jspdf-autotable`
  - Excel export using `xlsx`

The frontend and backend live in the same repository.

Main flow:

1. Browser loads React app.
2. React UI collects user input.
3. Frontend sends API request to backend.
4. Express backend creates a Gemini prompt.
5. Gemini returns structured JSON.
6. Backend sanitizes and returns JSON.
7. Frontend normalizes response and renders it.
8. User can export the result as PDF or Excel.

## 3. File-by-File Overview

### `src/main.tsx`

This is the frontend entry point.

Code responsibility:
- imports React `StrictMode`
- imports `createRoot` from `react-dom/client`
- imports the main `App` component
- imports `index.css`
- mounts React into `<div id="root"></div>` from `index.html`

Connection:
- `index.html` provides the `root` element
- `main.tsx` renders `App.tsx` into that root

### `src/index.css`

This file is very small:

```css
@import "tailwindcss";
```

Purpose:
- loads Tailwind CSS v4 into the project
- all styling in `App.tsx` uses Tailwind utility classes directly in JSX

Connection:
- imported by `main.tsx`
- once imported, Tailwind utility classes become available throughout the React app

### `src/App.tsx`

This is the main frontend component and the biggest file in the project.

It contains:
- UI layout
- state management
- browser speech recognition logic
- API calls to the backend
- normalization helpers for AI responses
- PDF and Excel export functions
- full logic for both modules

You can explain `App.tsx` in five parts:

1. Type definitions
2. Helper/normalization functions
3. React state and browser behavior
4. API interaction functions
5. Rendering of the UI

#### A. Interfaces in `App.tsx`

These interfaces describe the data shapes used in the app.

`ExtractionResult`
- used for the first module output
- stores document type, title, metadata, columns, rows, total row, summary, color

`FormField`
- one fillable field in a form
- example: name, date, phone number

`FormTableSection`
- one table section inside a form
- stores a title and ordered columns

`FormLayoutBlock`
- used to preserve the order of the form
- each block is either:
  - a field
  - or a table

`FormSchema`
- returned after form analysis
- contains:
  - form title
  - form type
  - summary
  - fields
  - table sections
  - layout blocks
  - instructions

`FilledTableSection`
- stores mapped table rows after filling

`FormFillResult`
- stores the final mapped output of the form fill flow
- contains:
  - filled field values
  - filled table values
  - unmapped information
  - summary

#### B. Constants in `App.tsx`

`SUPPORTED_FORM_MIME_TYPES`
- defines allowed MIME types for form uploads

`SUPPORTED_FORM_EXTENSIONS`
- defines allowed file extensions

`NON_DIRECT_FORMAT_EXPORT_EXTENSIONS`
- file formats that can be analyzed but are not fully exported back in original native format

`DEFAULT_COLOR`
- default UI color for extraction results

`COLORS`
- visual theme map for different result colors

#### C. Helper Functions in `App.tsx`

These functions make model output safe and consistent.

`isRecord`
- checks if a value is a plain object

`toCellText`
- converts unknown values into safe strings for table cells

`asSimpleString`
- trims and converts simple values into strings

`canonicalizeKey`
- normalizes keys for comparison
- example: `Phone Number`, `phone_number`, and `phone-number` can be compared more safely

`uniqueNonEmpty`
- removes empty and duplicate values

`humanizeKey`
- converts machine-style keys into readable labels
- example: `employee_name` becomes `Employee name`

`buildColumnDefs`
- converts raw AI column data into a stable internal column format

`valuesFromRecord`
- reads object values using flexible key matching

`normalizeExtractionResult`
- converts raw extraction API output into a clean `ExtractionResult`
- handles model variations such as:
  - object rows
  - array rows
  - missing columns
  - inconsistent total row

`normalizeFormSchema`
- converts raw analyzed form schema into a stable `FormSchema`
- also reconstructs layout order using `layoutBlocks`
- if no layoutBlocks are returned, it falls back to fields first and then tables

`normalizeFormFillResult`
- normalizes the mapped field values and table rows after form filling

`mergeFormFillResults`
- very important for incremental form filling
- preserves already-filled values and merges new values into them
- this allows the app to ask one missing question at a time instead of forcing a single long answer

`buildEmptyFormFillResult`
- creates an initial empty form fill object after analysis

`isBlankValue`
- detects if a field is still empty or effectively empty

`loadScript`
- dynamically loads external browser libraries only when needed
- used for:
  - `jsPDF`
  - `jspdf-autotable`
  - `xlsx`

This is good because it avoids loading export libraries before the user actually needs them.

#### D. React State in `App.tsx`

The `App` component uses many `useState` variables. They are split naturally into two modules.

Structured Data Extraction module state:
- `currentMode`
  controls voice or text tab
- `isRecording`
  microphone state
- `fullTranscript`
  final spoken text
- `interimTranscript`
  live speech recognition text
- `textInput`
  typed user input
- `isProcessing`
  whether extraction is in progress
- `procStep`
  used for animated processing steps
- `error`
  extraction error message
- `result`
  final extraction result

Form Fill module state:
- `uploadedForm`
  stores uploaded file object
- `isFormAnalyzing`
  whether form analysis is in progress
- `formSchema`
  analyzed schema of the uploaded form
- `formInput`
  typed or voice-based answer text for filling
- `formMode`
  text or voice mode for module 2
- `isFormRecording`
  microphone state for form fill module
- `formTranscript`
  final voice transcript for module 2
- `formInterimTranscript`
  live voice transcript for module 2
- `isFormFilling`
  whether semantic fill is running
- `formFillResult`
  current filled form values
- `formError`
  module 2 error message
- `currentFormQuestionKey`
  tracks the next missing field the UI should ask for

Refs:

`recognitionRef`
- stores the speech recognition instance for module 1

`formRecognitionRef`
- stores the speech recognition instance for module 2

`transcriptBoxRef`
- used to auto-scroll transcript area

#### E. Browser Speech Recognition Logic

Module 1 speech functions:
- `startRecording`
- `stopRecording`
- `toggleRecording`

Module 2 speech functions:
- `startFormRecording`
- `stopFormRecording`
- `toggleFormRecording`

How it works:

1. Browser provides `SpeechRecognition` or `webkitSpeechRecognition`
2. Recognition runs continuously
3. Interim and final transcripts are captured separately
4. Final transcript is appended to stored text
5. If there is an error or unsupported browser, user gets a readable message

Important detail:
- module 1 and module 2 have separate recording states
- this prevents their voice flows from interfering with each other

#### F. File Handling Logic

`fileToBase64`
- converts uploaded binary files into base64 for API transfer

`fileToText`
- reads text files directly

`fileToArrayBuffer`
- reads binary spreadsheet data

`spreadsheetFileToText`
- important for Excel analysis
- loads the `xlsx` library in the browser
- reads workbook sheets
- converts each sheet to CSV-like text
- sends that text to the backend instead of unsupported raw Excel MIME

This function exists because Gemini does not accept every office file MIME directly.

`getFileExtension`
- extracts extension from file name

`getFileStem`
- returns a safe base filename for downloaded files

`readApiErrorMessage`
- safely reads backend error responses
- handles both JSON and HTML fallback cases

#### G. Main Frontend API Functions

`analyzeUploadedForm`
- validates file size and type
- decides how to read the uploaded form:
  - Excel: convert to text with `spreadsheetFileToText`
  - CSV/TXT: read as text
  - PDF/Image/other supported uploads: convert to base64
- sends request to `/api/form/analyze`
- normalizes response with `normalizeFormSchema`
- creates an empty fill structure with `buildEmptyFormFillResult`
- sets the first field as the current missing question

`fillUploadedForm`
- sends the analyzed schema plus user input to `/api/form/fill`
- also sends:
  - current focus field
  - existing filled values
- normalizes returned values
- merges them with existing values
- calculates the next missing field

`updateFilledField`
- local manual edit for a single mapped field

`updateFilledTableCell`
- local manual edit for a specific table cell

`addFormTableRow`
- adds a new empty row to a filled table section

`processData`
- main API function for module 1
- collects voice or text input
- validates minimum input length
- sends request to `/api/extract`
- normalizes response using `normalizeExtractionResult`
- updates UI state

#### H. Export Functions in `App.tsx`

Structured data exports:

`downloadPDF`
- lazy-loads `jsPDF` and `autotable`
- creates styled PDF report
- includes:
  - header
  - metadata
  - structured table
  - highlighted total row

`downloadExcel`
- lazy-loads `xlsx`
- creates worksheet with:
  - title
  - document type
  - export timestamp
  - metadata
  - table rows
- configures widths and auto-filter

Form fill exports:

`saveFilledFormPDF`
- creates PDF representation of the filled form

`downloadFilledFormPDF`
- wrapper for the PDF fill export

`exportFilledFormWorkbook`
- creates workbook-based export of the filled form
- supports `.xlsx`, `.xls`, `.csv`, `.txt`

`downloadFilledFormExcel`
- wrapper for workbook export

`downloadFilledFormInOriginalFormat`
- decides export strategy based on uploaded file extension
- PDF tries PDF output
- spreadsheet-like files try workbook export
- unsupported native-preservation formats show a useful message

Important limitation:
- this app preserves logical structure very well
- but it is not a true binary template editor for every original file format

#### I. UI Rendering in `App.tsx`

The return block renders the full interface.

Main sections:

1. Header
   - app branding

2. Structured Data Extraction panel
   - voice/text toggle
   - transcript or textarea input
   - process button
   - clear button
   - processing animation
   - extraction result card
   - PDF/Excel download buttons

3. Form Fill Module panel
   - file upload input
   - form analyze button
   - module reset button
   - readiness summary after analysis
   - text/voice answer input for module 2
   - missing field prompt
   - filled form preview
   - editable field inputs
   - editable table cells
   - add-row support
   - export buttons

Why the filled form preview matters:
- it keeps the schema order
- it supports manual correction
- it behaves more like a real fill process than just dumping JSON

### `server.ts`

This is the backend server.

Main responsibilities:
- load environment variables
- start Express
- expose API routes
- call Gemini
- sanitize Gemini output
- run Vite middleware in development

#### A. Environment Loading

The server loads:
- default `.env`
- local `.env.local`

This allows local secrets like `GEMINI_API_KEY` to be used.

#### B. Helper Functions

`cleanJsonText`
- removes markdown code fences
- trims raw model output
- extracts JSON object portion from a response

Why this is necessary:
- LLMs sometimes return JSON wrapped in markdown
- the backend cleans it before parsing

`parseModelJson`
- calls `cleanJsonText`
- then parses the result with `JSON.parse`

`mimeFromFileName`
- derives MIME type from the uploaded filename extension

#### C. `startServer`

This function:

1. creates Express app
2. sets JSON request size limit
3. reads API key
4. initializes `GoogleGenAI`
5. registers routes
6. attaches Vite middleware in development
7. serves built files in production
8. starts listening on port `3000`

#### D. API Route: `POST /api/extract`

Purpose:
- handles module 1 extraction requests

Input:

```json
{
  "text": "user narrative"
}
```

Flow:

1. validate text
2. check API key
3. build a prompt requesting strict JSON
4. call primary Gemini model
5. if primary fails, call fallback model
6. clean response
7. parse JSON
8. return parsed data

Important design decision:
- prompt strongly forces:
  - columns as strings
  - rows as arrays
  - total row shape

This makes the frontend easier to render.

#### E. API Route: `POST /api/form/analyze`

Purpose:
- understands uploaded form structure before filling

Accepted input:
- `fileName`
- `mimeType`
- either:
  - `fileDataBase64`
  - or `fileTextContent`

Flow:

1. validate incoming body
2. determine MIME type
3. build schema-generation prompt
4. if extracted text was provided, inject text into prompt
5. otherwise send inline binary data
6. call Gemini
7. parse JSON result
8. return form schema

Important output:
- `fields`
- `tableSections`
- `layoutBlocks`

Why `layoutBlocks` exists:
- fields and tables alone are not enough to reconstruct the original order
- `layoutBlocks` preserves the top-to-bottom structure of the form

#### F. API Route: `POST /api/form/fill`

Purpose:
- semantically map user answers into analyzed form fields

Input includes:
- `formSchema`
- `userInput`
- optional `focusFieldKey`
- optional `focusFieldLabel`
- optional `existingFilledFields`

Why these extra inputs matter:

`focusFieldKey`
- tells the model which missing field the UI is currently asking about

`existingFilledFields`
- prevents the model from replacing already-correct values carelessly

Flow:

1. validate request
2. build prompt using schema and user input
3. request structured JSON mapping from Gemini
4. parse JSON
5. return mapped fields and tables

Returned shape:
- `filledFields`
- `filledTables`
- `unmappedInfo`
- `summary`

#### G. Dev and Production Serving

Development:
- Vite runs in middleware mode inside Express
- same server handles both API and frontend

Production:
- Express serves files from `dist`
- fallback route returns `index.html`

### `vite.config.ts`

This file configures Vite.

Responsibilities:
- load environment values
- enable React plugin
- enable Tailwind Vite plugin
- define alias `@`
- configure HMR behavior

Important pieces:

`react()`
- enables React compilation and Vite React behavior

`tailwindcss()`
- integrates Tailwind into Vite

`alias: { '@': path.resolve(__dirname, '.') }`
- allows simplified imports from project root if needed

`hmr: process.env.DISABLE_HMR !== 'true'`
- lets HMR be disabled in some hosting/editor environments

### `tsconfig.json`

This controls TypeScript behavior.

Key points:
- target is `ES2022`
- module system is modern ES modules
- DOM libraries are enabled for browser APIs
- `jsx: react-jsx` supports modern React JSX transform
- `moduleResolution: bundler` works well with Vite
- `allowImportingTsExtensions: true` allows imports like `./App.tsx`
- `noEmit: true` means TypeScript type-checks but does not output build files by itself

Why `noEmit` is used:
- Vite handles the frontend build
- TypeScript is mainly used here for type checking

### `index.html`

This is the HTML shell for the frontend.

Responsibilities:
- defines document metadata
- provides `<div id="root"></div>`
- loads `src/main.tsx`

Without this file:
- React would have nowhere to mount

### `package.json`

This defines scripts and dependencies.

Important scripts:

`npm run dev`
- runs `tsx server.ts`
- starts the Express + Vite development server

`npm run build`
- builds frontend assets with Vite

`npm run preview`
- previews built frontend

`npm run lint`
- runs `tsc --noEmit`
- type-checks project

Main runtime dependencies:
- `react`
- `react-dom`
- `vite`
- `express`
- `dotenv`
- `@google/genai`
- `lucide-react`
- `motion`

Main dev dependencies:
- TypeScript
- React and Node type packages
- Tailwind
- `tsx`

### `.env.example`

This explains required environment variables.

Important values:
- `GEMINI_API_KEY`
- `APP_URL`

### `metadata.json`

This is metadata for app/platform-level configuration.

It defines:
- app name
- short description
- browser permissions

Important field:
- `requestFramePermissions: ["microphone"]`

This matches the fact that the app supports browser voice input.

## 4. How Files Are Connected

This is the easiest way to explain the connection between files:

1. `index.html`
   provides the DOM root

2. `src/main.tsx`
   loads styles and renders `App`

3. `src/index.css`
   loads Tailwind

4. `src/App.tsx`
   handles all user interaction and API communication

5. `server.ts`
   receives frontend requests and talks to Gemini

6. `vite.config.ts`
   configures frontend tooling

7. `tsconfig.json`
   configures TypeScript behavior

8. `.env.local`
   provides Gemini API key for backend AI calls

## 5. End-to-End Data Flow

### Flow A: Structured Data Extraction

1. User chooses voice or text in the first module.
2. Input is stored in React state.
3. User clicks `EXTRACT & STRUCTURE`.
4. `processData()` sends text to `/api/extract`.
5. Backend builds extraction prompt.
6. Gemini returns JSON.
7. Backend cleans and parses JSON.
8. Frontend normalizes result.
9. UI renders metadata, summary, and table.
10. User downloads PDF or Excel if needed.

### Flow B: Form Fill

1. User uploads form file.
2. `analyzeUploadedForm()` validates and reads the file.
3. Frontend sends either:
   - base64 file data
   - or extracted text for spreadsheet/text files
4. Backend `/api/form/analyze` generates a form schema.
5. Frontend normalizes schema and creates empty fill state.
6. UI shows the next missing field to ask.
7. User answers by text or voice.
8. `fillUploadedForm()` sends schema + answer + focus field to `/api/form/fill`.
9. Backend returns semantically mapped field values and table rows.
10. Frontend merges results with existing values.
11. UI updates editable form preview.
12. User exports filled form.

## 6. Why Normalization Is Important

The model may return data in slightly different shapes across calls. The frontend uses normalization functions so the UI does not break when:

- columns arrive as objects instead of strings
- rows arrive as objects instead of arrays
- labels are missing
- table row lengths are inconsistent
- form layout information is incomplete

This is one of the most important practical engineering parts of the project.

## 7. Where the AI Is Actually Used

AI is not used everywhere. It is used in specific backend routes:

1. `/api/extract`
   converts narrative text to structured document output

2. `/api/form/analyze`
   understands uploaded form structure

3. `/api/form/fill`
   semantically maps user answers to fields and tables

Everything else is traditional application logic:
- React state
- event handling
- validation
- rendering
- exporting
- error handling
- browser APIs

## 8. Important Limitations

Be honest if someone asks.

1. This is not full OCR coordinate-based native form editing for every file type.
2. Excel analysis works through text extraction fallback, not raw model attachment support.
3. `.doc` and `.docx` native layout-preserving writeback is still limited.
4. Exported filled forms preserve logical structure well, but not every original binary template exactly.

## 9. Good Short Explanation for Mentor

You can say this:

“`App.tsx` is the main frontend controller. It manages both modules: narrative extraction and form filling. The frontend collects input, sends it to Express routes in `server.ts`, and the backend uses Gemini to return structured JSON. The frontend then normalizes that JSON so the UI stays stable even if model output varies. `main.tsx` mounts the app, `index.css` loads Tailwind, `vite.config.ts` configures React and Tailwind, and `tsconfig.json` handles TypeScript settings. The form module is split into form analysis first and semantic filling second, and it preserves order using `layoutBlocks`.”`

## 10. Good Question-and-Answer Preparation

If someone asks “Why not call Gemini directly from frontend?”

Answer:
- API key security
- prompt control
- centralized error handling
- response sanitization on the server

If someone asks “Why normalize responses?”

Answer:
- model output can vary
- normalization prevents rendering failures
- UI code can rely on one consistent structure

If someone asks “Why two routes for forms?”

Answer:
- form analysis and form filling are different problems
- first route builds structure
- second route maps values into that structure

If someone asks “Why use `layoutBlocks`?”

Answer:
- fields and tables alone do not preserve original ordering
- `layoutBlocks` lets the frontend rebuild the form in the same logical sequence

If someone asks “Why is Excel handled differently?”

Answer:
- Gemini rejected raw `.xlsx` MIME
- so the frontend extracts sheet text first
- then sends text for schema analysis

## 11. Final Summary

This project is a React + Express + Gemini app where:

- `App.tsx` handles UI, state, speech, API calls, normalization, and export
- `server.ts` handles AI communication and JSON sanitization
- `main.tsx` mounts the app
- `index.css` loads Tailwind
- `vite.config.ts` and `tsconfig.json` support the build and typing environment

The project’s real engineering strength is not only the AI call itself, but the surrounding application logic that makes the AI output safe, editable, and usable in a real UI.
