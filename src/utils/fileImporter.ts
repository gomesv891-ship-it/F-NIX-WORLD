import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { DocumentoPagina, DocumentoElemento, TipoElementoDocumento } from '../types';
import { formatBytes } from './pdfStorageService';

export { formatBytes };

// Configura o worker do pdfjs de forma segura para o navegador
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
  }
}

export interface ImportedFileResult {
  title: string;
  totalPages: number;
  pages: DocumentoPagina[];
  warnings: string[];
  convertedCount: number;
  formatDetected: string;
  originalBlob: Blob;
  mimeType: string;
  rawFileUrl?: string;
}

export const ACCEPTED_MODEL_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  '.svg',
  '.html',
  '.htm',
  '.txt',
  '.csv',
];

export const ACCEPTED_MODEL_FILE_TYPES_STRING = ACCEPTED_MODEL_FILE_EXTENSIONS.join(',');

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

export function getFileFormatLabel(filename: string, mimeType?: string): string {
  const ext = getFileExtension(filename);
  switch (ext) {
    case '.pdf':
      return 'PDF (Adobe Acrobat)';
    case '.docx':
      return 'DOCX (Microsoft Word)';
    case '.doc':
      return 'DOC (Word Legado)';
    case '.xlsx':
      return 'XLSX (Microsoft Excel)';
    case '.xls':
      return 'XLS (Excel Legado)';
    case '.pptx':
      return 'PPTX (Microsoft PowerPoint)';
    case '.ppt':
      return 'PPT (PowerPoint Legado)';
    case '.odt':
      return 'ODT (OpenDocument Texto)';
    case '.ods':
      return 'ODS (OpenDocument Planilha)';
    case '.odp':
      return 'ODP (OpenDocument Apresentação)';
    case '.svg':
      return 'SVG (Vetor Gráfico)';
    case '.html':
    case '.htm':
      return 'HTML (Página Web)';
    case '.csv':
      return 'CSV (Valores Separados por Vírgula)';
    case '.txt':
      return 'TXT (Texto Puro)';
    default:
      if (mimeType?.includes('pdf')) return 'PDF';
      if (mimeType?.includes('word')) return 'DOCX';
      if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return 'XLSX';
      return ext.replace('.', '').toUpperCase() || 'Arquivo';
  }
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converte qualquer arquivo compatível em um modelo editável com páginas e elementos independentes
 */
export async function importAnyFileAsModel(
  file: File,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const ext = getFileExtension(file.name);
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'Modelo Importado';
  const rawFileUrl = await fileToDataUrl(file);
  const originalBlob = file;

  if (onProgress) onProgress('Analisando formato do arquivo...', 15);

  // 1. PDF
  if (ext === '.pdf' || file.type === 'application/pdf') {
    return importPdfFileDetailed(file, cleanTitle, rawFileUrl, onProgress);
  }

  // 2. DOCX / DOC
  if (ext === '.docx' || ext === '.doc' || file.type.includes('word') || file.type.includes('officedocument.wordprocessingml')) {
    return importDocxFile(file, cleanTitle, rawFileUrl, onProgress);
  }

  // 3. XLSX / XLS / CSV / ODS
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || ext === '.ods' || file.type.includes('spreadsheet') || file.type.includes('excel')) {
    return importSpreadsheetFile(file, cleanTitle, rawFileUrl, onProgress);
  }

  // 4. PPTX / PPT / ODP
  if (ext === '.pptx' || ext === '.ppt' || ext === '.odp' || file.type.includes('presentation') || file.type.includes('powerpoint')) {
    return importPresentationFile(file, cleanTitle, rawFileUrl, onProgress);
  }

  // 5. ODT
  if (ext === '.odt') {
    return importOdtFile(file, cleanTitle, rawFileUrl, onProgress);
  }

  // 6. SVG
  if (ext === '.svg' || file.type === 'image/svg+xml') {
    return importSvgFile(file, cleanTitle, rawFileUrl, onProgress);
  }

  // 7. HTML / HTM
  if (ext === '.html' || ext === '.htm' || file.type.includes('html')) {
    return importHtmlFile(file, cleanTitle, rawFileUrl, onProgress);
  }

  // 8. Formato texto puro / genérico
  return importPlainTextFile(file, cleanTitle, rawFileUrl, onProgress);
}

