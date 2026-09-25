import { importAnyFileAsModel, ImportedFileResult } from './fileImporter';
import { DocumentoPagina } from '../types';

export type { ImportedFileResult };

export interface ImportedPdfResult {
  title: string;
  totalPages: number;
  pages: DocumentoPagina[];
  rawFileUrl?: string;
}

/**
 * Lê um arquivo PDF ou qualquer outro formato suportado e o converte em modelo editável
 */
export async function importPdfFile(file: File): Promise<ImportedPdfResult> {
  const result = await importAnyFileAsModel(file);
  return {
    title: result.title,
    totalPages: result.totalPages,
    pages: result.pages,
    rawFileUrl: result.rawFileUrl,
  };
}

export * from './fileImporter';
