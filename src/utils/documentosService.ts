import {
  DocumentoCategoria,
  DocumentoItem,
  DocumentoPagina,
  DocumentoElemento,
  DocumentoVersao,
  CatalogoItem,
  DocumentoEnvio,
  ClientRecord,
} from '../types';
import { getInitialTabelaRevendaDoc } from '../data/tabelaRevendaModel';
import { getInitialTermoAutorizacaoPagamentoDoc } from '../data/termoAutorizacaoPagamentoModel';
import {
  saveWholeCollectionToSupabase,
  saveItemToSupabase,
  deleteItemFromSupabase,
  dispatchCollectionEvents,
  getSupabaseClient,
} from './supabaseClient';
import {
  persistPdfFile,
  deletePdfFile,
  getPdfDataUrl,
} from './pdfStorageService';

export const STORAGE_CATEGORIAS_KEY = 'fenix_documentos_categorias';
export const STORAGE_DOCUMENTOS_KEY = 'fenix_documentos_items';
export const STORAGE_CATALOGOS_KEY = 'fenix_catalogos_items';
export const STORAGE_ENVIOS_KEY = 'fenix_documentos_envios';
export const STORAGE_DELETED_CATEGORIAS_KEY = 'fenix_deleted_categorias';
export const STORAGE_DELETED_CATALOGOS_KEY = 'fenix_deleted_catalogos';

/**
 * Formatos de arquivos aceitos em Catálogos e Documentos:
 * PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX e TXT.
 * Preservando formato original sem conversão.
 */
export const ACCEPTED_DOCUMENT_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
export const ACCEPTED_DOCUMENT_MIMES =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain';

export function getFileFormatLabel(fileName?: string, mimeType?: string): string {
  if (fileName) {
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    if (extMatch) {
      return extMatch[1].toUpperCase();
    }
  }
  if (mimeType) {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('msword')) return 'DOCX';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLSX';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPTX';
    if (mimeType.includes('text/plain')) return 'TXT';
  }
  return 'PDF';
}

/**
 * Categorias Iniciais: Nenhuma categoria é fixa/hardcoded.
 * Todas as categorias são 100% dinâmicas e gerenciadas diretamente no Supabase.
 */
export const INITIAL_CATALOGO_CATEGORIAS: { nome: string; cor: string }[] = [];
export const INITIAL_DOCUMENTO_CATEGORIAS: { nome: string; cor: string }[] = [];

/**
 * 11 Campos Automáticos do CRM
 */
export interface CrmFieldDefinition {
  tag: string;
  label: string;
  key: string;
  description: string;
  example: string;
}