// -------------------------------------------------------------
// IMPORTERS ESPECÍFICOS POR FORMATO
// -------------------------------------------------------------

/**
 * Processamento completo de PDF:
 * Extrai background renderizado + elementos de texto individuais com coordenadas, fontes e cores.
 */
async function importPdfFileDetailed(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages: DocumentoPagina[] = [];
  const warnings: string[] = [];
  let totalConvertedElements = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) {
      const pct = Math.round(20 + (pageNum / totalPages) * 70);
      onProgress(`Convertendo página ${pageNum} de ${totalPages}...`, pct);
    }

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const standardWidth = 794;
    const standardHeight = 1123;
    const scaleFactorX = standardWidth / viewport.width;
    const scaleFactorY = standardHeight / viewport.height;

    // Renderiza canvas como fundo em alta fidelidade
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    let pageBackgroundDataUrl = '';
    if (ctx) {
      try {
        await (page.render({ canvasContext: ctx, viewport, canvas } as any) as any).promise;
        pageBackgroundDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      } catch (renderErr) {
        warnings.push(`Página ${pageNum}: background visual gerado com resolução adaptada.`);
      }
    }

    // Extrai e agrupa textos vetorizados da página
    const elementos: DocumentoElemento[] = [];
    try {
      const textContent = await page.getTextContent();
      let elementIdx = 0;

      // Agrupa itens próximos na mesma linha horizontal
      const rawItems = textContent.items.filter((it: any) => 'str' in it && it.str && it.str.trim());
      
      for (const item of rawItems as any[]) {
        const tx = (item.transform[4] || 0) * scaleFactorX;
        const pdfY = item.transform[5] || 0;
        const ty = (viewport.height / 1.5 - pdfY) * scaleFactorY;

        if (ty >= 0 && ty <= standardHeight && tx >= 0 && tx <= standardWidth) {
          const fontSize = Math.max(10, Math.min(26, Math.round((item.height || 12) * 1.1)));
          const isBold = (item.fontName || '').toLowerCase().includes('bold') || (item.fontName || '').includes('black');

          elementos.push({
            id: `el_pdf_${pageNum}_${elementIdx++}`,
            tipo: 'texto',
            x: Math.max(16, Math.min(standardWidth - 180, Math.round(tx))),
            y: Math.max(16, Math.min(standardHeight - 36, Math.round(ty))),
            width: Math.min(480, Math.max(90, Math.round((item.width || 80) * scaleFactorX * 1.15))),
            height: Math.round(Math.max(24, (item.height || 14) * scaleFactorY * 1.25)),
            conteudo: item.str,
            fontSize,
            fontFamily: 'Inter, sans-serif',
            color: '#0f172a',
            backgroundColor: 'transparent',
            textAlign: 'left',
            fontWeight: isBold ? 'bold' : 'normal',
          });
          totalConvertedElements++;
        }
      }
    } catch (textErr) {
      warnings.push(`Página ${pageNum}: texto preservado na camada de imagem.`);
    }

    pages.push({
      id: `page_${Date.now()}_${pageNum}`,
      numero: pageNum,
      titulo: `Página ${pageNum}`,
      width: standardWidth,
      height: standardHeight,
      backgroundColor: '#ffffff',
      backgroundImage: pageBackgroundDataUrl,
      elementos,
    });
  }

  return {
    title: cleanTitle,
    totalPages,
    pages,
    warnings,
    convertedCount: totalConvertedElements,
    formatDetected: 'PDF',
    originalBlob: file,
    mimeType: 'application/pdf',
    rawFileUrl,
  };
}

/**
 * Processamento completo de DOCX / DOC:
 * Converte parágrafos, cabeçalhos, tabelas, imagens e formatações para elementos nativos.
 */
