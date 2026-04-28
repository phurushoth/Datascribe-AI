/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  FileText, 
  Play, 
  RotateCcw, 
  Download, 
  FileSpreadsheet,
  Upload,
  Sparkles,
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Loader2
} from 'lucide-react';

interface ExtractionResult {
  documentType: string;
  documentIcon: string;
  title: string;
  metadata: Record<string, any>;
  columns: string[];
  rows: string[][];
  totalRow: string[] | null;
  summary: string;
  color: string;
}

interface FormField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
}

interface FormTableSection {
  key: string;
  title: string;
  columns: string[];
  description: string;
}

interface FormSchema {
  formTitle: string;
  formType: string;
  summary: string;
  fields: FormField[];
  tableSections: FormTableSection[];
  instructions: string[];
}

interface FilledTableSection {
  key: string;
  title: string;
  columns: string[];
  rows: string[][];
}

interface FormFillResult {
  filledFields: Record<string, string>;
  filledTables: FilledTableSection[];
  unmappedInfo: string[];
  summary: string;
}

const SUPPORTED_FORM_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const SUPPORTED_FORM_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.webp'];
const NON_DIRECT_FORMAT_EXPORT_EXTENSIONS = new Set(['.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp']);

const DEFAULT_COLOR = 'amber';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toCellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toCellText).join(', ');
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
};

interface ColumnDef {
  label: string;
  accessors: string[];
}

const asSimpleString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const canonicalizeKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const uniqueNonEmpty = (values: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const identity = trimmed.toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push(trimmed);
  }
  return out;
};

const humanizeKey = (key: string): string => {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spaced) return 'Column';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const buildColumnDefs = (rawColumns: unknown[]): ColumnDef[] => {
  return rawColumns.map((column, index) => {
    if (isRecord(column)) {
      const label =
        asSimpleString(column.header) ||
        asSimpleString(column.title) ||
        asSimpleString(column.name) ||
        asSimpleString(column.label) ||
        asSimpleString(column.key) ||
        asSimpleString(column.field) ||
        asSimpleString(column.id) ||
        `Column ${index + 1}`;

      const accessors = uniqueNonEmpty([
        asSimpleString(column.key),
        asSimpleString(column.field),
        asSimpleString(column.id),
        asSimpleString(column.name),
        asSimpleString(column.label),
        asSimpleString(column.header),
        asSimpleString(column.title),
        label,
      ]);

      return { label, accessors: accessors.length > 0 ? accessors : [label] };
    }

    const label = asSimpleString(column) || toCellText(column).trim() || `Column ${index + 1}`;
    return { label, accessors: [label] };
  });
};

const valuesFromRecord = (record: Record<string, unknown>, columnDefs: ColumnDef[]): string[] => {
  const keyLookup = new Map<string, string>();
  for (const key of Object.keys(record)) {
    const canonical = canonicalizeKey(key);
    if (canonical && !keyLookup.has(canonical)) {
      keyLookup.set(canonical, key);
    }
  }

  return columnDefs.map((column) => {
    for (const accessor of column.accessors) {
      if (accessor in record) {
        return toCellText(record[accessor]);
      }

      const matchedKey = keyLookup.get(canonicalizeKey(accessor));
      if (matchedKey) {
        return toCellText(record[matchedKey]);
      }
    }
    return '';
  });
};

const normalizeExtractionResult = (raw: unknown): ExtractionResult => {
  const input = isRecord(raw) ? raw : {};
  const metadata = isRecord(input.metadata) ? input.metadata : {};
  let columnDefs: ColumnDef[] = Array.isArray(input.columns) ? buildColumnDefs(input.columns) : [];
  let rowsSource = Array.isArray(input.rows) ? input.rows : [];

  if (rowsSource.length === 0 && Array.isArray((input as any).data)) {
    rowsSource = (input as any).data as unknown[];
  }

  const rows: string[][] = rowsSource.map((row) => {
    if (Array.isArray(row)) {
      return row.map(toCellText);
    }
    if (isRecord(row)) {
      if (columnDefs.length === 0) {
        columnDefs = Object.keys(row).map((key, index) => ({
          label: humanizeKey(key) || `Column ${index + 1}`,
          accessors: [key, humanizeKey(key)],
        }));
      }
      return valuesFromRecord(row, columnDefs);
    }
    return [toCellText(row)];
  });

  if (columnDefs.length === 0 && rows.length > 0) {
    const firstRowLength = rows[0].length;
    columnDefs = Array.from({ length: firstRowLength }, (_, i) => ({
      label: `Column ${i + 1}`,
      accessors: [`Column ${i + 1}`],
    }));
  }

  const maxRowLength = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const normalizedColumnCount = Math.max(columnDefs.length, maxRowLength, 1);

  if (columnDefs.length < normalizedColumnCount) {
    for (let i = columnDefs.length; i < normalizedColumnCount; i++) {
      columnDefs.push({ label: `Column ${i + 1}`, accessors: [`Column ${i + 1}`] });
    }
  }

  const normalizedRows = rows.map((row) => {
    if (row.length >= normalizedColumnCount) return row.slice(0, normalizedColumnCount);
    return [...row, ...Array.from({ length: normalizedColumnCount - row.length }, () => '')];
  });

  const totalRowSource = input.totalRow;
  let totalRow: string[] | null = null;
  if (Array.isArray(totalRowSource)) {
    totalRow = totalRowSource.map(toCellText);
  } else if (isRecord(totalRowSource)) {
    if (columnDefs.length === 0) {
      columnDefs = Object.keys(totalRowSource).map((key, index) => ({
        label: humanizeKey(key) || `Column ${index + 1}`,
        accessors: [key, humanizeKey(key)],
      }));
    }
    totalRow = valuesFromRecord(totalRowSource, columnDefs);
  } else if (totalRowSource !== null && totalRowSource !== undefined && totalRowSource !== '') {
    totalRow = [toCellText(totalRowSource)];
  }

  if (totalRow) {
    if (totalRow.length < normalizedColumnCount) {
      totalRow = [...totalRow, ...Array.from({ length: normalizedColumnCount - totalRow.length }, () => '')];
    } else if (totalRow.length > normalizedColumnCount) {
      totalRow = totalRow.slice(0, normalizedColumnCount);
    }
  }

  const color = toCellText(input.color).trim().toLowerCase() || DEFAULT_COLOR;
  const columns = columnDefs.map((column) => column.label);

  return {
    documentType: toCellText(input.documentType).trim() || 'Document',
    documentIcon: toCellText(input.documentIcon).trim() || '📄',
    title: toCellText(input.title).trim() || 'Structured Data Output',
    metadata: metadata as Record<string, any>,
    columns,
    rows: normalizedRows,
    totalRow,
    summary: toCellText(input.summary).trim() || 'Structured data extracted successfully.',
    color: COLORS[color] ? color : DEFAULT_COLOR,
  };
};