export const CRM_FIELDS: CrmFieldDefinition[] = [
  { tag: '{cliente_nome}', label: 'Cliente', key: 'cliente_nome', description: 'Nome completo ou Razão Social do cliente', example: 'Construtora Splendor Ltda' },
  { tag: '{cliente_cpf_cnpj}', label: 'CPF/CNPJ', key: 'cliente_cpf_cnpj', description: 'Número do documento CPF ou CNPJ', example: '12.345.678/0001-90' },
  { tag: '{cliente_telefone}', label: 'Telefone', key: 'cliente_telefone', description: 'Telefone ou WhatsApp de contato', example: '(11) 98765-4321' },
  { tag: '{cliente_email}', label: 'E-mail', key: 'cliente_email', description: 'E-mail cadastrado do cliente', example: 'compras@splendor.com.br' },
  { tag: '{cliente_endereco}', label: 'Endereço', key: 'cliente_endereco', description: 'Logradouro, número, bairro e cidade', example: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP' },
  { tag: '{pedido}', label: 'Pedido', key: 'pedido', description: 'Número do pedido ou orçamento vinculado', example: '#2620' },
  { tag: '{data}', label: 'Data', key: 'data', description: 'Data atual por extenso ou formatada', example: new Date().toLocaleDateString('pt-BR') },
  { tag: '{empresa}', label: 'Empresa', key: 'empresa', description: 'Razão social oficial da Fênix World', example: 'Fênix World Distribuidora' },
  { tag: '{responsavel}', label: 'Responsável', key: 'responsavel', description: 'Vendedor ou responsável pelo atendimento', example: 'Vanessa Gomes' },
  { tag: '{produto}', label: 'Produto', key: 'produto', description: 'Produto, piso, insumo ou serviço principal', example: 'Piso Vinílico Flexfloor 3mm Colado' },
  { tag: '{instalador}', label: 'Instalador', key: 'instalador', description: 'Nome do instalador ou equipe técnica', example: 'Equipe Alpha Montagens' },
];

export interface CrmResolveContext {
  client?: ClientRecord | null;
  pedido?: string;
  produto?: string;
  instalador?: string;
  responsavel?: string;
  empresa?: string;
  data?: string;
}

export function resolveCrmTags(text: string, context?: CrmResolveContext): string {
  if (!text) return '';
  const client = context?.client;
  const now = new Date();
  const dataFormatada = context?.data || now.toLocaleDateString('pt-BR');
  const empresaOficial = context?.empresa || 'Fênix World Distribuidora';
  const responsavelOficial = context?.responsavel || client?.responsavel || client?.vendedorId || 'Consultor Comercial Fênix';

  const enderecoParts = [
    client?.street,
    client?.number ? `nº ${client.number}` : '',
    client?.neighborhood,
    client?.city ? `${client.city}${client.state ? `/${client.state}` : ''}` : '',
  ].filter(Boolean);
  const enderecoCompleto = enderecoParts.length > 0 ? enderecoParts.join(', ') : (client?.address || '');

  const map: Record<string, string> = {
    '{cliente_nome}': client?.name || '',
    '{cliente_cpf_cnpj}': client?.document || '',
    '{cliente_telefone}': client?.whatsapp || '',
    '{cliente_email}': client?.email || '',
    '{cliente_endereco}': enderecoCompleto,
    '{pedido}': context?.pedido || '',
    '{data}': dataFormatada,
    '{empresa}': empresaOficial,
    '{responsavel}': responsavelOficial,
    '{produto}': context?.produto || 'Piso Vinílico Fênix World',
    '{instalador}': context?.instalador || 'Equipe Especializada Fênix',
  };

  let resolved = text;
  for (const [tag, val] of Object.entries(map)) {
    if (resolved.includes(tag)) {
      resolved = resolved.split(tag).join(val);
    }
  }
  return resolved;
}

export function resolveElementCrmTags(el: DocumentoElemento, context?: CrmResolveContext): DocumentoElemento {
  if (el.tipo === 'texto' || el.tipo === 'campo_crm') {
    return {
      ...el,
      conteudo: resolveCrmTags(el.conteudo || '', context),
    };
  }
  if (el.tipo === 'cabecalho' || el.tipo === 'rodape') {
    return {
      ...el,
      conteudo: resolveCrmTags(el.conteudo || '', context),
      textoSecundario: resolveCrmTags(el.textoSecundario || '', context),
    };
  }
  if (el.tipo === 'tabela' && el.tabelaLinhas) {
    const resolvedRows = el.tabelaLinhas.map((row) =>
      row.map((cell) => resolveCrmTags(cell || '', context))
    );
    const resolvedHeaders = el.tabelaHeaders?.map((h) => resolveCrmTags(h || '', context));
    return {
      ...el,
      tabelaHeaders: resolvedHeaders,
      tabelaLinhas: resolvedRows,
    };
  }
  return el;
}

// ==========================================
// ESTADO EM MEMÓRIA (FONTE OFICIAL 100% SUPABASE)
// ==========================================
let inMemoryCategorias: DocumentoCategoria[] = [];
let inMemoryCatalogos: CatalogoItem[] = [];
let inMemoryDocumentos: DocumentoItem[] = [];
let inMemoryDeletedCategories: { ids: string[]; names: string[] } = { ids: [], names: [] };
let inMemoryDeletedCatalogos: string[] = [];
let inMemoryDeletedDocIds: string[] = [];

// ==========================================
// CATEGORIAS (100% DINÂMICAS, INDEPENDENTES E NO SUPABASE)
// ==========================================

export function getDocumentosCategorias(): DocumentoCategoria[] {
  return inMemoryCategorias;
}

export function getCatalogoCategorias(): DocumentoCategoria[] {
  return inMemoryCategorias.filter((c) => c.tipo === 'catalogo');
}

export function getDocumentoCategoriasOnly(): DocumentoCategoria[] {
  return inMemoryCategorias.filter((c) => c.tipo === 'documento');
}

export function getModeloCategorias(): DocumentoCategoria[] {
  return inMemoryCategorias.filter((c) => c.tipo === 'modelo');
}

export async function recordDeletedCategory(id: string, name?: string): Promise<void> {
  const normName = name ? name.trim().toLowerCase() : '';
  if (!inMemoryDeletedCategories.ids.includes(id)) {
    inMemoryDeletedCategories.ids.push(id);
  }
  if (normName && !inMemoryDeletedCategories.names.includes(normName)) {
    inMemoryDeletedCategories.names.push(normName);
  }

  await saveWholeCollectionToSupabase(
    STORAGE_DELETED_CATEGORIAS_KEY,
    inMemoryDeletedCategories,
    'Sistema Fênix'
  );
}

export async function unblockCategory(id: string, name?: string): Promise<void> {
  const normName = name ? name.trim().toLowerCase() : '';
  inMemoryDeletedCategories.ids = inMemoryDeletedCategories.ids.filter((i) => i !== id);
  if (normName) {
    inMemoryDeletedCategories.names = inMemoryDeletedCategories.names.filter((n) => n !== normName);
  }

  await saveWholeCollectionToSupabase(
    STORAGE_DELETED_CATEGORIAS_KEY,
    inMemoryDeletedCategories,
    'Sistema Fênix'
  );
}

/**
 * Consulta as categorias diretamente do Supabase e atualiza o estado em memória.
 * Nenhuma categoria é fixa/hardcoded. Categoria excluída nunca reaparece.
 */
export async function fetchDocumentosCategoriasFromDatabase(): Promise<DocumentoCategoria[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Carrega lista de categorias deletadas do Supabase
      const { data: delRow } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', STORAGE_DELETED_CATEGORIAS_KEY)
        .maybeSingle();

      const deletedIds = new Set<string>();
      const deletedNames = new Set<string>();

      if (delRow && delRow.data) {
        if (Array.isArray(delRow.data.ids)) {
          delRow.data.ids.forEach((i: string) => deletedIds.add(i));
        }
        if (Array.isArray(delRow.data.names)) {
          delRow.data.names.forEach((n: string) => deletedNames.add(n.toLowerCase()));
        }
      }
      inMemoryDeletedCategories = {
        ids: Array.from(deletedIds),
        names: Array.from(deletedNames),
      };

      // 2. Carrega categorias ativas do Supabase
      const { data, error } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', STORAGE_CATEGORIAS_KEY)
        .maybeSingle();

      if (!error && data && Array.isArray(data.data)) {
        const list = (data.data as DocumentoCategoria[]).filter(
          (c) => !deletedIds.has(c.id) && !deletedNames.has(c.nome.trim().toLowerCase())
        );

        inMemoryCategorias = list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        return inMemoryCategorias;
      }
    } catch (err) {
      console.warn('Erro ao carregar categorias do Supabase:', err);
    }
  }
  return inMemoryCategorias;
}

export async function saveDocumentoCategoriaAsync(
  data: Partial<DocumentoCategoria>,
  userName = 'Usuário Fênix'
): Promise<DocumentoCategoria> {
  const current = inMemoryCategorias;
  const targetTipo = data.tipo || 'catalogo';

  const existingIndex = current.findIndex(
    (c) =>
      (data.id && c.id === data.id) ||
      (data.nome &&
        c.nome.trim().toLowerCase() === data.nome.trim().toLowerCase() &&
        c.tipo === targetTipo)
  );

  const now = new Date().toISOString();
  let savedItem: DocumentoCategoria;
  let updatedList: DocumentoCategoria[];

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    const oldName = existing.nome;
    savedItem = {
      ...existing,
      ...data,
      id: existing.id,
      tipo: targetTipo,
      updatedAt: now,
    };
    updatedList = [...current];
    updatedList[existingIndex] = savedItem;

    if (data.nome && data.nome !== oldName) {
      updateCategoryNameInItems(existing.id, data.nome, userName);
    }
  } else {
    savedItem = {
      id: data.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: (data.nome || 'Nova Categoria').trim(),
      tipo: targetTipo,
      descricao: data.descricao || '',
      ordem: data.ordem ?? current.length,
      cor: data.cor || '#0055ff',
      createdAt: now,
      updatedAt: now,
      criadoPor: userName,
    };
    updatedList = [...current, savedItem];
  }

  inMemoryCategorias = updatedList;
  await saveWholeCollectionToSupabase(STORAGE_CATEGORIAS_KEY, updatedList, userName);
  await unblockCategory(savedItem.id, savedItem.nome);
  dispatchCollectionEvents(STORAGE_CATEGORIAS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_categorias_updated'));

  return savedItem;
}