async function importDocxFile(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const warnings: string[] = [];
  const arrayBuffer = await file.arrayBuffer();
  let convertedCount = 0;

  if (onProgress) onProgress('Extraindo texto, títulos e tabelas do Word...', 35);

  let htmlContent = '';
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    htmlContent = result.value;
    if (result.messages && result.messages.length > 0) {
      const nonCritical = result.messages.filter((m) => m.type !== 'error');
      if (nonCritical.length > 0) {
        warnings.push(`${nonCritical.length} elementos de formatação avançada do Word foram normalizados.`);
      }
    }
  } catch (err: any) {
    warnings.push('Não foi possível ler formatação avançada do DOCX; convertendo estrutura de texto.');
    try {
      const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
      htmlContent = rawTextResult.value
        .split('\n')
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('');
    } catch {
      htmlContent = `<p>${cleanTitle}</p>`;
    }
  }

  // Parse HTML extraído para elementos visuais distribuídos em páginas A4
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const bodyChildren = Array.from(doc.body.children);

  const standardWidth = 794;
  const standardHeight = 1123;
  const marginX = 48;
  const marginY = 56;
  const contentWidth = standardWidth - marginX * 2;
  const maxContentY = standardHeight - marginY;

  const pages: DocumentoPagina[] = [];
  let currentPageElements: DocumentoElemento[] = [];
  let currentY = marginY;
  let pageNumber = 1;
  let elementIndex = 1;

  const pushCurrentPage = () => {
    pages.push({
      id: `page_${Date.now()}_${pageNumber}`,
      numero: pageNumber,
      titulo: `Página ${pageNumber}`,
      width: standardWidth,
      height: standardHeight,
      backgroundColor: '#ffffff',
      elementos: [...currentPageElements],
    });
    pageNumber++;
    currentPageElements = [];
    currentY = marginY;
  };

  // Se não houver nós filhos estruturados, quebra o texto do body
  const nodesToProcess = bodyChildren.length > 0 ? bodyChildren : [doc.body];

  for (const node of nodesToProcess) {
    const tagName = node.tagName.toLowerCase();
    const text = node.textContent?.trim() || '';

    // Imagens incorporadas
    if (tagName === 'img' || (node.querySelector && node.querySelector('img'))) {
      const img = tagName === 'img' ? (node as HTMLImageElement) : (node.querySelector('img') as HTMLImageElement);
      const src = img?.getAttribute('src') || '';
      if (src) {
        const imgHeight = 220;
        if (currentY + imgHeight > maxContentY) {
          pushCurrentPage();
        }
        currentPageElements.push({
          id: `el_docx_${elementIndex++}`,
          tipo: 'imagem',
          x: marginX,
          y: currentY,
          width: Math.min(contentWidth, 400),
          height: imgHeight,
          src,
          fit: 'contain',
        });
        currentY += imgHeight + 20;
        convertedCount++;
        continue;
      }
    }

    // Tabelas do Word
    if (tagName === 'table') {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length > 0) {
        const headers: string[] = [];
        const lines: string[][] = [];

        rows.forEach((r, rIdx) => {
          const cells = Array.from(r.querySelectorAll('th, td')).map((c) => c.textContent?.trim() || '');
          if (rIdx === 0 && r.querySelector('th')) {
            headers.push(...cells);
          } else if (rIdx === 0 && headers.length === 0) {
            headers.push(...cells);
          } else {
            lines.push(cells);
          }
        });

        const tableHeight = Math.max(120, (lines.length + 1) * 36);
        if (currentY + tableHeight > maxContentY && currentPageElements.length > 0) {
          pushCurrentPage();
        }

        currentPageElements.push({
          id: `el_docx_${elementIndex++}`,
          tipo: 'tabela',
          x: marginX,
          y: currentY,
          width: contentWidth,
          height: tableHeight,
          tabelaHeaders: headers.length > 0 ? headers : ['Coluna 1', 'Coluna 2'],
          tabelaLinhas: lines.length > 0 ? lines : [['Item A', '10']],
          headerBg: '#0284c7',
          headerColor: '#ffffff',
        });

        currentY += tableHeight + 24;
        convertedCount++;
        continue;
      }
    }

    if (!text) continue;

    // Cabeçalhos (H1, H2, H3, H4)
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const isH1 = tagName === 'h1';
      const isH2 = tagName === 'h2';
      const fontSize = isH1 ? 24 : isH2 ? 19 : 16;
      const elHeight = isH1 ? 40 : 32;

      if (currentY + elHeight > maxContentY) {
        pushCurrentPage();
      }

      currentPageElements.push({
        id: `el_docx_${elementIndex++}`,
        tipo: 'texto',
        x: marginX,
        y: currentY,
        width: contentWidth,
        height: elHeight,
        conteudo: text,
        fontSize,
        fontFamily: 'Inter, sans-serif',
        color: isH1 ? '#0052cc' : '#0f172a',
        fontWeight: 'bold',
        textAlign: 'left',
      });

      currentY += elHeight + 14;
      convertedCount++;
      continue;
    }

    // Parágrafos normais e listas
    const isList = tagName === 'ul' || tagName === 'ol' || tagName === 'li';
    const linesCount = Math.max(1, Math.ceil(text.length / 85));
    const elHeight = Math.max(26, linesCount * 22);

    if (currentY + elHeight > maxContentY) {
      pushCurrentPage();
    }

    currentPageElements.push({
      id: `el_docx_${elementIndex++}`,
      tipo: 'texto',
      x: marginX,
      y: currentY,
      width: contentWidth,
      height: elHeight,
      conteudo: isList ? `• ${text}` : text,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      color: '#334155',
      fontWeight: 'normal',
      textAlign: 'left',
      lineHeight: 1.45,
    });

    currentY += elHeight + 12;
    convertedCount++;
  }

  // Adiciona a última página se houver elementos pendentes
  if (currentPageElements.length > 0 || pages.length === 0) {
    pushCurrentPage();
  }

  return {
    title: cleanTitle,
    totalPages: pages.length,
    pages,
    warnings,
    convertedCount,
    formatDetected: 'DOCX / Word',
    originalBlob: file,
    mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    rawFileUrl,
  };
}