const normalizeFormSchema = (raw: unknown): FormSchema => {
  const input = isRecord(raw) ? raw : {};
  const rawFields = Array.isArray(input.fields) ? input.fields : [];
  const rawTables = Array.isArray(input.tableSections) ? input.tableSections : [];
  const rawInstructions = Array.isArray(input.instructions) ? input.instructions : [];

  const fields: FormField[] = rawFields.map((field, index) => {
    const f = isRecord(field) ? field : {};
    const key = asSimpleString(f.key) || `field_${index + 1}`;
    const label = asSimpleString(f.label) || humanizeKey(key) || `Field ${index + 1}`;
    return {
      key,
      label,
      type: asSimpleString(f.type) || 'unknown',
      required: Boolean(f.required),
      description: asSimpleString(f.description),
    };
  });

  const tableSections: FormTableSection[] = rawTables.map((table, index) => {
    const t = isRecord(table) ? table : {};
    const key = asSimpleString(t.key) || `table_${index + 1}`;
    const columns = Array.isArray(t.columns)
      ? t.columns.map((c) => toCellText(c).trim()).filter(Boolean)
      : [];
    return {
      key,
      title: asSimpleString(t.title) || humanizeKey(key) || `Table ${index + 1}`,
      columns: columns.length > 0 ? columns : ['Column 1'],
      description: asSimpleString(t.description),
    };
  });

  return {
    formTitle: asSimpleString(input.formTitle) || 'Untitled Form',
    formType: asSimpleString(input.formType) || 'form',
    summary: asSimpleString(input.summary) || 'Form template analyzed and ready for AI-assisted filling.',
    fields,
    tableSections,
    instructions: rawInstructions.map((i) => toCellText(i)).filter(Boolean),
  };
};

const normalizeFormFillResult = (raw: unknown, schema: FormSchema): FormFillResult => {
  const input = isRecord(raw) ? raw : {};
  const rawFilledFields = isRecord(input.filledFields) ? input.filledFields : {};
  const rawFilledTables = Array.isArray(input.filledTables) ? input.filledTables : [];
  const rawUnmapped = Array.isArray(input.unmappedInfo) ? input.unmappedInfo : [];

  const fieldKeys = new Set(schema.fields.map((f) => f.key));
  const filledFields: Record<string, string> = {};
  for (const field of schema.fields) {
    filledFields[field.key] = toCellText(rawFilledFields[field.key]);
  }

  // Accept additional model-provided keys only when they are in schema.
  for (const [key, value] of Object.entries(rawFilledFields)) {
    if (fieldKeys.has(key)) {
      filledFields[key] = toCellText(value);
    }
  }

  const schemaTableMap = new Map(schema.tableSections.map((t) => [t.key, t]));

  const filledTables: FilledTableSection[] = rawFilledTables.map((table, index) => {
    const t = isRecord(table) ? table : {};
    const key = asSimpleString(t.key) || schema.tableSections[index]?.key || `table_${index + 1}`;
    const fromSchema = schemaTableMap.get(key);
    const title = asSimpleString(t.title) || fromSchema?.title || humanizeKey(key) || `Table ${index + 1}`;
    const columnsFromModel = Array.isArray(t.columns) ? t.columns.map((c) => toCellText(c).trim()).filter(Boolean) : [];
    const columns = columnsFromModel.length > 0 ? columnsFromModel : (fromSchema?.columns || ['Column 1']);
    const rawRows = Array.isArray(t.rows) ? t.rows : [];
    const rows = rawRows.map((row) => {
      if (Array.isArray(row)) {
        const values = row.map((v) => toCellText(v));
        if (values.length < columns.length) {
          return [...values, ...Array.from({ length: columns.length - values.length }, () => '')];
        }
        return values.slice(0, columns.length);
      }
      if (isRecord(row)) {
        return columns.map((c) => toCellText(row[c]));
      }
      return [toCellText(row), ...Array.from({ length: Math.max(columns.length - 1, 0) }, () => '')];
    });

    return { key, title, columns, rows };
  });

  return {
    filledFields,
    filledTables,
    unmappedInfo: rawUnmapped.map((i) => toCellText(i)).filter(Boolean),
    summary: asSimpleString(input.summary) || 'Form data mapped successfully.',
  };
};