export function saveDocumentoCategoria(
  data: Partial<DocumentoCategoria>,
  userName = 'Usuário Fênix'
): DocumentoCategoria {
  saveDocumentoCategoriaAsync(data, userName).catch(() => {});
  const current = inMemoryCategorias;
  return current.find((c) => c.id === data.id) || {
    id: data.id || `cat_${Date.now()}`,
    nome: (data.nome || '').trim(),
    tipo: data.tipo || 'catalogo',
    createdAt: new Date().toISOString(),
    criadoPor: userName,
  };
}

export async function updateDocumentoCategoriaAsync(
  id: string,
  updates: Partial<DocumentoCategoria>,
  userName = 'Usuário Fênix'
): Promise<DocumentoCategoria | null> {
  const current = inMemoryCategorias;
  const index = current.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const oldName = current[index].nome;
  const updated: DocumentoCategoria = {
    ...current[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updated;
  inMemoryCategorias = [...current];
  await saveWholeCollectionToSupabase(STORAGE_CATEGORIAS_KEY, inMemoryCategorias, userName);
  if (updates.nome) {
    await unblockCategory(id, updates.nome);
  }

  if (updates.nome && updates.nome !== oldName) {
    updateCategoryNameInItems(id, updates.nome, userName);
  }

  dispatchCollectionEvents(STORAGE_CATEGORIAS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_categorias_updated'));
  return updated;
}

export function updateDocumentoCategoria(
  id: string,
  updates: Partial<DocumentoCategoria>,
  userName = 'Usuário Fênix'
): DocumentoCategoria | null {
  updateDocumentoCategoriaAsync(id, updates, userName).catch(() => {});
  const current = inMemoryCategorias;
  const item = current.find((c) => c.id === id);
  return item ? { ...item, ...updates } : null;
}

/**
 * Retorna contagem de uso da categoria em Catálogos, Documentos e Modelos
 */
export function getCategoryUsage(categoryId: string): {
  catalogosCount: number;
  documentosCount: number;
  modelosCount: number;
  totalCount: number;
} {
  const cats = inMemoryCatalogos.filter((c) => c.categoriaId === categoryId);
  const docs = inMemoryDocumentos.filter((d) => d.categoriaId === categoryId && !d.isModelo);
  const mods = inMemoryDocumentos.filter((d) => d.categoriaId === categoryId && Boolean(d.isModelo));
  return {
    catalogosCount: cats.length,
    documentosCount: docs.length,
    modelosCount: mods.length,
    totalCount: cats.length + docs.length + mods.length,
  };
}

/**
 * Transfere todos os arquivos de uma categoria excluída para uma nova categoria e exclui a antiga.
 */
export async function transferCategoryItemsAndDelete(
  oldCategoryId: string,
  newCategoryId: string,
  newCategoryName: string,
  userName = 'Usuário Fênix'
): Promise<boolean> {
  // 1. Atualizar Catálogos
  let catsChanged = false;
  const updatedCats = inMemoryCatalogos.map((c) => {
    if (c.categoriaId === oldCategoryId) {
      catsChanged = true;
      return {
        ...c,
        categoriaId: newCategoryId,
        categoriaNome: newCategoryName,
        updatedAt: new Date().toISOString(),
      };
    }
    return c;
  });

  if (catsChanged) {
    inMemoryCatalogos = updatedCats;
    await saveWholeCollectionToSupabase(STORAGE_CATALOGOS_KEY, updatedCats, userName);
    window.dispatchEvent(new Event('fenix_catalogos_items_updated'));
  }

  // 2. Atualizar Documentos e Modelos
  let docsChanged = false;
  const updatedDocs = inMemoryDocumentos.map((d) => {
    if (d.categoriaId === oldCategoryId) {
      docsChanged = true;
      return {
        ...d,
        categoriaId: newCategoryId,
        categoriaNome: newCategoryName,
        updatedAt: new Date().toISOString(),
      };
    }
    return d;
  });

  if (docsChanged) {
    inMemoryDocumentos = updatedDocs;
    await saveWholeCollectionToSupabase(STORAGE_DOCUMENTOS_KEY, updatedDocs, userName);
    window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  }

  // 3. Excluir a categoria antiga permanentemente no Supabase
  await deleteDocumentoCategoriaAsync(oldCategoryId, userName);
  return true;
}

export async function deleteDocumentoCategoriaAsync(
  id: string,
  userName = 'Usuário Fênix'
): Promise<boolean> {
  const current = inMemoryCategorias;
  const targetCat = current.find((c) => c.id === id);
  const filtered = current.filter((c) => c.id !== id);
  if (filtered.length === current.length) return false;

  // Registra no Supabase para bloquear permanentemente qualquer ressurreição
  await recordDeletedCategory(id, targetCat?.nome);

  inMemoryCategorias = filtered;
  await saveWholeCollectionToSupabase(STORAGE_CATEGORIAS_KEY, filtered, userName);
  dispatchCollectionEvents(STORAGE_CATEGORIAS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_categorias_updated'));
  return true;
}

export function deleteDocumentoCategoria(id: string, userName = 'Usuário Fênix'): boolean {
  deleteDocumentoCategoriaAsync(id, userName).catch(() => {});
  inMemoryCategorias = inMemoryCategorias.filter((c) => c.id !== id);
  dispatchCollectionEvents(STORAGE_CATEGORIAS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_categorias_updated'));
  return true;
}

function updateCategoryNameInItems(categoriaId: string, novoNome: string, userName: string) {
  // Documentos e Modelos
  let docsChanged = false;
  const updatedDocs = inMemoryDocumentos.map((doc) => {
    if (doc.categoriaId === categoriaId) {
      docsChanged = true;
      return { ...doc, categoriaNome: novoNome, updatedAt: new Date().toISOString() };
    }
    return doc;
  });
  if (docsChanged) {
    inMemoryDocumentos = updatedDocs;
    saveWholeCollectionToSupabase(STORAGE_DOCUMENTOS_KEY, updatedDocs, userName).catch(() => {});
    window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  }

  // Catálogos
  let catsChanged = false;
  const updatedCats = inMemoryCatalogos.map((item) => {
    if (item.categoriaId === categoriaId) {
      catsChanged = true;
      return { ...item, categoriaNome: novoNome, updatedAt: new Date().toISOString() };
    }
    return item;
  });
  if (catsChanged) {
    inMemoryCatalogos = updatedCats;
    saveWholeCollectionToSupabase(STORAGE_CATALOGOS_KEY, updatedCats, userName).catch(() => {});
    window.dispatchEvent(new Event('fenix_catalogos_items_updated'));
  }
}

// ==========================================
// CATÁLOGOS (100% PERSISTENTE NO SUPABASE)
// ==========================================

export function getDeletedCatalogoIds(): string[] {
  return inMemoryDeletedCatalogos;
}

export async function recordDeletedCatalogoId(id: string): Promise<void> {
  if (!inMemoryDeletedCatalogos.includes(id)) {
    inMemoryDeletedCatalogos.push(id);
    await saveWholeCollectionToSupabase(STORAGE_DELETED_CATALOGOS_KEY, inMemoryDeletedCatalogos, 'Sistema Fênix');
  }
}

export async function unblockCatalogoId(id: string): Promise<void> {
  if (inMemoryDeletedCatalogos.includes(id)) {
    inMemoryDeletedCatalogos = inMemoryDeletedCatalogos.filter((i) => i !== id);
    await saveWholeCollectionToSupabase(STORAGE_DELETED_CATALOGOS_KEY, inMemoryDeletedCatalogos, 'Sistema Fênix');
  }
}

export function getCatalogos(): CatalogoItem[] {
  const deleted = new Set(inMemoryDeletedCatalogos);
  return inMemoryCatalogos.filter((c) => !deleted.has(c.id));
}

/**
 * Consulta a lista completa de catálogos do Supabase diretamente.
 */
export async function fetchCatalogosFromDatabase(): Promise<CatalogoItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Carrega lista de IDs de catálogos deletados do Supabase
      const { data: delRow } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', STORAGE_DELETED_CATALOGOS_KEY)
        .maybeSingle();

      const deletedIds = new Set<string>(inMemoryDeletedCatalogos);
      if (delRow && Array.isArray(delRow.data)) {
        delRow.data.forEach((dId: string) => deletedIds.add(dId));
      }
      inMemoryDeletedCatalogos = Array.from(deletedIds);

      // 2. Carrega lista de catálogos ativos
      const { data, error } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', STORAGE_CATALOGOS_KEY)
        .maybeSingle();

      if (!error && data && Array.isArray(data.data)) {
        inMemoryCatalogos = (data.data as CatalogoItem[]).filter((c) => !deletedIds.has(c.id));
        return inMemoryCatalogos;
      }
    } catch (err) {
      console.warn('Erro ao carregar catálogos do Supabase:', err);
    }
  }
  return inMemoryCatalogos;
}

/**
 * Salva um catálogo de forma 100% persistente no Supabase (Database + Storage).
 * FLUXO OBRIGATÓRIO: Nome → Categoria → Selecionar Arquivo → Upload completo → Salvar arquivo no Storage e Database → Salvar registro no Supabase → Atualizar lista.
 */
export async function saveCatalogoAsync(
  data: Partial<CatalogoItem>,
  fileOrDataUrl?: File | Blob | string,
  userName = 'Usuário Fênix',
  onProgress?: (progress: { currentChunk: number; totalChunks: number; percent: number }) => void
): Promise<{ success: boolean; item?: CatalogoItem; error?: string }> {
  try {
    const current = inMemoryCatalogos;
    const now = new Date().toISOString();
    const id = data.id || `cat_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isEdit = Boolean(data.id && current.some((c) => c.id === data.id));
    const existing = isEdit ? current.find((c) => c.id === id) : null;

    let sizeFormatted = data.tamanhoArquivo || existing?.tamanhoArquivo || '';
    let publicUrl = data.publicUrl || existing?.publicUrl || existing?.arquivoUrl || '';

    // 1. Upload e salvamento real do arquivo no Supabase Storage e Database
    if (fileOrDataUrl) {
      const fileRes = await persistPdfFile(
        id,
        fileOrDataUrl,
        data.nomeArquivo || existing?.nomeArquivo || 'catalogo.pdf',
        userName,
        undefined,
        onProgress
      );

      if (!fileRes.success) {
        return {
          success: false,
          error: fileRes.error || 'Erro ao persistir o arquivo no Supabase.',
        };
      }
      sizeFormatted = fileRes.sizeFormatted;
      if (fileRes.publicUrl) {
        publicUrl = fileRes.publicUrl;
      }
    }

    // 2. Registro do catálogo com link real gerado no Supabase
    const savedItem: CatalogoItem = {
      id,
      titulo: (data.titulo || existing?.titulo || 'Novo Catálogo').trim(),
      categoriaId: data.categoriaId || existing?.categoriaId || '',
      categoriaNome: data.categoriaNome || existing?.categoriaNome || 'Geral',
      descricao: data.descricao ?? existing?.descricao ?? '',
      nomeArquivo: data.nomeArquivo || existing?.nomeArquivo || 'catalogo.pdf',
      arquivoUrl: publicUrl || data.arquivoUrl || existing?.arquivoUrl || '',
      publicUrl: publicUrl || data.publicUrl || existing?.publicUrl || '',
      tamanhoArquivo: sizeFormatted,
      tipoArquivo: data.tipoArquivo || existing?.tipoArquivo || 'application/pdf',
      totalPaginas: data.totalPaginas || existing?.totalPaginas || 1,
      capaUrl: data.capaUrl || existing?.capaUrl || '',
      fileStorageKey: `fenix_file_${id}`,
      isFavorite: data.isFavorite !== undefined ? Boolean(data.isFavorite) : Boolean(existing?.isFavorite),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      criadoPor: existing?.criadoPor || userName,
    };

    // 3. Salvar registro diretamente no Supabase fenix_kv_store
    const result = await saveItemToSupabase(STORAGE_CATALOGOS_KEY, savedItem, 'id', userName);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Erro ao registrar catálogo no Supabase. Tente novamente.',
      };
    }

    // Desbloqueia ID caso tenha sido deletado anteriormente
    await unblockCatalogoId(id);

    // 4. Atualizar lista em memória imediatamente para reatividade instantânea
    const updated = isEdit
      ? current.map((c) => (c.id === id ? savedItem : c))
      : [savedItem, ...current.filter((c) => c.id !== id)];

    inMemoryCatalogos = updated;
    dispatchCollectionEvents(STORAGE_CATALOGOS_KEY);
    window.dispatchEvent(new Event('fenix_catalogos_items_updated'));
    window.dispatchEvent(new Event('fenix_documentos_updated'));

    return { success: true, item: savedItem };
  } catch (err: any) {
    console.error('Exceção ao salvar catálogo:', err);
    return {
      success: false,
      error: err?.message || 'Falha ao salvar catálogo. Verifique sua conexão e tente novamente.',
    };
  }
}

export function saveCatalogo(
  data: Partial<CatalogoItem>,
  userName = 'Usuário Fênix'
): CatalogoItem {
  saveCatalogoAsync(data, undefined, userName).catch(() => {});
  const current = inMemoryCatalogos;
  return current.find((c) => c.id === data.id) || {
    id: data.id || `cat_item_${Date.now()}`,
    titulo: data.titulo || 'Novo Catálogo',
    categoriaId: data.categoriaId || '',
    categoriaNome: data.categoriaNome || 'Geral',
    createdAt: new Date().toISOString(),
    criadoPor: userName,
  };
}

export async function updateCatalogoAsync(
  id: string,
  updates: Partial<CatalogoItem>,
  userName = 'Usuário Fênix'
): Promise<CatalogoItem | null> {
  const current = inMemoryCatalogos;
  const target = current.find((c) => c.id === id);
  if (!target) return null;

  const updated: CatalogoItem = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const res = await saveItemToSupabase(STORAGE_CATALOGOS_KEY, updated, 'id', userName);
  if (!res.success) return null;

  inMemoryCatalogos = current.map((c) => (c.id === id ? updated : c));
  dispatchCollectionEvents(STORAGE_CATALOGOS_KEY);
  window.dispatchEvent(new Event('fenix_catalogos_items_updated'));

  return updated;
}

export function updateCatalogo(
  id: string,
  updates: Partial<CatalogoItem>,
  userName = 'Usuário Fênix'
): CatalogoItem | null {
  updateCatalogoAsync(id, updates, userName).catch(() => {});
  const current = inMemoryCatalogos;
  const target = current.find((c) => c.id === id);
  return target ? { ...target, ...updates } : null;
}

export async function deleteCatalogoAsync(id: string, userName = 'Usuário Fênix'): Promise<boolean> {
  // Registra exclusão permanente no Supabase para nunca ressuscitar
  await recordDeletedCatalogoId(id);
  // Remove registro do Supabase
  const res = await deleteItemFromSupabase(STORAGE_CATALOGOS_KEY, id, 'id', userName);
  // Remove arquivo associado do Supabase Storage e database chunks
  await deletePdfFile(id);

  inMemoryCatalogos = inMemoryCatalogos.filter((c) => c.id !== id);
  dispatchCollectionEvents(STORAGE_CATALOGOS_KEY);
  window.dispatchEvent(new Event('fenix_catalogos_items_updated'));

  return res.success;
}

export function deleteCatalogo(id: string, userName = 'Usuário Fênix'): boolean {
  deleteCatalogoAsync(id, userName).catch(() => {});
  inMemoryCatalogos = inMemoryCatalogos.filter((c) => c.id !== id);
  dispatchCollectionEvents(STORAGE_CATALOGOS_KEY);
  window.dispatchEvent(new Event('fenix_catalogos_items_updated'));
  return true;
}

export async function duplicateCatalogoAsync(id: string, userName = 'Usuário Fênix'): Promise<CatalogoItem | null> {
  const current = inMemoryCatalogos;
  const target = current.find((c) => c.id === id);
  if (!target) return null;

  const newId = `cat_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Copia o arquivo binário para o novo ID se existir
  const originalDataUrl = await getPdfDataUrl(id);
  if (originalDataUrl) {
    await persistPdfFile(newId, originalDataUrl, target.nomeArquivo || 'catalogo.pdf', userName);
  }

  const copy: CatalogoItem = {
    ...target,
    id: newId,
    titulo: `${target.titulo} (Cópia)`,
    fileStorageKey: `fenix_file_${newId}`,
    createdAt: now,
    updatedAt: now,
    criadoPor: userName,
  };

  const res = await saveItemToSupabase(STORAGE_CATALOGOS_KEY, copy, 'id', userName);
  if (!res.success) return null;

  inMemoryCatalogos = [copy, ...current];
  dispatchCollectionEvents(STORAGE_CATALOGOS_KEY);
  window.dispatchEvent(new Event('fenix_catalogos_items_updated'));

  return copy;
}

export function duplicateCatalogo(id: string, userName = 'Usuário Fênix'): CatalogoItem | null {
  duplicateCatalogoAsync(id, userName).catch(() => {});
  return null;
}

export async function toggleCatalogoFavorite(id: string, userName = 'Usuário Fênix'): Promise<CatalogoItem | null> {
  const current = inMemoryCatalogos;
  const target = current.find((c) => c.id === id);
  if (!target) return null;

  const updated: CatalogoItem = {
    ...target,
    isFavorite: !target.isFavorite,
    updatedAt: new Date().toISOString(),
  };

  await saveItemToSupabase(STORAGE_CATALOGOS_KEY, updated, 'id', userName);
  inMemoryCatalogos = current.map((c) => (c.id === id ? updated : c));
  dispatchCollectionEvents(STORAGE_CATALOGOS_KEY);
  window.dispatchEvent(new Event('fenix_catalogos_items_updated'));

  return updated;
}

export async function renameCatalogo(id: string, newTitle: string, userName = 'Usuário Fênix'): Promise<CatalogoItem | null> {
  const clean = newTitle.trim();
  if (!clean) return null;
  return updateCatalogoAsync(id, { titulo: clean }, userName);
}

export async function changeCatalogoCategoria(
  id: string,
  newCategoriaId: string,
  newCategoriaNome: string,
  userName = 'Usuário Fênix'
): Promise<CatalogoItem | null> {
  return updateCatalogoAsync(id, { categoriaId: newCategoriaId, categoriaNome: newCategoriaNome }, userName);
}

// ==========================================
// DOCUMENTOS E MODELOS (100% PERSISTENTE NO SUPABASE)
// ==========================================

const STORAGE_DELETED_DOCS_KEY = 'fenix_deleted_documento_ids';

function getDeletedDocIds(): string[] {
  return inMemoryDeletedDocIds;
}

async function recordDeletedDocId(id: string): Promise<void> {
  if (!inMemoryDeletedDocIds.includes(id)) {
    inMemoryDeletedDocIds.push(id);
    await saveWholeCollectionToSupabase(STORAGE_DELETED_DOCS_KEY, inMemoryDeletedDocIds, 'Sistema Fênix');
  }
}

export async function unblockDocId(id: string): Promise<void> {
  if (inMemoryDeletedDocIds.includes(id)) {
    inMemoryDeletedDocIds = inMemoryDeletedDocIds.filter((i) => i !== id);
    await saveWholeCollectionToSupabase(STORAGE_DELETED_DOCS_KEY, inMemoryDeletedDocIds, 'Sistema Fênix');
  }
}

export function injectDefaultModelos(list: DocumentoItem[]): DocumentoItem[] {
  const deleted = new Set(inMemoryDeletedDocIds);
  const result = [...list];

  const tabela = getInitialTabelaRevendaDoc();
  if (!deleted.has(tabela.id) && !result.some((d) => d.id === tabela.id)) {
    result.unshift(tabela);
  }

  const termo = getInitialTermoAutorizacaoPagamentoDoc();
  if (!deleted.has(termo.id) && !result.some((d) => d.id === termo.id)) {
    result.unshift(termo);
  }

  return result;
}

export function getDocumentos(): DocumentoItem[] {
  const deleted = new Set(inMemoryDeletedDocIds);
  const active = inMemoryDocumentos.filter((d) => !deleted.has(d.id));
  return injectDefaultModelos(active);
}

/**
 * Consulta a lista completa de documentos e modelos do Supabase diretamente.
 */
export async function fetchDocumentosFromDatabase(): Promise<DocumentoItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Carrega lista de IDs deletados
      const { data: delData } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', STORAGE_DELETED_DOCS_KEY)
        .maybeSingle();

      const deletedIds = new Set<string>(inMemoryDeletedDocIds);
      if (delData && Array.isArray(delData.data)) {
        (delData.data as string[]).forEach((id) => deletedIds.add(id));
      }
      inMemoryDeletedDocIds = Array.from(deletedIds);

      // 2. Carrega lista de documentos e modelos ativos
      const { data, error } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', STORAGE_DOCUMENTOS_KEY)
        .maybeSingle();

      if (!error && data && Array.isArray(data.data)) {
        inMemoryDocumentos = (data.data as DocumentoItem[]).filter((d) => !deletedIds.has(d.id));
        return injectDefaultModelos(inMemoryDocumentos);
      }
    } catch (err) {
      console.warn('Erro ao carregar documentos do Supabase:', err);
    }
  }
  return injectDefaultModelos(inMemoryDocumentos);
}

