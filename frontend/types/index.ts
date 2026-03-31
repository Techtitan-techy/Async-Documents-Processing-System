export interface ExtractedData {
  title: string;
  category: string;
  summary: string;
  keywords: string[];
}

export interface ConfidenceScores {
  title?: number;
  category?: number;
  summary?: number;
  keywords?: number;
  [key: string]: number | undefined;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
}

export interface ProcessingResult {
  id: number;
  document_id: string;
  title?: string;
  category?: string;
  summary?: string;
  keywords?: string[];
  confidence_scores?: ConfidenceScores;
  raw_result?: any;
  validation_errors?: any[];
  entity_f1?: number;
  kieval_entity_f1?: number;
  group_f1?: number;
  kieval_aligned?: number;
}

export interface Document {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'finalized';
  created_at: string;
  updated_at: string;
}