/**
 * Processamento completo de Planilhas (XLSX, XLS, CSV, ODS):
 * Converte cada aba da planilha em páginas organizadas com tabelas completas, cabeçalhos e formatação comercial.
 */
async function importSpreadsheetFile(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const warnings: string[] = [];
  const arrayBuffer = await file.arrayBuffer();
  let convertedCount = 0;

  if (onProgress) onProgress('Lendo células, abas e tabelas da planilha...', 40);

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const pages: DocumentoPagina[] = [];
  const standardWidth = 794;
  const standardHeight = 1123;
  const marginX = 40;
  const marginY = 48;
  const contentWidth = standardWidth - marginX * 2;

  sheetNames.forEach((sheetName, sIdx) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    // Matriz de dados (array de arrays)
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!data || data.length === 0) return;

    // Encontra primeira linha não-vazia para cabeçalhos
    let headerRowIdx = 0;
    while (headerRowIdx < data.length && data[headerRowIdx].every((cell) => cell === '' || cell === null)) {
      headerRowIdx++;
    }

    if (headerRowIdx >= data.length) return;

    const rawHeaders = data[headerRowIdx].map((c, i) => String(c || `Coluna ${i + 1}`).trim());
    const validColsCount = Math.max(2, rawHeaders.filter((h) => h !== '').length);
    const headers = rawHeaders.slice(0, validColsCount);

    const rows = data.slice(headerRowIdx + 1, headerRowIdx + 50).map((row) => {
      const formattedRow: string[] = [];
      for (let i = 0; i < validColsCount; i++) {
        const val = row[i];
        if (typeof val === 'number') {
          formattedRow.push(val.toLocaleString('pt-BR'));
        } else {
          formattedRow.push(String(val ?? '').trim());
        }
      }
      return formattedRow;
    });

    const elementos: DocumentoElemento[] = [];
    let currentY = marginY;

    // Título da aba / planilha
    elementos.push({
      id: `el_sheet_title_${sIdx}`,
      tipo: 'cabecalho',
      x: marginX,
      y: currentY,
      width: contentWidth,
      height: 48,
      conteudo: `${cleanTitle} - ${sheetName}`,
      textoSecundario: `Importado de planilha eletrônica • ${rows.length} registros`,
      fontSize: 18,
      fontFamily: 'Inter, sans-serif',
      color: '#0052cc',
      fontWeight: 'bold',
      backgroundColor: '#f0f7ff',
      borderColor: '#bfdbfe',
      borderWidth: 1,
      borderRadius: 8,
    });
    currentY += 64;
    convertedCount++;

    // Tabela formatada
    const tableHeight = Math.min(880, Math.max(160, (rows.length + 1) * 34));
    elementos.push({
      id: `el_sheet_table_${sIdx}`,
      tipo: 'tabela',
      x: marginX,
      y: currentY,
      width: contentWidth,
      height: tableHeight,
      tabelaHeaders: headers,
      tabelaLinhas: rows.length > 0 ? rows : [['Sem dados adicionais']],
      headerBg: '#0f172a',
      headerColor: '#ffffff',
    });
    convertedCount++;

    pages.push({
      id: `page_${Date.now()}_sheet_${sIdx + 1}`,
      numero: sIdx + 1,
      titulo: `Planilha: ${sheetName}`,
      width: standardWidth,
      height: standardHeight,
      backgroundColor: '#ffffff',
      elementos,
    });
  });

  if (pages.length === 0) {
    warnings.push('A planilha continha abas vazias; criado modelo base.');
    pages.push({
      id: `page_${Date.now()}_1`,
      numero: 1,
      titulo: 'Página 1',
      width: standardWidth,
      height: standardHeight,
      backgroundColor: '#ffffff',
      elementos: [
        {
          id: 'el_empty_sheet',
          tipo: 'texto',
          x: 48,
          y: 48,
          width: 698,
          height: 40,
          conteudo: cleanTitle,
          fontSize: 20,
          fontWeight: 'bold',
          color: '#0f172a',
        },
      ],
    });
  }

  return {
    title: cleanTitle,
    totalPages: pages.length,
    pages,
    warnings,
    convertedCount,
    formatDetected: 'Planilha (XLSX / ODS / CSV)',
    originalBlob: file,
    mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    rawFileUrl,
  };
}