export function getDocumentoById(id: string): DocumentoItem | null {
  const list = getDocumentos();
  return list.find((d) => d.id === id) || null;
}

export function createBlankPage(numero = 1): DocumentoPagina {
  return {
    id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    numero,
    titulo: `Página ${numero}`,
    backgroundColor: '#ffffff',
    elementos: [],
  };
}

export function createBlankDocumento(
  categoriaId = '',
  categoriaNome = 'Geral',
  userName = 'Usuário Fênix',
  isModelo = false
): DocumentoItem {
  const now = new Date().toISOString();
  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    titulo: isModelo ? 'Novo Modelo' : 'Novo Documento',
    categoriaId,
    categoriaNome,
    isModelo,
    paginas: [createBlankPage(1)],
    versoes: [],
    createdAt: now,
    updatedAt: now,
    criadoPor: userName,
  };
}

/**
 * Salva um documento ou modelo de forma 100% persistente no Supabase (Database + Storage).
 */
export async function saveDocumentoAsync(
  doc: Partial<DocumentoItem>,
  fileOrDataUrl?: File | Blob | string,
  userName = 'Usuário Fênix',
  options?: { createVersion?: boolean; versionDesc?: string; onProgress?: (progress: { currentChunk: number; totalChunks: number; percent: number }) => void }
): Promise<{ success: boolean; item?: DocumentoItem; error?: string }> {
  try {
    const current = inMemoryDocumentos;
    const now = new Date();
    const nowIso = now.toISOString();
    const id = doc.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isEdit = Boolean(doc.id && current.some((d) => d.id === doc.id));
    const existing = isEdit ? current.find((d) => d.id === id) : null;

    let sizeFormatted = doc.tamanhoArquivo || existing?.tamanhoArquivo || '';
    let publicUrl = doc.publicUrl || existing?.publicUrl || existing?.arquivoUrl || '';

    // 1. Upload do arquivo para o Supabase Storage e Database
    if (fileOrDataUrl) {
      const fileRes = await persistPdfFile(
        id,
        fileOrDataUrl,
        doc.nomeArquivoOriginal || existing?.nomeArquivoOriginal || 'documento.pdf',
        userName,
        undefined,
        options?.onProgress
      );
      if (!fileRes.success) {
        return {
          success: false,
          error: fileRes.error || 'Erro ao persistir PDF no Supabase.',
        };
      }
      sizeFormatted = fileRes.sizeFormatted;
      if (fileRes.publicUrl) {
        publicUrl = fileRes.publicUrl;
      }
    }

    // 2. Histórico de versões
    const versoes = [...(existing?.versoes || [])];
    if (options?.createVersion && existing?.paginas && existing.paginas.length > 0) {
      const novaVersao: DocumentoVersao = {
        id: `v_${Date.now()}`,
        data: now.toLocaleDateString('pt-BR'),
        hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        usuario: userName,
        descricao: options.versionDesc || `Versão salva em ${now.toLocaleDateString('pt-BR')}`,
        paginas: JSON.parse(JSON.stringify(existing.paginas)),
      };
      versoes.unshift(novaVersao);
      if (versoes.length > 20) versoes.pop();
    }

    // 3. Montagem do item de documento
    const savedItem: DocumentoItem = {
      id,
      titulo: (doc.titulo || existing?.titulo || 'Novo Documento').trim(),
      categoriaId: doc.categoriaId || existing?.categoriaId || '',
      categoriaNome: doc.categoriaNome || existing?.categoriaNome || 'Geral',
      descricao: doc.descricao ?? existing?.descricao ?? '',
      isModelo: doc.isModelo !== undefined ? Boolean(doc.isModelo) : Boolean(existing?.isModelo),
      isFavorite: doc.isFavorite !== undefined ? Boolean(doc.isFavorite) : Boolean(existing?.isFavorite),
      isPdfImportado: doc.isPdfImportado !== undefined ? Boolean(doc.isPdfImportado) : Boolean(existing?.isPdfImportado),
      nomeArquivoOriginal: doc.nomeArquivoOriginal || existing?.nomeArquivoOriginal,
      arquivoUrl: publicUrl || doc.arquivoUrl || existing?.arquivoUrl || '',
      publicUrl: publicUrl || doc.publicUrl || existing?.publicUrl || '',
      fileStorageKey: `fenix_file_${id}`,
      tamanhoArquivo: sizeFormatted,
      tipoArquivo: doc.tipoArquivo || existing?.tipoArquivo || 'application/pdf',
      totalPaginas: doc.totalPaginas || existing?.totalPaginas || (doc.paginas?.length || 1),
      capaUrl: doc.capaUrl || existing?.capaUrl,
      paginas: doc.paginas && doc.paginas.length > 0 ? doc.paginas : (existing?.paginas || [createBlankPage(1)]),
      versoes,
      camposModelo: doc.camposModelo !== undefined ? doc.camposModelo : (existing?.camposModelo || []),
      modeloOrigemId: doc.modeloOrigemId || existing?.modeloOrigemId,
      valoresPreenchidos: doc.valoresPreenchidos !== undefined ? doc.valoresPreenchidos : existing?.valoresPreenchidos,
      assinaturaNormalDataUrl: doc.assinaturaNormalDataUrl || existing?.assinaturaNormalDataUrl,
      assinaturaGovBrInfo: doc.assinaturaGovBrInfo || existing?.assinaturaGovBrInfo,
      clienteVinculadoId: doc.clienteVinculadoId || existing?.clienteVinculadoId,
      clienteNome: doc.clienteNome || existing?.clienteNome,
      pedidoVinculado: doc.pedidoVinculado || existing?.pedidoVinculado,
      mes: doc.mes || existing?.mes,
      ano: doc.ano || existing?.ano,
      isTabelaComercial: doc.isTabelaComercial !== undefined ? doc.isTabelaComercial : existing?.isTabelaComercial,
      tipoTabela: doc.tipoTabela || existing?.tipoTabela,
      tabelaProdutosData: doc.tabelaProdutosData !== undefined ? doc.tabelaProdutosData : existing?.tabelaProdutosData,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
      criadoPor: existing?.criadoPor || userName,
    };

    // 4. Salvar registro diretamente no Supabase fenix_kv_store
    const result = await saveItemToSupabase(STORAGE_DOCUMENTOS_KEY, savedItem, 'id', userName);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Falha ao salvar documento no Supabase.',
      };
    }

    // Desbloqueia ID caso tenha sido deletado anteriormente
    await unblockDocId(id);

    // 5. Atualizar lista em memória imediatamente para reatividade instantânea
    const updated = isEdit
      ? current.map((d) => (d.id === id ? savedItem : d))
      : [savedItem, ...current.filter((d) => d.id !== id)];

    inMemoryDocumentos = updated;
    dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
    window.dispatchEvent(new Event('fenix_documentos_items_updated'));
    window.dispatchEvent(new Event('fenix_documentos_updated'));

    return { success: true, item: savedItem };
  } catch (err: any) {
    console.error('Exceção ao salvar documento:', err);
    return {
      success: false,
      error: err?.message || 'Falha ao salvar documento. Tente novamente.',
    };
  }
}

