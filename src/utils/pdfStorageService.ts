import { getSupabaseClient, getSupabaseUrl } from './supabaseClient';
import {
  setFileInIndexedDb,
  getFileFromIndexedDb,
  deleteFileFromIndexedDb,
} from './indexedDbService';

const CHUNK_SIZE = 1.5 * 1024 * 1024; // 1.5MB por chunk para dados em banco
const MAX_DB_CHUNK_FILE_SIZE = 100 * 1024 * 1024; // Suporta até 100MB com particionamento redundante no Supabase fenix_kv_store

export interface SavePdfProgress {
  currentChunk: number;
  totalChunks: number;
  percent: number;
}

export interface SavePdfResult {
  success: boolean;
  fileKey: string;
  dataUrl?: string;
  publicUrl?: string;
  sizeFormatted: string;
  bucket?: string;
  storagePath?: string;
  error?: string;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB';
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'odt':
      return 'application/vnd.oasis.opendocument.text';
    case 'ods':
      return 'application/vnd.oasis.opendocument.spreadsheet';
    case 'odp':
      return 'application/vnd.oasis.opendocument.presentation';
    case 'svg':
      return 'image/svg+xml';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'application/octet-stream';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo original'));
    reader.readAsDataURL(file);
  });
}

/**
 * Salva o arquivo no Supabase Storage e depois registra no Supabase Database.
 * Suporta arquivos grandes sem estourar limites de payload JSON do PostgREST.
 */