const COLORS: Record<string, any> = {
  amber: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#F59E0B', head: '#F59E0B', line: 'rgba(245,158,11,0.3)' },
  blue: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#60A5FA', head: '#60A5FA', line: 'rgba(59,130,246,0.3)' },
  green: { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)', text: '#4ADE80', head: '#4ADE80', line: 'rgba(74,222,128,0.3)' },
  red: { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)', text: '#F87171', head: '#F87171', line: 'rgba(248,113,113,0.3)' },
  purple: { bg: 'rgba(192,132,252,0.15)', border: 'rgba(192,132,252,0.4)', text: '#C084FC', head: '#C084FC', line: 'rgba(192,132,252,0.3)' },
  teal: { bg: 'rgba(34,211,238,0.15)', border: 'rgba(34,211,238,0.4)', text: '#22D3EE', head: '#22D3EE', line: 'rgba(34,211,238,0.3)' },
};

const loadScript = (id: string, src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      const readyState = (existing as any).readyState;
      if (existing.dataset.loaded === 'true' || readyState === 'complete' || readyState === 'loaded') {
        existing.dataset.loaded = 'true';
        resolve();
        return;
      }
      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.dataset.loaded = 'false';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
};

export default function App() {
  const [currentMode, setCurrentMode] = useState<'voice' | 'text'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [procStep, setProcStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const [uploadedForm, setUploadedForm] = useState<File | null>(null);
  const [isFormAnalyzing, setIsFormAnalyzing] = useState(false);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [formInput, setFormInput] = useState('');
  const [isFormFilling, setIsFormFilling] = useState(false);
  const [formFillResult, setFormFillResult] = useState<FormFillResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [fullTranscript, interimTranscript]);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Please use Text Input tab instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let fin = '';
      let inter = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fin += event.results[i][0].transcript + ' ';
        } else {
          inter += event.results[i][0].transcript;
        }
      }
      if (fin) {
        setFullTranscript(prev => prev + fin);
      }
      setInterimTranscript(inter);
    };

    recognition.onerror = (event: any) => {
      setError('Microphone error: ' + event.error + '. Try the Text Input tab.');
      stopRecording();
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setError(null);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const clearAll = () => {
    setFullTranscript('');
    setInterimTranscript('');
    setTextInput('');
    setError(null);
    setResult(null);
  };

  const resetFormModule = () => {
    setUploadedForm(null);
    setFormSchema(null);
    setFormInput('');
    setFormFillResult(null);
    setFormError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || '');
        const commaIndex = raw.indexOf(',');
        resolve(commaIndex >= 0 ? raw.slice(commaIndex + 1) : raw);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const getFileExtension = (fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return '';
    return fileName.slice(lastDot).toLowerCase();
  };

  const getFileStem = (fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    const base = lastDot === -1 ? fileName : fileName.slice(0, lastDot);
    return (base || 'filled_form').replace(/[\\/:*?"<>|]+/g, '_').trim();
  };

  const readApiErrorMessage = async (resp: Response, fallback: string): Promise<string> => {
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errData = await resp.json();
        if (errData?.error) return String(errData.error);
        return fallback;
      } catch {
        return fallback;
      }
    }

    let raw = '';
    try {
      raw = await resp.text();
    } catch {
      return fallback;
    }

    if (raw.includes('<!DOCTYPE') || raw.includes('<html')) {
      return 'Server returned HTML instead of API JSON. Restart `npm run dev` and retry.';
    }
    return raw.trim() || fallback;
  };

  const analyzeUploadedForm = async () => {
    if (!uploadedForm) {
      setFormError('Please upload a form file first.');
      return;
    }

    if (uploadedForm.size > 20 * 1024 * 1024) {
      setFormError('Please upload a file smaller than 20 MB.');
      return;
    }

    const fileName = uploadedForm.name.toLowerCase();
    const fileExtension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    const hasSupportedExt = SUPPORTED_FORM_EXTENSIONS.includes(fileExtension);
    const hasSupportedMime = uploadedForm.type ? SUPPORTED_FORM_MIME_TYPES.has(uploadedForm.type) : false;
    if (!hasSupportedExt && !hasSupportedMime) {
      setFormError(`Unsupported file type. Please use: ${SUPPORTED_FORM_EXTENSIONS.join(', ')}`);
      return;
    }

    try {
      setFormError(null);
      setFormFillResult(null);
      setIsFormAnalyzing(true);
      const fileDataBase64 = await fileToBase64(uploadedForm);

      const resp = await fetch('/api/form/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadedForm.name,
          mimeType: uploadedForm.type || undefined,
          fileDataBase64,
        }),
      });

      if (!resp.ok) {
        const errorMessage = await readApiErrorMessage(resp, 'Failed to analyze uploaded form');
        throw new Error(errorMessage);
      }

      const data = await resp.json();
      setFormSchema(normalizeFormSchema(data));
    } catch (err: any) {
      setFormError('Form analysis failed: ' + err.message);
    } finally {
      setIsFormAnalyzing(false);
    }
  };

  const fillUploadedForm = async () => {
    if (!formSchema) {
      setFormError('Please analyze the uploaded form first.');
      return;
    }

    const userInput = formInput.trim();
    if (!userInput) {
      setFormError('Please provide voice/text input to auto-fill the form.');
      return;
    }

    try {
      setFormError(null);
      setIsFormFilling(true);

      const resp = await fetch('/api/form/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSchema,
          userInput,
        }),
      });

      if (!resp.ok) {
        const errorMessage = await readApiErrorMessage(resp, 'Failed to fill form');
        throw new Error(errorMessage);
      }

      const data = await resp.json();
      setFormFillResult(normalizeFormFillResult(data, formSchema));
    } catch (err: any) {
      setFormError('Form fill failed: ' + err.message);
    } finally {
      setIsFormFilling(false);
    }
  };

  const processData = async () => {
    const text = currentMode === 'voice' ? (fullTranscript + interimTranscript).trim() : textInput.trim();
    if (!text) {
      setError('Please provide some data first.');
      return;
    }
    if (text.length < 10) {
      setError('Please provide more data for accurate extraction.');
      return;
    }

    setError(null);
    if (isRecording) stopRecording();
    setResult(null);
    setIsProcessing(true);
    setProcStep(1);

    try {
      // Simulate steps for UI feel as in the original
      setTimeout(() => setProcStep(2), 600);
      setTimeout(() => setProcStep(3), 1100);

      const resp = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Processing failed');
      }

      const data = await resp.json();
      const normalized = normalizeExtractionResult(data);
      setProcStep(4);
      setTimeout(() => {
        setIsProcessing(false);
        setResult(normalized);
      }, 800);
    } catch (err: any) {
      setIsProcessing(false);
      setError('Processing failed: ' + err.message + '. Please try again.');
    }
  };

  const downloadPDF = async () => {
    if (!result) return;
    try {
      await loadScript('jspdf-script', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const w = window as any;
      const jsPDFCtor = w.jspdf?.jsPDF || w.jsPDF;
      if (!jsPDFCtor) {
        throw new Error('jsPDF failed to load');
      }
      if (!w.jsPDF) {
        w.jsPDF = jsPDFCtor;
      }
      await loadScript('jspdf-autotable-script', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

      const doc = new jsPDFCtor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210;

      const pdfColors: any = { amber: [245, 158, 11], blue: [59, 130, 246], green: [34, 197, 94], red: [248, 113, 113], purple: [192, 132, 252], teal: [34, 211, 238] };
      const ac = pdfColors[result.color] || pdfColors.amber;

      doc.setFillColor(13, 17, 23);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(...ac);
      doc.rect(0, 0, W, 16, 'F');

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('DATASCRIBE AI', 12, 10);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Voice to Structured Data Intelligence', 12, 14);
      doc.text(result.documentType.toUpperCase(), W - 12, 10, { align: 'right' });
      doc.text(new Date().toLocaleDateString(), W - 12, 14, { align: 'right' });

      doc.setTextColor(230, 237, 243);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text(result.title, 12, 28);

      const meta = Object.entries(result.metadata || {});
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.setTextColor(139, 148, 158);
      meta.forEach(([k, v], i) => {
        const col = i % 4, row = Math.floor(i / 4);
        doc.setTextColor(139, 148, 158); doc.text(k + ':', 14 + col * 70, 37 + row * 5);
        doc.setTextColor(200, 210, 220); doc.text(String(v), 14 + col * 70 + doc.getTextWidth(k + ': ') + 1, 37 + row * 5);
      });

      const startY = meta.length > 0 ? (meta.length > 4 ? 52 : 42) : 36;
      const tableOptions = {
        head: [result.columns],
        body: [...result.rows, ...(result.totalRow ? [result.totalRow] : [])],
        startY, margin: { left: 12, right: 12 },
        styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [200, 210, 220], lineColor: [48, 54, 61], lineWidth: 0.3, fillColor: [22, 27, 34] },
        headStyles: { fillColor: ac, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [33, 38, 45] },
        didParseCell: (data: any) => {
          if (result.totalRow && data.row.index === result.rows.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = ac;
            data.cell.styles.fillColor = [20, 24, 30];
          }
        }
      };

      const autoTableModule = w.jspdfAutoTable;
      if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable(tableOptions);
      } else if (typeof autoTableModule?.default === 'function') {
        autoTableModule.default(doc, tableOptions);
      } else if (typeof autoTableModule === 'function') {
        autoTableModule(doc, tableOptions);
      } else {
        throw new Error('AutoTable plugin failed to attach');
      }

      doc.save(`${result.title.replace(/\s+/g, '_')}.pdf`);
    } catch (e: any) {
      setError('PDF generation failed: ' + e.message);
    }
  };

  const downloadExcel = async () => {
    if (!result) return;

    try {
      await loadScript('xlsx-script', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        throw new Error('XLSX library failed to load');
      }

      const now = new Date();
      const exportedAt = now.toLocaleString();
      const metadataEntries = Object.entries(result.metadata || {});
      const tableRows: string[][] = [result.columns, ...result.rows, ...(result.totalRow ? [result.totalRow] : [])];
      const aoa: any[][] = [];

      aoa.push([`DATASCRIBE AI REPORT`]);
      aoa.push([result.title || 'Structured Data Output']);
      aoa.push(['Document Type', result.documentType || 'Document']);
      aoa.push(['Exported On', exportedAt]);
      aoa.push([]);

      if (metadataEntries.length > 0) {
        aoa.push(['Metadata']);
        for (const [key, value] of metadataEntries) {
          aoa.push([humanizeKey(key), String(value)]);
        }
        aoa.push([]);
      }

      const tableHeaderRowIndex = aoa.length;
      aoa.push(result.columns);
      for (const row of result.rows) {
        aoa.push(row);
      }
      if (result.totalRow) {
        aoa.push(result.totalRow);
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const colCount = Math.max(result.columns.length, 2);
      const lastColLabel = XLSX.utils.encode_col(colCount - 1);
      ws['!merges'] = [
        XLSX.utils.decode_range(`A1:${lastColLabel}1`),
        XLSX.utils.decode_range(`A2:${lastColLabel}2`),
      ];

      ws['!autofilter'] = {
        ref: `A${tableHeaderRowIndex + 1}:${XLSX.utils.encode_col(result.columns.length - 1)}${tableHeaderRowIndex + tableRows.length}`,
      };

      ws['!cols'] = result.columns.map((header, colIndex) => {
        let maxLength = String(header || '').length;
        for (const row of result.rows) {
          maxLength = Math.max(maxLength, String(row[colIndex] || '').length);
        }
        if (result.totalRow) {
          maxLength = Math.max(maxLength, String(result.totalRow[colIndex] || '').length);
        }
        return { wch: Math.min(50, Math.max(16, maxLength + 2)) };
      });

      if (ws['A4']) ws['A4'].z = '@';
      if (ws['B4']) ws['B4'].z = '@';

      const wb = XLSX.utils.book_new();
      wb.Props = {
        Title: result.title || 'DataScribe Export',
        Subject: result.documentType || 'Structured Data',
        Author: 'DataScribe AI',
        CreatedDate: now,
      };
      XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
      XLSX.writeFile(wb, `${result.title.replace(/\s+/g, '_')}.xlsx`);
    } catch (e: any) {
      setError('Excel export failed: ' + e.message);
    }
  };

  const saveFilledFormPDF = async (preferredBaseName?: string) => {
    if (!formSchema || !formFillResult) return;

    try {
      await loadScript('jspdf-script', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const w = window as any;
      const jsPDFCtor = w.jspdf?.jsPDF || w.jsPDF;
      if (!jsPDFCtor) {
        throw new Error('jsPDF failed to load');
      }
      if (!w.jsPDF) {
        w.jsPDF = jsPDFCtor;
      }
      await loadScript('jspdf-autotable-script', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

      const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(13, 17, 23);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(230, 237, 243);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('DATASCRIBE AI - FILLED FORM', 12, 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(new Date().toLocaleString(), pageWidth - 12, 11, { align: 'right' });

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(formSchema.formTitle || 'Filled Form', 12, 27);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Type: ${formSchema.formType || 'form'}`, 12, 33);

      const autoTableModule = w.jspdfAutoTable;
      const runTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
          return;
        }
        if (typeof autoTableModule?.default === 'function') {
          autoTableModule.default(doc, options);
          return;
        }
        if (typeof autoTableModule === 'function') {
          autoTableModule(doc, options);
          return;
        }
        throw new Error('AutoTable plugin failed to attach');
      };

      const fieldRows = formSchema.fields.map((field) => ([
        field.label,
        formFillResult.filledFields[field.key] || '',
      ]));

      runTable({
        startY: 38,
        head: [['Field', 'Value']],
        body: fieldRows.length > 0 ? fieldRows : [['No fields detected', '']],
        margin: { left: 12, right: 12 },
        headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      let nextY = ((doc as any).lastAutoTable?.finalY || 50) + 8;

      for (const table of formFillResult.filledTables) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(table.title || humanizeKey(table.key), 12, nextY);
        nextY += 2;

        runTable({
          startY: nextY,
          head: [table.columns],
          body: table.rows.length > 0 ? table.rows : [table.columns.map(() => '')],
          margin: { left: 12, right: 12 },
          headStyles: { fillColor: [34, 211, 238], textColor: [0, 0, 0] },
          styles: { fontSize: 8.5, cellPadding: 2.5 },
        });

        nextY = ((doc as any).lastAutoTable?.finalY || nextY + 24) + 8;
      }

      const stem = (preferredBaseName || formSchema.formTitle || 'filled_form').replace(/\s+/g, '_');
      doc.save(`${stem}_filled.pdf`);
    } catch (e: any) {
      setFormError('Filled-form PDF export failed: ' + e.message);
    }
  };

  const downloadFilledFormPDF = async () => {
    await saveFilledFormPDF();
  };

  const exportFilledFormWorkbook = async (ext: '.xlsx' | '.xls' | '.csv' | '.txt', baseName?: string) => {
    if (!formSchema || !formFillResult) return;

    await loadScript('xlsx-script', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      throw new Error('XLSX library failed to load');
    }

    const now = new Date();
    const aoa: any[][] = [];
    aoa.push(['DATASCRIBE AI - FILLED FORM']);
    aoa.push([formSchema.formTitle || 'Filled Form']);
    aoa.push(['Form Type', formSchema.formType || 'form']);
    aoa.push(['Exported On', now.toLocaleString()]);
    aoa.push([]);
    aoa.push(['Field', 'Value']);
    for (const field of formSchema.fields) {
      aoa.push([field.label, formFillResult.filledFields[field.key] || '']);
    }

    for (const table of formFillResult.filledTables) {
      aoa.push([]);
      aoa.push([table.title || humanizeKey(table.key)]);
      aoa.push(table.columns);
      for (const row of table.rows) {
        aoa.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 32 }, { wch: 54 }];

    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: `${formSchema.formTitle || 'Filled Form'} - Filled Output`,
      Subject: formSchema.formType || 'form',
      Author: 'DataScribe AI',
      CreatedDate: now,
    };
    XLSX.utils.book_append_sheet(wb, ws, 'Filled Form');

    const stem = (baseName || formSchema.formTitle || 'filled_form').replace(/\s+/g, '_');
    const outName = `${stem}_filled${ext}`;
    const options = ext === '.xls'
      ? { bookType: 'biff8' }
      : ext === '.csv'
        ? { bookType: 'csv' }
        : ext === '.txt'
          ? { bookType: 'txt' }
          : { bookType: 'xlsx' };

    XLSX.writeFile(wb, outName, options);
  };

  const downloadFilledFormExcel = async () => {
    if (!formSchema || !formFillResult) return;
    try {
      await exportFilledFormWorkbook('.xlsx');
    } catch (e: any) {
      setFormError('Filled-form Excel export failed: ' + e.message);
    }
  };

  const downloadFilledFormInOriginalFormat = async () => {
    if (!uploadedForm || !formSchema || !formFillResult) {
      setFormError('Please upload, analyze, and fill a form first.');
      return;
    }

    const ext = getFileExtension(uploadedForm.name);
    const baseName = getFileStem(uploadedForm.name);

    try {
      if (ext === '.pdf') {
        await saveFilledFormPDF(baseName);
        return;
      }

      if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || ext === '.txt') {
        await exportFilledFormWorkbook(ext, baseName);
        return;
      }

      if (NON_DIRECT_FORMAT_EXPORT_EXTENSIONS.has(ext)) {
        setFormError(`Exact ${ext.toUpperCase()} template-format export is not available yet. Use "DOWNLOAD FILLED PDF" for best layout-preserved output.`);
        return;
      }

      setFormError(`Unsupported output format for same-format export: ${ext || 'unknown file type'}`);
    } catch (e: any) {
      setFormError('Same-format export failed: ' + e.message);
    }
  };

  const resColor = result ? COLORS[result.color] || COLORS.amber : COLORS.amber;

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] font-sans selection:bg-amber-500/30">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center gap-3 mb-8 pb-5 border-bottom border-[#30363D]">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center shrink-0">
            <Mic className="text-white" size={24} />
          </div>
          <div className="brand">
            <h1 className="text-2xl font-bold tracking-wider text-white leading-none font-sans uppercase">DataScribe AI</h1>
            <p className="text-xs text-[#8B949E] tracking-wide mt-1">Voice to Structured Data Intelligence</p>
          </div>
          
        </header>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-[#161B22] border border-[#30363D] rounded-xl p-1">
          <button 
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${currentMode === 'voice' ? 'bg-[#21262D] text-white shadow-md' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
            onClick={() => setCurrentMode('voice')}
          >
            <Mic size={14} /> Voice Input
          </button>
          <button 
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${currentMode === 'text' ? 'bg-[#21262D] text-white shadow-md' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
            onClick={() => setCurrentMode('text')}
          >
            <FileText size={14} /> Text Input
          </button>
        </div>

        {/* Input Panel */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 mb-4 shadow-xl">
          <AnimatePresence mode="wait">
            {currentMode === 'voice' ? (
              <motion.div 
                key="voice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative w-[90px] h-[90px] flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full border-2 border-amber-500 transition-all duration-300 ${isRecording ? 'animate-ping opacity-30 border-red-500' : 'opacity-30'}`}></div>
                    <button 
                      onClick={toggleRecording}
                      className={`w-[72px] h-[72px] rounded-full flex items-center justify-center relative z-10 transition-transform active:scale-95 hover:scale-105 ${isRecording ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-br from-[#21262D] to-[#161B22] border-2 border-[#30363D]'}`}
                    >
                      <Mic size={28} className="text-white" />
                    </button>
                  </div>
                  <div className="text-xs text-[#8B949E] flex items-center gap-2">
                    {isRecording ? (
                      <><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Recording... speak clearly</>
                    ) : (
                      'Click to start recording your data'
                    )}
                  </div>
                  
                  {isRecording && (
                    <div className="flex items-center justify-center gap-1 h-8 mt-1">
                      {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <motion.span 
                          key={i}
                          animate={{ height: [6, 22, 6], opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                          className="w-1 bg-red-500 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div 
                  ref={transcriptBoxRef}
                  className="bg-[#21262D] border border-[#30363D] rounded-lg p-3 min-h-[80px] max-h-[160px] overflow-y-auto font-mono text-xs leading-relaxed text-[#E6EDF3]"
                >
                  {!(fullTranscript + interimTranscript) ? (
                    <span className="italic text-[#8B949E]">Your transcribed text will appear here as you speak...</span>
                  ) : (
                    <>
                      <span>{fullTranscript}</span>
                      <span className="italic text-[#8B949E]">{interimTranscript}</span>
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#8B949E]">
                  <span>Speak naturally — narrate as a story or list items</span>
                  <span className="font-mono">{(fullTranscript + interimTranscript).length} chars</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <textarea 
                  className="w-full bg-[#21262D] border border-[#30363D] rounded-lg p-3 text-[#E6EDF3] font-mono text-xs leading-relaxed outline-none focus:border-amber-500 transition-colors min-h-[120px] resize-none"
                  placeholder="Paste or type your data here — narrate like a story or dump raw data...&#10;&#10;Example: 'On March 15th we received 50 units of Widget A at $12 each from Supplier XYZ.'"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <div className="flex justify-between items-center text-[11px] text-[#8B949E]">
                   <span>Works with invoices, checklists, reports, logs & more</span>
                   <span className="font-mono">{textInput.length} chars</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2.5 mt-3">
            <button 
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              onClick={processData}
              disabled={isProcessing || (!(fullTranscript + interimTranscript) && !textInput)}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              EXTRACT & STRUCTURE
            </button>
            <button 
              className="px-4 py-3 bg-transparent border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#E6EDF3] rounded-lg text-sm transition-all"
              onClick={clearAll}
            >
              Clear
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg mt-3 flex items-start gap-2"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}
        </div>

        {/* Processing State */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#161B22] border-2 border-amber-500 rounded-xl p-5 mb-4 shadow-xl shadow-amber-500/5"
            >
              <div className="space-y-2.5">
                {[
                  { id: 1, label: 'Analyzing document type and content' },
                  { id: 2, label: 'Extracting data fields and values' },
                  { id: 3, label: 'Building table schema and columns' },
                  { id: 4, label: 'Generating structured output' }
                ].map((s) => (
                  <div key={s.id} className={`flex items-center gap-3 text-sm transition-colors duration-300 ${procStep === s.id ? 'text-white' : procStep > s.id ? 'text-[#4ADE80]' : 'text-[#8B949E]'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] ${procStep === s.id ? 'animate-spin border-amber-500' : procStep > s.id ? 'border-[#4ADE80]' : 'border-current'}`}>
                      {procStep > s.id && '✓'}
                    </div>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Panel */}
        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-3xl">{result.documentIcon || '📄'}</div>
                <div className="doc-info">
                  <h2 className="text-lg font-bold text-white tracking-wide uppercase">{result.title}</h2>
                  <p className="text-xs text-[#8B949E]">{result.documentType}</p>
                </div>
                <div 
                  className="ml-auto px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
                  style={{ background: resColor.bg, border: `1px solid ${resColor.border}`, color: resColor.text }}
                >
                  {result.documentType.toUpperCase()}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(result.metadata || {}).map(([k, v]) => (
                  <div key={k} className="bg-[#161B22] border border-[#30363D] rounded-md px-2.5 py-1.5 text-[11px] font-mono">
                    <span className="text-[#8B949E]">{k}:</span>
                    <span className="text-[#E6EDF3] ml-1.5">{String(v)}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#22D3EE]/5 border border-[#22D3EE]/20 rounded-lg p-3 text-sm leading-relaxed text-[#8B949E]">
                <strong className="text-[#22D3EE] flex items-center gap-1.5 mb-1">
                  <BarChart3 size={14} /> Summary:
                </strong> 
                {result.summary}
              </div>

              <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {result.columns.map((c, i) => (
                          <th 
                            key={i} 
                            className="px-3.5 py-2.5 text-left font-bold uppercase tracking-wider border-b-2 bg-[#161B22] sticky top-0"
                            style={{ color: resColor.head, borderColor: resColor.line }}
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363D]">
                      {result.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#21262D] transition-colors">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3.5 py-2.5 font-mono text-[#E6EDF3] truncate max-w-[200px]" title={String(cell)}>
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {result.totalRow && (
                        <tr className="bg-amber-500/5 font-bold border-t-2" style={{ borderColor: resColor.line }}>
                          {result.totalRow.map((cell, i) => (
                            <td key={i} className="px-3.5 py-2.5" style={{ color: resColor.text }}>
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button 
                  className="flex-1 py-3 bg-transparent border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  onClick={downloadPDF}
                >
                  <Download size={16} /> DOWNLOAD PDF
                </button>
                <button 
                  className="flex-1 py-3 bg-transparent border-2 border-[#22D3EE] text-[#22D3EE] hover:bg-[#22D3EE] hover:text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  onClick={downloadExcel}
                >
                  <FileSpreadsheet size={16} /> EXPORT EXCEL
                </button>
                <button 
                  className="px-4 py-3 bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#E6EDF3] rounded-lg text-sm transition-all flex items-center gap-2"
                  onClick={() => {
                    setResult(null);
                    clearAll();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <RotateCcw size={14} /> New Entry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Fill Module */}
        <div className="mt-10 bg-[#161B22] border border-[#30363D] rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Upload size={16} className="text-[#22D3EE]" />
            <h3 className="text-lg font-bold text-white tracking-wide">Form Fill Module</h3>
          </div>
          <p className="text-xs text-[#8B949E] mb-4">
            Upload a form template, let AI understand fields/tables, then provide one natural input to auto-fill the form.
          </p>

          <div className="space-y-3">
            <label className="block text-xs text-[#8B949E]">Upload Form (PDF, Word, Excel, Image)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
              className="w-full bg-[#21262D] border border-[#30363D] rounded-lg p-2.5 text-xs text-[#E6EDF3] file:mr-3 file:rounded-md file:border-0 file:bg-[#0D1117] file:text-[#E6EDF3] file:px-3 file:py-1.5"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setUploadedForm(file);
                setFormSchema(null);
                setFormFillResult(null);
                setFormError(null);
              }}
            />
            {uploadedForm && (
              <div className="text-[11px] text-[#8B949E]">
                Selected: <span className="text-[#E6EDF3]">{uploadedForm.name}</span> ({Math.round(uploadedForm.size / 1024)} KB)
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                className="flex-1 py-2.5 bg-[#22D3EE] hover:bg-[#67E8F9] text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                onClick={analyzeUploadedForm}
                disabled={!uploadedForm || isFormAnalyzing}
              >
                {isFormAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isFormAnalyzing ? 'ANALYZING FORM...' : 'ANALYZE FORM'}
              </button>
              <button
                className="px-4 py-2.5 bg-transparent border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#E6EDF3] rounded-lg text-sm transition-all"
                onClick={resetFormModule}
              >
                Reset
              </button>
            </div>
          </div>

          {formSchema && (
            <div className="mt-5 space-y-4">
              <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#4ADE80]" />
                  <span className="text-sm text-white font-semibold">Ready to Fill: {formSchema.formTitle}</span>
                </div>
                <p className="text-xs text-[#8B949E] mt-2">{formSchema.summary}</p>
                <div className="mt-2 text-[11px] text-[#8B949E]">
                  Fields: <span className="text-[#E6EDF3]">{formSchema.fields.length}</span> | Tables: <span className="text-[#E6EDF3]">{formSchema.tableSections.length}</span>
                </div>
              </div>

              <div className="bg-[#21262D] border border-[#30363D] rounded-lg p-3">
                <label className="block text-xs text-[#8B949E] mb-2">
                  Give natural input (voice transcript or typed text)
                </label>
                <textarea
                  className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-3 text-[#E6EDF3] font-mono text-xs leading-relaxed outline-none focus:border-[#22D3EE] transition-colors min-h-[96px] resize-y"
                  placeholder="Example: My name is Phushoth, I am 21 years old, studying CSE..."
                  value={formInput}
                  onChange={(e) => setFormInput(e.target.value)}
                />
                <div className="mt-3 flex gap-2.5">
                  <button
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    onClick={fillUploadedForm}
                    disabled={isFormFilling || !formInput.trim()}
                  >
                    {isFormFilling ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isFormFilling ? 'MAPPING VALUES...' : 'AUTO-FILL FORM'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {formFillResult && formSchema && (
            <div className="mt-5 space-y-4">
              <div className="bg-[#22D3EE]/5 border border-[#22D3EE]/20 rounded-lg p-3 text-sm text-[#8B949E]">
                <strong className="text-[#22D3EE]">Fill Summary:</strong> {formFillResult.summary}
              </div>

              {formSchema.fields.length > 0 && (
                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#161B22] border-b border-[#30363D]">
                        <th className="px-3 py-2 text-left text-[#22D3EE] uppercase tracking-wide">Field</th>
                        <th className="px-3 py-2 text-left text-[#22D3EE] uppercase tracking-wide">Mapped Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formSchema.fields.map((field) => (
                        <tr key={field.key} className="border-b border-[#30363D]">
                          <td className="px-3 py-2 text-[#8B949E]">{field.label}</td>
                          <td className="px-3 py-2 text-[#E6EDF3]">{formFillResult.filledFields[field.key] || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {formFillResult.filledTables.map((table) => (
                <div key={table.key} className="bg-[#0D1117] border border-[#30363D] rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#30363D] text-sm text-white font-semibold">
                    {table.title || humanizeKey(table.key)}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#161B22] border-b border-[#30363D]">
                          {table.columns.map((column, index) => (
                            <th key={index} className="px-3 py-2 text-left text-[#22D3EE] uppercase tracking-wide">{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.length === 0 ? (
                          <tr>
                            <td className="px-3 py-2 text-[#8B949E]" colSpan={table.columns.length}>No rows mapped</td>
                          </tr>
                        ) : (
                          table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-[#30363D]">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2 text-[#E6EDF3]">{cell}</td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {formFillResult.unmappedInfo.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-3">
                  <div className="text-xs text-amber-400 font-semibold mb-1">Unmapped Information</div>
                  <ul className="text-xs text-[#E6EDF3] list-disc pl-4 space-y-1">
                    {formFillResult.unmappedInfo.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  className="flex-1 py-3 bg-[#4ADE80]/10 border-2 border-[#4ADE80] text-[#4ADE80] hover:bg-[#4ADE80] hover:text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  onClick={downloadFilledFormInOriginalFormat}
                >
                  <Download size={16} /> DOWNLOAD FILLED (SAME FORMAT)
                </button>
                <button
                  className="flex-1 py-3 bg-transparent border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  onClick={downloadFilledFormPDF}
                >
                  <Download size={16} /> DOWNLOAD FILLED PDF
                </button>
                <button
                  className="flex-1 py-3 bg-transparent border-2 border-[#22D3EE] text-[#22D3EE] hover:bg-[#22D3EE] hover:text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  onClick={downloadFilledFormExcel}
                >
                  <FileSpreadsheet size={16} /> DOWNLOAD FILLED EXCEL
                </button>
              </div>
            </div>
          )}

          {formError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg mt-4 flex items-start gap-2"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {formError}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