export function saveDocumento(
  doc: Partial<DocumentoItem>,
  userName = 'Usuário Fênix',
  options?: { createVersion?: boolean; versionDesc?: string }
): DocumentoItem {
  saveDocumentoAsync(doc, undefined, userName, options).catch(() => {});
  const current = inMemoryDocumentos;
  return current.find((d) => d.id === doc.id) || {
    id: doc.id || `doc_${Date.now()}`,
    titulo: doc.titulo || 'Novo Documento',
    categoriaId: doc.categoriaId || '',
    categoriaNome: doc.categoriaNome || 'Geral',
    isModelo: Boolean(doc.isModelo),
    paginas: [createBlankPage(1)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    criadoPor: userName,
  };
}

export async function deleteDocumentoAsync(id: string, userName = 'Usuário Fênix'): Promise<boolean> {
  await recordDeletedDocId(id);
  const res = await deleteItemFromSupabase(STORAGE_DOCUMENTOS_KEY, id, 'id', userName);
  await deletePdfFile(id);

  inMemoryDocumentos = inMemoryDocumentos.filter((d) => d.id !== id);
  dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  window.dispatchEvent(new Event('fenix_documentos_updated'));

  return res.success;
}

export function deleteDocumento(id: string, userName = 'Usuário Fênix'): boolean {
  deleteDocumentoAsync(id, userName).catch(() => {});
  inMemoryDocumentos = inMemoryDocumentos.filter((d) => d.id !== id);
  dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  window.dispatchEvent(new Event('fenix_documentos_updated'));
  return true;
}

export async function duplicateDocumentoAsync(id: string, userName = 'Usuário Fênix'): Promise<DocumentoItem | null> {
  const current = inMemoryDocumentos;
  const target = current.find((d) => d.id === id);
  if (!target) return null;

  const newId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Copia arquivo se existir
  const originalDataUrl = await getPdfDataUrl(id);
  if (originalDataUrl) {
    await persistPdfFile(newId, originalDataUrl, target.nomeArquivoOriginal || 'documento.pdf', userName);
  }

  const copy: DocumentoItem = {
    ...target,
    id: newId,
    titulo: `${target.titulo} (Cópia)`,
    fileStorageKey: `fenix_file_${newId}`,
    tabelaProdutosData: target.tabelaProdutosData
      ? JSON.parse(JSON.stringify(target.tabelaProdutosData))
      : undefined,
    camposModelo: target.camposModelo
      ? JSON.parse(JSON.stringify(target.camposModelo))
      : [],
    paginas: target.paginas.map((p, idx) => ({
      ...p,
      id: `page_${Date.now()}_${idx}`,
      elementos: p.elementos.map((el, elIdx) => ({
        ...el,
        id: `el_${Date.now()}_${idx}_${elIdx}`,
      })),
    })),
    versoes: [],
    createdAt: now,
    updatedAt: now,
    criadoPor: userName,
  };

  const res = await saveItemToSupabase(STORAGE_DOCUMENTOS_KEY, copy, 'id', userName);
  if (!res.success) return null;

  inMemoryDocumentos = [copy, ...current];
  dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  window.dispatchEvent(new Event('fenix_documentos_updated'));

  return copy;
}

export function duplicateDocumento(id: string, userName = 'Usuário Fênix'): DocumentoItem | null {
  duplicateDocumentoAsync(id, userName).catch(() => {});
  return null;
}

export async function toggleDocumentoFavorite(id: string, userName = 'Usuário Fênix'): Promise<DocumentoItem | null> {
  const current = inMemoryDocumentos;
  const target = current.find((d) => d.id === id);
  if (!target) return null;

  const updated: DocumentoItem = {
    ...target,
    isFavorite: !target.isFavorite,
    updatedAt: new Date().toISOString(),
  };

  await saveItemToSupabase(STORAGE_DOCUMENTOS_KEY, updated, 'id', userName);
  inMemoryDocumentos = current.map((d) => (d.id === id ? updated : d));
  dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  window.dispatchEvent(new Event('fenix_documentos_updated'));

  return updated;
}

export async function renameDocumentoAsync(id: string, newTitle: string, userName = 'Usuário Fênix'): Promise<DocumentoItem | null> {
  const clean = newTitle.trim();
  if (!clean) return null;
  const current = inMemoryDocumentos;
  const target = current.find((d) => d.id === id);
  if (!target) return null;

  const updated = { ...target, titulo: clean, updatedAt: new Date().toISOString() };
  await saveItemToSupabase(STORAGE_DOCUMENTOS_KEY, updated, 'id', userName);
  inMemoryDocumentos = current.map((d) => (d.id === id ? updated : d));
  dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  window.dispatchEvent(new Event('fenix_documentos_updated'));

  return updated;
}

export function renameDocumento(id: string, newTitle: string, userName = 'Usuário Fênix'): DocumentoItem | null {
  renameDocumentoAsync(id, newTitle, userName).catch(() => {});
  const current = inMemoryDocumentos;
  const target = current.find((d) => d.id === id);
  return target ? { ...target, titulo: newTitle } : null;
}

export async function changeDocumentoCategoriaAsync(
  id: string,
  newCategoriaId: string,
  newCategoriaNome: string,
  userName = 'Usuário Fênix'
): Promise<DocumentoItem | null> {
  const current = inMemoryDocumentos;
  const target = current.find((d) => d.id === id);
  if (!target) return null;

  const updated = { ...target, categoriaId: newCategoriaId, categoriaNome: newCategoriaNome, updatedAt: new Date().toISOString() };
  await saveItemToSupabase(STORAGE_DOCUMENTOS_KEY, updated, 'id', userName);
  inMemoryDocumentos = current.map((d) => (d.id === id ? updated : d));
  dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
  window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  window.dispatchEvent(new Event('fenix_documentos_updated'));

  return updated;
}

export function restoreDocumentoVersao(
  docId: string,
  versaoId: string,
  userName = 'Usuário Fênix'
): DocumentoItem | null {
  const current = getDocumentos();
  const target = current.find((d) => d.id === docId);
  if (!target || !target.versoes) return null;

  const versao = target.versoes.find((v) => v.id === versaoId);
  if (!versao) return null;

  const now = new Date();
  const backupVersao: DocumentoVersao = {
    id: `v_${Date.now()}`,
    data: now.toLocaleDateString('pt-BR'),
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    usuario: userName,
    descricao: `Estado anterior antes de restaurar versão de ${versao.data} ${versao.hora}`,
    paginas: JSON.parse(JSON.stringify(target.paginas)),
  };

  target.paginas = JSON.parse(JSON.stringify(versao.paginas));
  target.versoes = [backupVersao, ...target.versoes];
  target.updatedAt = now.toISOString();

  inMemoryDocumentos = current.map((d) => (d.id === docId ? target : d));
  dispatchCollectionEvents(STORAGE_DOCUMENTOS_KEY);
  saveWholeCollectionToSupabase(STORAGE_DOCUMENTOS_KEY, inMemoryDocumentos, userName).catch(() => {});
  window.dispatchEvent(new Event('fenix_documentos_items_updated'));
  window.dispatchEvent(new Event('fenix_documentos_updated'));
  return target;
}

// ==========================================
// HISTÓRICO DE ENVIOS (100% SUPABASE)
// ==========================================
let inMemoryEnvios: DocumentoEnvio[] = [];

export function getDocumentosEnvios(): DocumentoEnvio[] {
  return inMemoryEnvios;
}

export async function fetchDocumentosEnviosFromDatabase(): Promise<DocumentoEnvio[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', STORAGE_ENVIOS_KEY)
        .maybeSingle();

      if (!error && data && Array.isArray(data.data)) {
        inMemoryEnvios = data.data as DocumentoEnvio[];
        return inMemoryEnvios;
      }
    } catch (err) {
      console.warn('Erro ao carregar envios do Supabase:', err);
    }
  }
  return inMemoryEnvios;
}