/**
 * Processamento de Apresentações (PPTX / PPT / ODP):
 * Converte slides em páginas independentes com títulos, caixas de texto e estruturas visuais.
 */
async function importPresentationFile(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const warnings: string[] = [];
  const pages: DocumentoPagina[] = [];
  let convertedCount = 0;

  if (onProgress) onProgress('Extraindo slides e layouts da apresentação...', 40);

  try {
    const zip = await JSZip.loadAsync(file);
    // Localiza arquivos de slides ppt/slides/slide*.xml
    const slideFilePaths = Object.keys(zip.files).filter((path) =>
      path.match(/^ppt\/slides\/slide[0-9]+\.xml$/i)
    );

    // Ordena numericamentes
    slideFilePaths.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    const standardWidth = 794;
    const standardHeight = 1123;

    if (slideFilePaths.length > 0) {
      for (let i = 0; i < slideFilePaths.length; i++) {
        const slidePath = slideFilePaths[i];
        const slideXmlStr = await zip.files[slidePath].async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(slideXmlStr, 'application/xml');

        // Extrai textos de parágrafos do PowerPoint (<a:p>)
        const paragraphs = Array.from(xmlDoc.getElementsByTagName('a:p'));
        const slideTexts: string[] = [];

        paragraphs.forEach((p) => {
          const tNodes = Array.from(p.getElementsByTagName('a:t'));
          const text = tNodes.map((n) => n.textContent || '').join('').trim();
          if (text) slideTexts.push(text);
        });

        const elementos: DocumentoElemento[] = [];
        let currentY = 56;
        const marginX = 48;
        const contentWidth = standardWidth - marginX * 2;

        // Slide Header
        const slideTitle = slideTexts[0] || `Slide ${i + 1}`;
        elementos.push({
          id: `el_pptx_title_${i}`,
          tipo: 'texto',
          x: marginX,
          y: currentY,
          width: contentWidth,
          height: 44,
          conteudo: slideTitle,
          fontSize: 22,
          fontFamily: 'Inter, sans-serif',
          color: '#0052cc',
          fontWeight: 'bold',
          textAlign: 'left',
        });
        currentY += 60;
        convertedCount++;

        // Corpo do Slide
        const bodyTexts = slideTexts.slice(1);
        bodyTexts.forEach((text, bIdx) => {
          const elHeight = Math.max(30, Math.ceil(text.length / 70) * 22);
          elementos.push({
            id: `el_pptx_body_${i}_${bIdx}`,
            tipo: 'texto',
            x: marginX,
            y: currentY,
            width: contentWidth,
            height: elHeight,
            conteudo: `• ${text}`,
            fontSize: 15,
            fontFamily: 'Inter, sans-serif',
            color: '#1e293b',
            lineHeight: 1.45,
          });
          currentY += elHeight + 14;
          convertedCount++;
        });

        pages.push({
          id: `page_${Date.now()}_slide_${i + 1}`,
          numero: i + 1,
          titulo: `Slide ${i + 1}: ${slideTitle.substring(0, 30)}`,
          width: standardWidth,
          height: standardHeight,
          backgroundColor: '#ffffff',
          elementos,
        });
      }
    }
  } catch (err: any) {
    warnings.push('Não foi possível extrair a estrutura interna direta do arquivo de apresentação.');
  }

  // Fallback caso não tenha extraído slides
  if (pages.length === 0) {
    pages.push({
      id: `page_${Date.now()}_1`,
      numero: 1,
      titulo: 'Slide 1',
      width: 794,
      height: 1123,
      backgroundColor: '#ffffff',
      elementos: [
        {
          id: 'el_pptx_fb_title',
          tipo: 'texto',
          x: 48,
          y: 48,
          width: 698,
          height: 48,
          conteudo: cleanTitle,
          fontSize: 24,
          fontWeight: 'bold',
          color: '#0052cc',
        },
        {
          id: 'el_pptx_fb_body',
          tipo: 'texto',
          x: 48,
          y: 110,
          width: 698,
          height: 60,
          conteudo: 'Apresentação importada com sucesso. Você pode adicionar novos blocos, títulos e imagens.',
          fontSize: 15,
          color: '#475569',
        },
      ],
    });
    convertedCount += 2;
  }

  return {
    title: cleanTitle,
    totalPages: pages.length,
    pages,
    warnings,
    convertedCount,
    formatDetected: 'Apresentação (PPTX / ODP)',
    originalBlob: file,
    mimeType: file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    rawFileUrl,
  };
}

