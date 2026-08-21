export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  documentType: string;
  workflow: 'extraction' | 'form-fill';
  status: 'completed' | 'attention' | 'processing' | 'failed';
  driveFileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  documents: number;
  forms: number;
  exports: number;
  issues: number;
  recentDocuments: DocumentRecord[];
}