export async function registerDocumentoEnvioAsync(
  envio: Omit<DocumentoEnvio, 'id' | 'data' | 'hora' | 'usuario'> & { usuario?: string },
  userName = 'Usuário Fênix'
): Promise<DocumentoEnvio> {
  const current = inMemoryEnvios;
  const now = new Date();
  const novoEnvio: DocumentoEnvio = {
    id: `envio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...envio,
    data: now.toISOString().split('T')[0],
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    usuario: userName,
    status: envio.status || 'Enviado',
  };

  const updated = [novoEnvio, ...current];
  inMemoryEnvios = updated;
  dispatchCollectionEvents(STORAGE_ENVIOS_KEY);
  await saveWholeCollectionToSupabase(STORAGE_ENVIOS_KEY, updated, userName);
  return novoEnvio;
}

export function registerDocumentoEnvio(
  envio: Omit<DocumentoEnvio, 'id' | 'data' | 'hora' | 'usuario'> & { usuario?: string },
  userName = 'Usuário Fênix'
): DocumentoEnvio {
  const current = inMemoryEnvios;
  const now = new Date();
  const novoEnvio: DocumentoEnvio = {
    id: `envio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...envio,
    data: now.toISOString().split('T')[0],
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    usuario: userName,
    status: envio.status || 'Enviado',
  };

  const updated = [novoEnvio, ...current];
  inMemoryEnvios = updated;
  dispatchCollectionEvents(STORAGE_ENVIOS_KEY);
  saveWholeCollectionToSupabase(STORAGE_ENVIOS_KEY, updated, userName).catch(() => {});
  return novoEnvio;
}

export async function deleteDocumentoEnvioAsync(id: string, userName = 'Usuário Fênix'): Promise<boolean> {
  const current = inMemoryEnvios;
  const filtered = current.filter((e) => e.id !== id);
  if (filtered.length === current.length) return false;

  inMemoryEnvios = filtered;
  dispatchCollectionEvents(STORAGE_ENVIOS_KEY);
  await saveWholeCollectionToSupabase(STORAGE_ENVIOS_KEY, filtered, userName);
  return true;
}

export function deleteDocumentoEnvio(id: string, userName = 'Usuário Fênix'): boolean {
  deleteDocumentoEnvioAsync(id, userName).catch(() => {});
  inMemoryEnvios = inMemoryEnvios.filter((e) => e.id !== id);
  dispatchCollectionEvents(STORAGE_ENVIOS_KEY);
  return true;
}