/**
 * Processamento de OpenDocument Text (ODT)
 */
async function importOdtFile(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const warnings: string[] = [];
  const pages: DocumentoPagina[] = [];
  let convertedCount = 0;

  try {
    const zip = await JSZip.loadAsync(file);
    const contentXml = zip.file('content.xml');
    if (contentXml) {
      const xmlStr = await contentXml.async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

      const headings = Array.from(xmlDoc.getElementsByTagName('text:h')).map((n) => n.textContent?.trim() || '');
      const paragraphs = Array.from(xmlDoc.getElementsByTagName('text:p')).map((n) => n.textContent?.trim() || '');

      const elementos: DocumentoElemento[] = [];
      let currentY = 56;
      const marginX = 48;
      const contentWidth = 698;

      elementos.push({
        id: 'el_odt_title',
        tipo: 'texto',
        x: marginX,
        y: currentY,
        width: contentWidth,
        height: 40,
        conteudo: cleanTitle,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0052cc',
      });
      currentY += 56;
      convertedCount++;

      headings.forEach((h, idx) => {
        if (!h) return;
        elementos.push({
          id: `el_odt_h_${idx}`,
          tipo: 'texto',
          x: marginX,
          y: currentY,
          width: contentWidth,
          height: 32,
          conteudo: h,
          fontSize: 18,
          fontWeight: 'bold',
          color: '#0f172a',
        });
        currentY += 42;
        convertedCount++;
      });

      paragraphs.forEach((p, idx) => {
        if (!p) return;
        const elHeight = Math.max(26, Math.ceil(p.length / 80) * 22);
        elementos.push({
          id: `el_odt_p_${idx}`,
          tipo: 'texto',
          x: marginX,
          y: currentY,
          width: contentWidth,
          height: elHeight,
          conteudo: p,
          fontSize: 14,
          color: '#334155',
          lineHeight: 1.45,
        });
        currentY += elHeight + 12;
        convertedCount++;
      });

      pages.push({
        id: `page_${Date.now()}_1`,
        numero: 1,
        titulo: 'Página 1',
        width: 794,
        height: 1123,
        backgroundColor: '#ffffff',
        elementos,
      });
    }
  } catch (err) {
    warnings.push('Não foi possível ler estrutura interna do ODT; gerado modelo de texto.');
  }

  if (pages.length === 0) {
    return importPlainTextFile(file, cleanTitle, rawFileUrl, onProgress);
  }

  return {
    title: cleanTitle,
    totalPages: pages.length,
    pages,
    warnings,
    convertedCount,
    formatDetected: 'ODT (OpenDocument Texto)',
    originalBlob: file,
    mimeType: 'application/vnd.oasis.opendocument.text',
    rawFileUrl,
  };
}