export async function persistPdfFile(
  fileId: string,
  fileOrDataUrl: File | Blob | string,
  fileName: string,
  userName = 'Usuário Fênix',
  customMimeType?: string,
  onProgress?: (progress: SavePdfProgress) => void
): Promise<SavePdfResult> {
  try {
    let dataUrl = '';
    let byteLength = 0;
    let mimeType = customMimeType || getMimeTypeFromFileName(fileName);
    let blob: Blob;

    if (typeof fileOrDataUrl === 'string') {
      dataUrl = fileOrDataUrl;
      blob = dataUrlToBlob(dataUrl);
      byteLength = blob.size;
      if (!customMimeType && dataUrl.startsWith('data:')) {
        const extracted = dataUrl.substring(5, dataUrl.indexOf(';'));
        if (extracted) mimeType = extracted;
      }
    } else {
      blob = fileOrDataUrl;
      byteLength = fileOrDataUrl.size;
      if (fileOrDataUrl.type) {
        mimeType = fileOrDataUrl.type;
      }
    }

    const formattedSize = formatBytes(byteLength);
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase não inicializado. Verifique a conexão com o banco de dados.');
    }

    const mainKey = `fenix_file_${fileId}`;
    const now = new Date().toISOString();

    // 1. Armazena imediatamente no IndexedDB local para acesso instantâneo sem recarregar da rede
    if (!dataUrl) {
      dataUrl = await fileToDataUrl(blob);
    }
    try {
      await setFileInIndexedDb({
        id: fileId,
        fileName,
        mimeType,
        dataUrl,
        size: byteLength,
        savedAt: now,
      });
    } catch (idbErr) {
      console.warn('Cache local IndexedDB não disponível:', idbErr);
    }

    // 2. Determina bucket e caminhos no Supabase Storage
    const isCat = fileName.toLowerCase().includes('cat') || fileId.includes('cat');
    const primaryBucket = isCat ? 'catalogos' : 'documentos';
    const candidateBuckets = [primaryBucket, isCat ? 'documentos' : 'catalogos', 'modelos'];

    const sanitizedFileName = (fileName || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${fileId}/${sanitizedFileName}`;

    let uploadedBucket = '';
    let publicUrl = '';
    let storageUploadSuccess = false;
    let storageErrorMsg = '';

    if (onProgress) {
      onProgress({ currentChunk: 1, totalChunks: 3, percent: 15 });
    }

    // Consulta se os buckets já existem no Supabase Storage
    let availableBuckets: string[] = [];
    try {
      const { data: bList, error: bListErr } = await client.storage.listBuckets();
      if (!bListErr && Array.isArray(bList)) {
        availableBuckets = bList.map((b) => b.name);
      }
    } catch {
      // Ignora erro ao listar
    }

    // Se houver buckets disponíveis, tenta upload no bucket correspondente
    const bucketToTry = availableBuckets.length > 0
      ? candidateBuckets.find((b) => availableBuckets.includes(b))
      : primaryBucket;

    // Apenas tenta upload via Storage se o bucket existir ou se não foi possível listar
    if (bucketToTry && (availableBuckets.length === 0 || availableBuckets.includes(bucketToTry))) {
      try {
        const { data: uploadData, error: upErr } = await client.storage
          .from(bucketToTry)
          .upload(storagePath, blob, {
            contentType: mimeType,
            upsert: true,
          });

        if (!upErr && uploadData) {
          uploadedBucket = bucketToTry;
          storageUploadSuccess = true;

          const { data: pubData } = client.storage.from(bucketToTry).getPublicUrl(storagePath);
          if (pubData && pubData.publicUrl) {
            publicUrl = pubData.publicUrl;
          }
        } else if (upErr) {
          storageErrorMsg = upErr.message;
        }
      } catch (err: any) {
        storageErrorMsg = err?.message || 'Erro no storage';
      }
    } else {
      storageErrorMsg = `Bucket "${primaryBucket}" ainda não criado no Supabase Storage.`;
    }

    if (!publicUrl && storageUploadSuccess && uploadedBucket) {
      const baseUrl = getSupabaseUrl();
      publicUrl = `${baseUrl}/storage/v1/object/public/${uploadedBucket}/${storagePath}`;
    }

    if (onProgress) {
      onProgress({ currentChunk: 2, totalChunks: 3, percent: 50 });
    }

    // Helper com retry para gravar registro no banco Supabase
    const upsertWithRetry = async (row: any, maxAttempts = 4): Promise<void> => {
      let lastError: any = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const { error } = await client
            .from('fenix_kv_store')
            .upsert(row, { onConflict: 'key' });
          if (!error) return;
          lastError = error;
        } catch (e: any) {
          lastError = e;
        }
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 500));
        }
      }
      throw lastError || new Error('Falha ao gravar registro no banco de dados do Supabase.');
    };

    // 3. Gravação do registro no Supabase Database
    // Se o arquivo foi enviado com sucesso para o Storage, salvamos os metadados e URL oficial sem estourar limites JSON
    if (storageUploadSuccess && publicUrl) {
      const fileRecord = {
        id: fileId,
        fileName,
        mimeType,
        size: byteLength,
        publicUrl,
        storagePath,
        bucket: uploadedBucket,
        // Guarda dataUrl apenas se o arquivo for pequeno (< 600KB) para preview offline ultrarrápido
        dataUrl: byteLength < 600 * 1024 ? dataUrl : undefined,
        isStorageBacked: true,
        savedAt: now,
      };

      try {
        await upsertWithRetry({
          key: mainKey,
          data: fileRecord,
          updated_at: now,
          updated_by: userName,
        });
      } catch (dbErr: any) {
        throw new Error(`Arquivo salvo no Storage, mas falhou ao vincular registro no Database: ${dbErr?.message || dbErr}`);
      }

      if (onProgress) {
        onProgress({ currentChunk: 3, totalChunks: 3, percent: 100 });
      }

      return {
        success: true,
        fileKey: mainKey,
        dataUrl: dataUrl || publicUrl,
        publicUrl,
        bucket: uploadedBucket,
        storagePath,
        sizeFormatted: formattedSize,
      };
    }

    // 4. Fallback transparente: Para arquivos de qualquer tamanho até 100MB quando os buckets do Storage
    // ainda não foram criados no Supabase, particionamos os dados em chunks seguros no banco fenix_kv_store
    if (byteLength <= MAX_DB_CHUNK_FILE_SIZE && dataUrl) {
      if (dataUrl.length > CHUNK_SIZE) {
        const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
        const manifest = {
          id: fileId,
          fileName,
          mimeType,
          size: byteLength,
          isChunked: true,
          totalChunks,
          publicUrl: '',
          storagePath: '',
          savedAt: now,
          storageFallbackReason: storageErrorMsg || 'Bucket pendente no Supabase Storage',
        };

        await upsertWithRetry({
          key: mainKey,
          data: manifest,
          updated_at: now,
          updated_by: userName,
        });

        const BATCH_CONCURRENCY = 3;
        for (let i = 0; i < totalChunks; i += BATCH_CONCURRENCY) {
          const batchPromises = [];
          for (let j = i; j < Math.min(i + BATCH_CONCURRENCY, totalChunks); j++) {
            const start = j * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, dataUrl.length);
            const chunkData = dataUrl.substring(start, end);
            const chunkKey = `${mainKey}_c${j}`;
            batchPromises.push(
              upsertWithRetry({
                key: chunkKey,
                data: { index: j, chunk: chunkData },
                updated_at: now,
                updated_by: userName,
              })
            );
          }
          await Promise.all(batchPromises);

          if (onProgress) {
            const completed = Math.min(i + BATCH_CONCURRENCY, totalChunks);
            const percent = Math.min(99, Math.round((completed / totalChunks) * 100));
            onProgress({ currentChunk: completed, totalChunks, percent });
          }
        }
      } else {
        const payload = {
          id: fileId,
          fileName,
          mimeType,
          size: byteLength,
          isChunked: false,
          dataUrl,
          savedAt: now,
          storageFallbackReason: storageErrorMsg || 'Armazenado direto no banco',
        };

        await upsertWithRetry({
          key: mainKey,
          data: payload,
          updated_at: now,
          updated_by: userName,
        });
      }

      if (onProgress) {
        onProgress({ currentChunk: 1, totalChunks: 1, percent: 100 });
      }

      return {
        success: true,
        fileKey: mainKey,
        dataUrl,
        sizeFormatted: formattedSize,
      };
    }

    // Se o arquivo exceder 100MB:
    throw new Error(
      `O arquivo tem ${formattedSize} e excede o limite suportado (100 MB). Comprima o documento ou configure os buckets no SQL Editor do Supabase.`
    );
  } catch (err: any) {
    console.error('Erro na persistência do arquivo:', err);
    return {
      success: false,
      fileKey: `fenix_file_${fileId}`,
      sizeFormatted: '0 KB',
      error: err?.message || 'Falha ao salvar arquivo no Supabase.',
    };
  }
}

/**
 * Retorna o link real e direto do catálogo salvo no Supabase Storage.
 */
export function getCatalogoRealUrl(item: {
  id: string;
  publicUrl?: string;
  arquivoUrl?: string;
  nomeArquivo?: string;
}): string {
  if (item.publicUrl && typeof item.publicUrl === 'string' && item.publicUrl.startsWith('http')) {
    return item.publicUrl;
  }
  if (item.arquivoUrl && typeof item.arquivoUrl === 'string' && item.arquivoUrl.startsWith('http')) {
    return item.arquivoUrl;
  }
  const base = getSupabaseUrl();
  const cleanFileName = item.nomeArquivo ? encodeURIComponent(item.nomeArquivo) : `${item.id}.pdf`;
  return `${base}/storage/v1/object/public/catalogos/${item.id}/${cleanFileName}`;
}

/**
 * Copia o link real do catálogo salvo no Supabase diretamente para a área de transferência.
 */
export async function copyCatalogoWhatsAppLink(item: {
  id: string;
  titulo: string;
  publicUrl?: string;
  arquivoUrl?: string;
  nomeArquivo?: string;
}): Promise<{ success: boolean; url: string; isStorageConfigPending?: boolean; error?: string }> {
  const isDirectStorage = Boolean(
    (item.publicUrl && item.publicUrl.startsWith('http')) ||
    (item.arquivoUrl && item.arquivoUrl.startsWith('http'))
  );
  const url = getCatalogoRealUrl(item);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { success: true, url, isStorageConfigPending: !isDirectStorage };
    }
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      return { success: true, url, isStorageConfigPending: !isDirectStorage };
    }
    return { success: false, url, error: 'Permissão de área de transferência negada.' };
  } catch (err: any) {
    return { success: false, url, error: err?.message || 'Falha ao copiar link.' };
  }
}

/**
 * Recupera o DataURL completo do arquivo por fileId.
 * Verifica IndexedDB primeiro, depois consulta metadados no Supabase e carrega do Storage ou chunks.
 */
export async function getPdfDataUrl(fileId: string): Promise<string | null> {
  if (!fileId) return null;

  // 1. Tenta cache local no IndexedDB
  try {
    const cached = await getFileFromIndexedDb(fileId);
    if (cached && cached.dataUrl) {
      return cached.dataUrl;
    }
  } catch {
    // ignora
  }

  // 2. Busca registro no Supabase
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const mainKey = fileId.startsWith('fenix_file_') ? fileId : `fenix_file_${fileId}`;
    const { data: row, error } = await client
      .from('fenix_kv_store')
      .select('data')
      .eq('key', mainKey)
      .maybeSingle();

    if (error || !row || !row.data) {
      return null;
    }

    const record = row.data;

    // Se tiver dataUrl direto
    if (record.dataUrl && typeof record.dataUrl === 'string') {
      setFileInIndexedDb({
        id: fileId,
        fileName: record.fileName || 'arquivo',
        mimeType: record.mimeType || 'application/pdf',
        dataUrl: record.dataUrl,
        size: record.size || 0,
        savedAt: new Date().toISOString(),
      }).catch(() => {});
      return record.dataUrl;
    }

    // Se estiver no Supabase Storage via publicUrl
    if (record.publicUrl && typeof record.publicUrl === 'string' && record.publicUrl.startsWith('http')) {
      try {
        const resp = await fetch(record.publicUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const dUrl = await fileToDataUrl(blob);
          setFileInIndexedDb({
            id: fileId,
            fileName: record.fileName || 'arquivo',
            mimeType: record.mimeType || blob.type || 'application/pdf',
            dataUrl: dUrl,
            size: blob.size,
            savedAt: new Date().toISOString(),
          }).catch(() => {});
          return dUrl;
        }
      } catch (fetchErr) {
        console.warn('Erro ao baixar arquivo do Supabase Storage URL:', fetchErr);
      }
    }

    // Se estiver fragmentado em chunks no banco
    if (record.isChunked && typeof record.totalChunks === 'number') {
      const totalChunks = record.totalChunks;
      const chunkKeys = Array.from({ length: totalChunks }, (_, i) => `${mainKey}_c${i}`);
      const chunksMap = new Map<number, string>();

      const BATCH_SIZE = 4;
      for (let b = 0; b < chunkKeys.length; b += BATCH_SIZE) {
        const batchKeys = chunkKeys.slice(b, b + BATCH_SIZE);
        const { data, error: bErr } = await client
          .from('fenix_kv_store')
          .select('key, data')
          .in('key', batchKeys);

        if (bErr) {
          console.warn('Erro ao carregar bloco de chunks:', bErr);
        }
        if (data) {
          for (const cr of data) {
            if (cr.data && typeof cr.data.index === 'number' && cr.data.chunk) {
              chunksMap.set(cr.data.index, cr.data.chunk);
            }
          }
        }
      }

      const parts: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const p = chunksMap.get(i);
        if (!p) {
          console.warn(`Parte ${i + 1}/${totalChunks} do arquivo não localizada no Supabase.`);
          return null;
        }
        parts.push(p);
      }
      const fullDataUrl = parts.join('');

      setFileInIndexedDb({
        id: fileId,
        fileName: record.fileName || 'arquivo',
        mimeType: record.mimeType || 'application/pdf',
        dataUrl: fullDataUrl,
        size: record.size || 0,
        savedAt: new Date().toISOString(),
      }).catch(() => {});

      return fullDataUrl;
    }

    return null;
  } catch (err) {
    console.error('Erro ao recuperar arquivo do Supabase:', err);
    return null;
  }
}

/**
 * Retorna um Blob nativo do arquivo
 */
export async function getPdfBlob(fileId: string): Promise<Blob | null> {
  const dataUrl = await getPdfDataUrl(fileId);
  if (!dataUrl) return null;
  try {
    return dataUrlToBlob(dataUrl);
  } catch (e) {
    console.error('Erro ao converter dataUrl para Blob:', e);
    return null;
  }
}

/**
 * Deleta o arquivo do Supabase Storage, Database e IndexedDB
 */
export async function deletePdfFile(fileId: string): Promise<void> {
  if (!fileId) return;
  await deleteFileFromIndexedDb(fileId);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const mainKey = fileId.startsWith('fenix_file_') ? fileId : `fenix_file_${fileId}`;
    const cleanId = fileId.replace(/^fenix_file_/, '');

    // Tenta remover do bucket do Supabase Storage
    try {
      await Promise.allSettled([
        client.storage.from('documentos').remove([`${cleanId}/*`]),
        client.storage.from('catalogos').remove([`${cleanId}/*`]),
        client.storage.from('modelos').remove([`${cleanId}/*`]),
      ]);
    } catch {}

    const { data: row } = await client
      .from('fenix_kv_store')
      .select('data')
      .eq('key', mainKey)
      .maybeSingle();

    if (row?.data?.isChunked && typeof row.data.totalChunks === 'number') {
      const totalChunks = row.data.totalChunks;
      const keysToDelete = [
        mainKey,
        ...Array.from({ length: totalChunks }, (_, i) => `${mainKey}_c${i}`),
      ];
      await client.from('fenix_kv_store').delete().in('key', keysToDelete);
    } else {
      await client.from('fenix_kv_store').delete().eq('key', mainKey);
    }
  } catch (err) {
    console.warn('Erro ao deletar arquivo do Supabase:', err);
  }
}

/**
 * Copia o arquivo PDF nativamente para a área de transferência
 */
export async function copyPdfToClipboard(
  fileId: string,
  _fileName: string
): Promise<{ success: boolean; fallbackNeeded?: boolean; error?: string }> {
  try {
    const blob = await getPdfBlob(fileId);
    if (!blob) {
      return { success: false, error: 'Arquivo não encontrado para cópia.' };
    }

    if (typeof window !== 'undefined' && navigator?.clipboard?.write) {
      try {
        const item = new ClipboardItem({
          [blob.type || 'application/pdf']: blob,
        });
        await navigator.clipboard.write([item]);
        return { success: true };
      } catch {
        return { success: false, fallbackNeeded: true };
      }
    }
    return { success: false, fallbackNeeded: true };
  } catch (err: any) {
    return { success: false, fallbackNeeded: true, error: err?.message };
  }
}

/**
 * Dispara o download direto do arquivo original
 */
export async function downloadPdfFile(fileId: string, fileName: string): Promise<boolean> {
  try {
    const blob = await getPdfBlob(fileId);
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'arquivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch (e) {
    console.error('Erro ao baixar arquivo:', e);
    return false;
  }
}