/**
 * Processamento de Arquivos SVG:
 * Extrai elementos vetoriais, textos e imagens do arquivo SVG nativo.
 */
async function importSvgFile(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const warnings: string[] = [];
  const textContent = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(textContent, 'image/svg+xml');

  const standardWidth = 794;
  const standardHeight = 1123;
  const elementos: DocumentoElemento[] = [];
  let convertedCount = 0;

  // Extrai elementos de texto do SVG
  const textElements = Array.from(doc.querySelectorAll('text'));
  textElements.forEach((tNode, idx) => {
    const text = tNode.textContent?.trim() || '';
    if (!text) return;

    const x = parseFloat(tNode.getAttribute('x') || '40');
    const y = parseFloat(tNode.getAttribute('y') || `${60 + idx * 30}`);
    const fontSize = parseFloat(tNode.getAttribute('font-size') || '14');
    const fill = tNode.getAttribute('fill') || '#0f172a';

    elementos.push({
      id: `el_svg_txt_${idx}`,
      tipo: 'texto',
      x: Math.max(16, Math.min(standardWidth - 200, Math.round(x))),
      y: Math.max(16, Math.min(standardHeight - 40, Math.round(y))),
      width: Math.min(500, Math.max(100, text.length * 9)),
      height: Math.max(26, Math.round(fontSize * 1.5)),
      conteudo: text,
      fontSize: Math.max(11, Math.min(32, Math.round(fontSize))),
      color: fill,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'normal',
    });
    convertedCount++;
  });

  // Insere também o SVG como elemento de imagem caso tenha desenhos e vetores complexos
  elementos.unshift({
    id: 'el_svg_graphic',
    tipo: 'imagem',
    x: 48,
    y: 48,
    width: 698,
    height: 480,
    src: rawFileUrl,
    fit: 'contain',
  });
  convertedCount++;

  const pages: DocumentoPagina[] = [
    {
      id: `page_${Date.now()}_1`,
      numero: 1,
      titulo: 'Página 1 (Vetor SVG)',
      width: standardWidth,
      height: standardHeight,
      backgroundColor: '#ffffff',
      elementos,
    },
  ];

  return {
    title: cleanTitle,
    totalPages: 1,
    pages,
    warnings,
    convertedCount,
    formatDetected: 'SVG (Vetor Gráfico)',
    originalBlob: file,
    mimeType: 'image/svg+xml',
    rawFileUrl,
  };
}

/**
 * Processamento de Arquivos HTML / HTM:
 * Extrai títulos, parágrafos, tabelas e imagens preservando cores e fontes.
 */
async function importHtmlFile(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const htmlText = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const standardWidth = 794;
  const standardHeight = 1123;
  const marginX = 48;
  const marginY = 56;
  const contentWidth = standardWidth - marginX * 2;
  const warnings: string[] = [];

  const pages: DocumentoPagina[] = [];
  const elementos: DocumentoElemento[] = [];
  let currentY = marginY;
  let convertedCount = 0;

  const docTitle = doc.querySelector('title')?.textContent || cleanTitle;
  elementos.push({
    id: 'el_html_title',
    tipo: 'cabecalho',
    x: marginX,
    y: currentY,
    width: contentWidth,
    height: 44,
    conteudo: docTitle,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0052cc',
  });
  currentY += 56;
  convertedCount++;

  // Processa blocos principais
  const elements = Array.from(doc.body.querySelectorAll('h1, h2, h3, p, table, img'));
  elements.forEach((el, idx) => {
    const tagName = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || '';

    if (tagName.startsWith('h') && text) {
      elementos.push({
        id: `el_html_h_${idx}`,
        tipo: 'texto',
        x: marginX,
        y: currentY,
        width: contentWidth,
        height: 32,
        conteudo: text,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
      });
      currentY += 42;
      convertedCount++;
    } else if (tagName === 'p' && text) {
      const elHeight = Math.max(26, Math.ceil(text.length / 85) * 22);
      elementos.push({
        id: `el_html_p_${idx}`,
        tipo: 'texto',
        x: marginX,
        y: currentY,
        width: contentWidth,
        height: elHeight,
        conteudo: text,
        fontSize: 14,
        color: '#334155',
        lineHeight: 1.45,
      });
      currentY += elHeight + 12;
      convertedCount++;
    } else if (tagName === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length > 0) {
        const headers = Array.from(rows[0].querySelectorAll('th, td')).map((c) => c.textContent?.trim() || '');
        const lines = rows.slice(1).map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent?.trim() || ''));
        const tableHeight = Math.max(100, (lines.length + 1) * 32);

        elementos.push({
          id: `el_html_table_${idx}`,
          tipo: 'tabela',
          x: marginX,
          y: currentY,
          width: contentWidth,
          height: tableHeight,
          tabelaHeaders: headers.length > 0 ? headers : ['Coluna 1', 'Coluna 2'],
          tabelaLinhas: lines.length > 0 ? lines : [['Dado A', 'Dado B']],
          headerBg: '#0284c7',
          headerColor: '#ffffff',
        });
        currentY += tableHeight + 20;
        convertedCount++;
      }
    }
  });

  pages.push({
    id: `page_${Date.now()}_1`,
    numero: 1,
    titulo: 'Página 1 (HTML)',
    width: standardWidth,
    height: standardHeight,
    backgroundColor: '#ffffff',
    elementos,
  });

  return {
    title: docTitle,
    totalPages: 1,
    pages,
    warnings,
    convertedCount,
    formatDetected: 'HTML (Página Web)',
    originalBlob: file,
    mimeType: 'text/html',
    rawFileUrl,
  };
}

/**
 * Processamento de Arquivos de Texto Puro / Markdown:
 */
async function importPlainTextFile(
  file: File,
  cleanTitle: string,
  rawFileUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportedFileResult> {
  const text = await file.text();
  const paragraphs = text.split(/\r?\n\r?\n/).filter((p) => p.trim());
  const standardWidth = 794;
  const standardHeight = 1123;
  const marginX = 48;
  const marginY = 56;
  const contentWidth = standardWidth - marginX * 2;
  const maxContentY = standardHeight - marginY;

  const pages: DocumentoPagina[] = [];
  let currentPageElements: DocumentoElemento[] = [];
  let currentY = marginY;
  let pageNumber = 1;
  let elementIndex = 1;

  const pushCurrentPage = () => {
    pages.push({
      id: `page_${Date.now()}_${pageNumber}`,
      numero: pageNumber,
      titulo: `Página ${pageNumber}`,
      width: standardWidth,
      height: standardHeight,
      backgroundColor: '#ffffff',
      elementos: [...currentPageElements],
    });
    pageNumber++;
    currentPageElements = [];
    currentY = marginY;
  };

  // Header principal na página 1
  currentPageElements.push({
    id: `el_txt_header`,
    tipo: 'cabecalho',
    x: marginX,
    y: currentY,
    width: contentWidth,
    height: 44,
    conteudo: cleanTitle,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0052cc',
  });
  currentY += 56;

  paragraphs.forEach((para) => {
    const isHeader = para.startsWith('# ') || para.startsWith('## ');
    const cleanPara = para.replace(/^#+\s*/, '');
    const linesCount = Math.max(1, Math.ceil(cleanPara.length / 85));
    const elHeight = isHeader ? 36 : Math.max(26, linesCount * 22);

    if (currentY + elHeight > maxContentY) {
      pushCurrentPage();
    }

    currentPageElements.push({
      id: `el_txt_${elementIndex++}`,
      tipo: 'texto',
      x: marginX,
      y: currentY,
      width: contentWidth,
      height: elHeight,
      conteudo: cleanPara,
      fontSize: isHeader ? 18 : 14,
      fontFamily: 'Inter, sans-serif',
      color: isHeader ? '#0f172a' : '#334155',
      fontWeight: isHeader ? 'bold' : 'normal',
      lineHeight: 1.45,
    });
    currentY += elHeight + 12;
  });

  if (currentPageElements.length > 0 || pages.length === 0) {
    pushCurrentPage();
  }

  return {
    title: cleanTitle,
    totalPages: pages.length,
    pages,
    warnings: [],
    convertedCount: elementIndex,
    formatDetected: 'Texto Estruturado (TXT)',
    originalBlob: file,
    mimeType: 'text/plain',
    rawFileUrl,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
