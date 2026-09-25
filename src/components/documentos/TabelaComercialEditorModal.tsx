import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  CopyPlus,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Building2,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { DocumentoItem, DocumentoCategoria } from '../../types';
import {
  TabelaLinhaProduto,
  TabelaComercialConfig,
  TabelaPaginaInfo,
  INITIAL_TABELA_CONFIG,
  INITIAL_TABELA_PRODUTOS,
  buildTabelaDocumentoPaginas,
  atualizarPrecosVinculados,
} from '../../data/tabelaRevendaModel';
import { saveDocumentoAsync, deleteDocumentoAsync } from '../../utils/documentosService';
import { sendUserNotification } from '../../utils/notifications';
import { generateTabelaPdf } from '../../utils/tabelaPdfGenerator';
import { TabelaSidebarThumbnails } from './tabela/TabelaSidebarThumbnails';
import { TabelaCanvasPage } from './tabela/TabelaCanvasPage';
import { TabelaPropertiesPanel } from './tabela/TabelaPropertiesPanel';

interface TabelaComercialEditorModalProps {
  isOpen: boolean;
  documento: DocumentoItem | null;
  categorias: DocumentoCategoria[];
  currentUserName: string;
  onClose: () => void;
  onSaved: (savedDoc: DocumentoItem) => void;
}

interface HistorySnapshot {
  config: TabelaComercialConfig;
  produtos: TabelaLinhaProduto[];
  currentPage: number;
}

export const TabelaComercialEditorModal: React.FC<TabelaComercialEditorModalProps> = ({
  isOpen,
  documento,
  categorias,
  currentUserName,
  onClose,
  onSaved,
}) => {
  // Configurações gerais da tabela
  const [config, setConfig] = useState<TabelaComercialConfig>(() => {
    if (documento?.tabelaProdutosData?.config) {
      return {
        ...INITIAL_TABELA_CONFIG,
        ...documento.tabelaProdutosData.config,
        paginasLista:
          documento.tabelaProdutosData.config.paginasLista ||
          INITIAL_TABELA_CONFIG.paginasLista,
      };
    }
    return {
      ...INITIAL_TABELA_CONFIG,
      nome: documento?.titulo || INITIAL_TABELA_CONFIG.nome,
      mes: documento?.mes || INITIAL_TABELA_CONFIG.mes,
      ano: documento?.ano || INITIAL_TABELA_CONFIG.ano,
    };
  });

  // Lista de produtos da tabela
  const [produtos, setProdutos] = useState<TabelaLinhaProduto[]>(() => {
    if (documento?.tabelaProdutosData?.produtos) {
      return documento.tabelaProdutosData.produtos;
    }
    return INITIAL_TABELA_PRODUTOS;
  });

  // Página ativa
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(0.75);

  // Elemento selecionado para o painel lateral
  const [selectedTarget, setSelectedTarget] = useState<
    | { type: 'produto'; id: string }
    | { type: 'cabecalho' }
    | { type: 'tabela' }
    | { type: 'coluna'; coluna: 'marca' | 'descricao' | 'preco' | 'unidade' }
    | { type: 'rodape' }
    | { type: 'capa' }
    | { type: 'capa_elemento'; elemento: 'fundo' | 'logo' | 'titulo' | 'vigencia' | 'subtitulo1' | 'subtitulo2' | 'parceiros' }
    | null
  >(null);

  // Histórico para Desfazer / Refazer
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Estados de Salvamento
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Modal de Salvar como Cópia
  const [isCopiaModalOpen, setIsCopiaModalOpen] = useState(false);
  const [copiaNome, setCopiaNome] = useState('');
  const [copiaTier, setCopiaTier] = useState<'Cliente Final' | 'Construtora' | 'Revenda'>('Revenda');
  const [isCopying, setIsCopying] = useState(false);

  // Modal de Sincronizar CRM
  const [isSyncCrmModalOpen, setIsSyncCrmModalOpen] = useState(false);
  const [selectedSyncTier, setSelectedSyncTier] = useState<
    'Cliente Final' | 'Construtora' | 'Revenda'
  >('Revenda');

  // Estado de Geração de PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Referência da página
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega documento ao abrir
  useEffect(() => {
    if (isOpen && documento) {
      const cfg: TabelaComercialConfig = {
        ...INITIAL_TABELA_CONFIG,
        ...(documento.tabelaProdutosData?.config || {}),
        nome: documento.titulo || 'Tabela de Revenda',
        mes: documento.mes || 'Setembro',
        ano: documento.ano || '2026',
        paginasLista:
          documento.tabelaProdutosData?.config?.paginasLista ||
          INITIAL_TABELA_CONFIG.paginasLista,
      };
      const prods = documento.tabelaProdutosData?.produtos || INITIAL_TABELA_PRODUTOS;
      setConfig(cfg);
      setProdutos(prods);
      setCurrentPage(1);
      setSelectedTarget(null);
      setUndoStack([]);
      setRedoStack([]);
      setSaveStatus('saved');
    }
  }, [isOpen, documento]);

  // Registro de histórico para Desfazer
  const recordHistory = () => {
    setUndoStack((prev) => [
      ...prev.slice(-25),
      {
        config: JSON.parse(JSON.stringify(config)),
        produtos: JSON.parse(JSON.stringify(produtos)),
        currentPage,
      },
    ]);
    setRedoStack([]);
    setSaveStatus('dirty');
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [
      ...prev,
      {
        config: JSON.parse(JSON.stringify(config)),
        produtos: JSON.parse(JSON.stringify(produtos)),
        currentPage,
      },
    ]);
    setConfig(last.config);
    setProdutos(last.produtos);
    setCurrentPage(last.currentPage);
    setUndoStack((prev) => prev.slice(0, -1));
    showToast('Ação desfeita', 'info');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [
      ...prev,
      {
        config: JSON.parse(JSON.stringify(config)),
        produtos: JSON.parse(JSON.stringify(produtos)),
        currentPage,
      },
    ]);
    setConfig(next.config);
    setProdutos(next.produtos);
    setCurrentPage(next.currentPage);
    setRedoStack((prev) => prev.slice(0, -1));
    showToast('Ação refeita', 'info');
  };

  // Páginas atuais da tabela
  const pagesList: TabelaPaginaInfo[] =
    config.paginasLista && config.paginasLista.length > 0
      ? config.paginasLista
      : (INITIAL_TABELA_CONFIG.paginasLista as TabelaPaginaInfo[]);

  const currentPageInfo = pagesList.find((p) => p.numero === currentPage) || {
    numero: currentPage,
    titulo: `Página ${currentPage}`,
  };

  // Atualizar Configuração
  const handleUpdateConfig = (updates: Partial<TabelaComercialConfig>) => {
    recordHistory();
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  // Atualizar Produto
  const handleUpdateProduto = (id: string, updates: Partial<TabelaLinhaProduto>) => {
    recordHistory();
    setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  // Excluir Produto
  const handleDeleteProduto = (id: string) => {
    recordHistory();
    setProdutos((prev) => prev.filter((p) => p.id !== id));
    if (selectedTarget?.type === 'produto' && selectedTarget.id === id) {
      setSelectedTarget(null);
    }
    showToast('Produto excluído.');
  };

  // Duplicar Produto
  const handleDuplicateProduto = (p: TabelaLinhaProduto) => {
    recordHistory();
    const dup: TabelaLinhaProduto = {
      ...p,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      descricao: `${p.descricao} (Cópia)`,
    };
    const idx = produtos.findIndex((x) => x.id === p.id);
    const newArr = [...produtos];
    newArr.splice(idx + 1, 0, dup);
    setProdutos(newArr);
    setSelectedTarget({ type: 'produto', id: dup.id });
    showToast('Produto duplicado.');
  };

  // Mover Produto
  const handleMoveProduto = (id: string, direction: 'up' | 'down') => {
    const pageProds = produtos.filter((p) => p.paginaNumero === currentPage);
    const idx = pageProds.findIndex((p) => p.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === pageProds.length - 1) return;

    recordHistory();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const globalIdx1 = produtos.findIndex((p) => p.id === pageProds[idx].id);
    const globalIdx2 = produtos.findIndex((p) => p.id === pageProds[targetIdx].id);

    const newArr = [...produtos];
    const temp = newArr[globalIdx1];
    newArr[globalIdx1] = newArr[globalIdx2];
    newArr[globalIdx2] = temp;
    setProdutos(newArr);
  };

  // Adicionar Produto à Página Atual
  const handleAddProdutoToCurrentPage = () => {
    recordHistory();
    const pageProds = produtos.filter((p) => p.paginaNumero === currentPage);
    const lastProd = pageProds[pageProds.length - 1];

    const novoProduto: TabelaLinhaProduto = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      paginaNumero: currentPage,
      marcaLinha: lastProd ? lastProd.marcaLinha : 'NOVA MARCA',
      marcaCor: lastProd ? lastProd.marcaCor : '#0284c7',
      marcaTextColor: lastProd ? lastProd.marcaTextColor : '#ffffff',
      descricao: 'Novo Produto',
      preco: 0,
      unidade: 'm²',
      promocao: false,
    };

    setProdutos((prev) => [...prev, novoProduto]);
    setSelectedTarget({ type: 'produto', id: novoProduto.id });
    showToast('Novo produto adicionado à tabela.');
  };

  // Alternar Agrupamento Lateral da Marca
  const handleToggleMarcaAgrupamento = (marca: string, forcedValue?: boolean) => {
    recordHistory();
    setConfig((prev) => {
      const currentVal =
        prev.marcasAgrupadas && prev.marcasAgrupadas[marca] !== undefined
          ? prev.marcasAgrupadas[marca]
          : prev.agruparMarcasGlobal !== false;

      const newVal = forcedValue !== undefined ? forcedValue : !currentVal;
      return {
        ...prev,
        marcasAgrupadas: {
          ...(prev.marcasAgrupadas || {}),
          [marca]: newVal,
        },
      };
    });
    showToast(`Marca "${marca}" ${forcedValue ? 'agrupada lateralmente' : 'desagrupada'}.`);
  };

  // Atualizar Título da Página Atual
  const handleUpdatePageTitle = (newTitle: string) => {
    recordHistory();
    setConfig((prev) => {
      const updatedList = (prev.paginasLista || []).map((p) =>
        p.numero === currentPage ? { ...p, titulo: newTitle } : p
      );
      return { ...prev, paginasLista: updatedList };
    });
  };

  // ==========================================
  // GERENCIAMENTO DE PÁGINAS (Adicionar, Duplicar, Excluir, Renomear, Reordenar)
  // ==========================================
  const handleAddPage = () => {
    recordHistory();
    const nextNum = pagesList.length + 1;
    const newPage: TabelaPaginaInfo = {
      numero: nextNum,
      titulo: `Nova Página ${nextNum}`,
    };
    const updatedPages = [...pagesList, newPage];
    setConfig((prev) => ({ ...prev, paginasLista: updatedPages }));
    setCurrentPage(nextNum);
    setSelectedTarget(null);
    showToast(`Página ${nextNum} adicionada.`);
  };

  const handleDuplicatePage = (pageNumber: number) => {
    recordHistory();
    const target = pagesList.find((p) => p.numero === pageNumber);
    if (!target) return;

    const nextNum = pagesList.length + 1;
    const dupPage: TabelaPaginaInfo = {
      numero: nextNum,
      titulo: `${target.titulo} (Cópia)`,
    };

    const pageProducts = produtos.filter((p) => p.paginaNumero === pageNumber);
    const clonedProducts = pageProducts.map((p) => ({
      ...JSON.parse(JSON.stringify(p)),
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      paginaNumero: nextNum,
    }));

    setConfig((prev) => ({
      ...prev,
      paginasLista: [...pagesList, dupPage],
    }));
    setProdutos((prev) => [...prev, ...clonedProducts]);
    setCurrentPage(nextNum);
    setSelectedTarget(null);
    showToast(`Página ${pageNumber} duplicada com sucesso.`);
  };

  const handleDeletePage = (pageNumber: number) => {
    if (pagesList.length <= 1) {
      alert('A tabela comercial precisa conter pelo menos 1 página.');
      return;
    }

    if (
      window.confirm(
        `Tem certeza que deseja excluir a Página ${pageNumber}? Todos os produtos dela serão removidos.`
      )
    ) {
      recordHistory();
      const filteredPages = pagesList
        .filter((p) => p.numero !== pageNumber)
        .map((p, idx) => ({ ...p, numero: idx + 1 }));

      const updatedProdutos = produtos
        .filter((p) => p.paginaNumero !== pageNumber)
        .map((p) => {
          if (p.paginaNumero > pageNumber) {
            return { ...p, paginaNumero: p.paginaNumero - 1 };
          }
          return p;
        });

      setConfig((prev) => ({ ...prev, paginasLista: filteredPages }));
      setProdutos(updatedProdutos);
      setCurrentPage(Math.max(1, Math.min(currentPage, filteredPages.length)));
      setSelectedTarget(null);
      showToast(`Página ${pageNumber} excluída.`);
    }
  };

  const handleRenamePage = (pageNumber: number, newTitle: string) => {
    recordHistory();
    setConfig((prev) => ({
      ...prev,
      paginasLista: (prev.paginasLista || []).map((p) =>
        p.numero === pageNumber ? { ...p, titulo: newTitle } : p
      ),
    }));
    showToast('Título da página atualizado.');
  };

  const handleReorderPages = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    recordHistory();

    const newPages = [...pagesList];
    const [moved] = newPages.splice(fromIdx, 1);
    newPages.splice(toIdx, 0, moved);

    const oldToNewMap: Record<number, number> = {};
    newPages.forEach((p, idx) => {
      oldToNewMap[p.numero] = idx + 1;
      p.numero = idx + 1;
    });

    const updatedProds = produtos.map((p) => ({
      ...p,
      paginaNumero: oldToNewMap[p.paginaNumero] || p.paginaNumero,
    }));

    setConfig((prev) => ({ ...prev, paginasLista: newPages }));
    setProdutos(updatedProds);
    setCurrentPage(toIdx + 1);
    showToast('Ordem das páginas alterada com sucesso.');
  };

  // ==========================================
  // SINCRONIZAR CRM (CLIENTE FINAL, CONSTRUTORA, REVENDA)
  // ==========================================
  const handleConfirmSyncCrm = () => {
    recordHistory();
    const res = atualizarPrecosVinculados(produtos, selectedSyncTier);
    setProdutos(res.produtosAtualizados);
    setIsSyncCrmModalOpen(false);

    if (res.totalAtualizados > 0) {
      showToast(
        `${res.totalAtualizados} preços atualizados para a tabela "${selectedSyncTier}" via CRM!`,
        'success'
      );
      try {
        sendUserNotification({
          category: 'Tabela Comercial',
          title: `Preços Sincronizados: ${selectedSyncTier}`,
          description: `${res.totalAtualizados} produtos tiveram seus preços atualizados via CRM na tabela ${config.nome}.`,
          targetTab: 'Documentos',
          authorName: currentUserName,
        });
      } catch {}
    } else {
      showToast(
        `Preços já sincronizados com a tabela "${selectedSyncTier}" no CRM.`,
        'info'
      );
    }
  };

  // ==========================================
  // EXCLUIR TABELA DE REVENDA DEFINITIVAMENTE
  // ==========================================
  const handleDeleteTabela = async () => {
    if (!documento) return;
    const confirmMsg = `Deseja excluir permanentemente a Tabela de Revenda ("${config.nome}")?\nEsta ação será gravada no Supabase e não poderá ser desfeita.`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      await deleteDocumentoAsync(documento.id, currentUserName);
      showToast('Tabela de Revenda excluída permanentemente.', 'success');
      onClose();
    } catch (err) {
      showToast('Erro ao excluir tabela.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // SALVAR ALTERAÇÕES NO SUPABASE
  // ==========================================
  const handleSaveDocumento = async (showNotification = true) => {
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const paginas = buildTabelaDocumentoPaginas(config, produtos);

      const targetDoc: Partial<DocumentoItem> = {
        id: documento?.id || 'tabela_revenda_setembro_2026',
        titulo: config.nome,
        categoriaId: documento?.categoriaId || 'cat_tabelas_comerciais',
        categoriaNome: config.categoria,
        mes: config.mes,
        ano: config.ano,
        isModelo: true,
        isTabelaComercial: true,
        tipoTabela: config.tipoTabela,
        nomeArquivoOriginal: documento?.nomeArquivoOriginal || `${config.nome}.pdf`,
        totalPaginas: pagesList.length,
        paginas,
        tabelaProdutosData: {
          config,
          produtos,
        },
      };

      const result = await saveDocumentoAsync(targetDoc, undefined, currentUserName, {
        createVersion: true,
        versionDesc: `Tabela salva em ${new Date().toLocaleTimeString('pt-BR')}`,
      });

      if (result.success && result.item) {
        setSaveStatus('saved');
        onSaved(result.item);
        if (showNotification) {
          showToast('Tabela de Revenda salva com sucesso no Supabase!', 'success');
        }
        try {
          sendUserNotification({
            category: 'Tabela Comercial',
            title: `Tabela Salva: ${config.nome}`,
            description: `A tabela comercial (${config.tipoTabela}) foi salva no Supabase com ${produtos.length} produtos.`,
            targetTab: 'Documentos',
            authorName: currentUserName,
          });
        } catch {}
      } else {
        setSaveStatus('dirty');
        showToast(result.error || 'Erro ao salvar no Supabase.', 'error');
      }
    } catch (err: any) {
      setSaveStatus('dirty');
      showToast('Falha na comunicação com o banco.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // SALVAR COMO CÓPIA INDEPENDENTE COM ESCOLHA DE TIER
  // ==========================================
  const handleSalvarComoCopia = async () => {
    if (!copiaNome.trim()) {
      showToast('Informe o nome para a nova tabela.', 'error');
      return;
    }

    setIsCopying(true);
    try {
      const novaConfig: TabelaComercialConfig = {
        ...config,
        nome: copiaNome.trim(),
        tipoTabela: copiaTier,
      };

      // Clona produtos e aplica preços do tier escolhido para a cópia
      let prodsClonados = JSON.parse(JSON.stringify(produtos));
      const resSync = atualizarPrecosVinculados(prodsClonados, copiaTier);
      prodsClonados = resSync.produtosAtualizados;

      const paginas = buildTabelaDocumentoPaginas(novaConfig, prodsClonados);
      const newId = `tabela_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const novaTabelaDoc: Partial<DocumentoItem> = {
        id: newId,
        titulo: novaConfig.nome,
        categoriaId: documento?.categoriaId || 'cat_tabelas_comerciais',
        categoriaNome: novaConfig.categoria,
        mes: novaConfig.mes,
        ano: novaConfig.ano,
        isModelo: true,
        isTabelaComercial: true,
        tipoTabela: novaConfig.tipoTabela,
        nomeArquivoOriginal: `${novaConfig.nome}.pdf`,
        totalPaginas: pagesList.length,
        paginas,
        tabelaProdutosData: {
          config: novaConfig,
          produtos: prodsClonados,
        },
      };

      const res = await saveDocumentoAsync(novaTabelaDoc, undefined, currentUserName);
      if (res.success && res.item) {
        showToast(`Cópia independente "${novaConfig.nome}" salva no Supabase!`, 'success');
        setIsCopiaModalOpen(false);
        setCopiaNome('');
        onSaved(res.item);
        try {
          sendUserNotification({
            category: 'Tabela Comercial',
            title: `Nova Tabela Criada: ${novaConfig.nome}`,
            description: `Tabela comercial duplicada e configurada como cópia independente (${copiaTier}).`,
            targetTab: 'Documentos',
            authorName: currentUserName,
          });
        } catch {}
      } else {
        showToast(res.error || 'Falha ao salvar cópia.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao criar cópia da tabela.', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  // Restaurar Original
  const handleRestaurarOriginal = () => {
    if (
      !window.confirm(
        'Deseja restaurar a tabela para as informações originais? Todas as modificações locais serão substituídas.'
      )
    ) {
      return;
    }
    recordHistory();
    setConfig({ ...INITIAL_TABELA_CONFIG });
    setProdutos([...INITIAL_TABELA_PRODUTOS]);
    setCurrentPage(1);
    setSelectedTarget(null);
    showToast('Tabela restaurada para o modelo original.', 'info');
  };

  // ==========================================
  // EXPORTAR PDF COM OCULTAÇÃO DE BOTÕES E PAGINAÇÃO AUTOMÁTICA
  // ==========================================
  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    showToast('Gerando PDF profissional com todas as páginas e produtos...', 'info');

    try {
      const success = await generateTabelaPdf({
        config,
        produtos,
        onProgress: (msg) => showToast(msg, 'info'),
      });

      if (success) {
        showToast('PDF profissional exportado com sucesso!', 'success');
      } else {
        showToast('Erro ao processar PDF.', 'error');
      }
    } catch (err) {
      showToast('Falha na geração do PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#080d1a]/95 backdrop-blur-md flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-top-4 ${
            toastMessage.type === 'error'
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : toastMessage.type === 'info'
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ====================================================
          1. BARRA SUPERIOR: TÍTULO, AÇÕES & SALVAMENTO
         ==================================================== */}
      <div className="h-14 px-4 bg-[#0a1222] border-b border-slate-800 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Esquerda: Nome da Tabela e Tipo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Editor"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0055ff]/20 text-[#0055ff] border border-[#0055ff]/30 uppercase">
              Tabela Comercial
            </span>
            <input
              type="text"
              value={config.nome}
              onChange={(e) => {
                recordHistory();
                setConfig((prev) => ({ ...prev, nome: e.target.value }));
              }}
              className="bg-[#121c2e] border border-slate-700/80 text-sm font-bold text-white px-2.5 py-1 rounded-lg focus:outline-none focus:border-[#0055ff] max-w-[200px] md:max-w-[260px]"
              placeholder="Nome da Tabela..."
            />
          </div>
        </div>

        {/* Centro: Desfazer, Refazer, Atualizar Preços CRM, Status */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors flex items-center gap-1 cursor-pointer"
            title="Desfazer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs hidden xl:inline">Desfazer</span>
          </button>

          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors flex items-center gap-1 cursor-pointer"
            title="Refazer"
          >
            <RotateCw className="w-4 h-4" />
            <span className="text-xs hidden xl:inline">Refazer</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Botão Sincronizar CRM com Seleção de Tabela */}
          <button
            onClick={() => setIsSyncCrmModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-bold text-sky-300 hover:text-white bg-sky-500/15 hover:bg-sky-600/30 border border-sky-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Sincronizar preços com Cliente Final, Construtora ou Revenda"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Sincronizar CRM</span>
          </button>

          {/* Status Salvo */}
          <div className="text-xs flex items-center gap-1.5 px-2.5 py-1 bg-[#121c2e] rounded-lg border border-slate-800">
            {isSaving || saveStatus === 'saving' ? (
              <span className="text-amber-400 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> Salvando...
              </span>
            ) : saveStatus === 'dirty' ? (
              <span className="text-amber-300 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Modificado
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salvo no Supabase</span>
              </span>
            )}
          </div>
        </div>

        {/* Direita: Excluir, Restaurar, Salvar como Cópia, Baixar PDF, Salvar Alterações */}
        <div className="flex items-center gap-2">
          {/* Botão Excluir Tabela Permanentemente */}
          <button
            onClick={handleDeleteTabela}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
            title="Excluir Tabela de Revenda do Supabase"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleRestaurarOriginal}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#121c2e] hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Restaurar dados originais"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Restaurar</span>
          </button>

          <button
            onClick={() => {
              setCopiaNome(`${config.nome} (Cópia)`);
              setIsCopiaModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Salvar como cópia independente"
          >
            <CopyPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Salvar como Cópia</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#121c2e] hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Gerar PDF com todas as páginas limpas e sem controles"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">
              {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
            </span>
          </button>

          <button
            onClick={() => handleSaveDocumento(true)}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#0055ff] hover:bg-[#0044cc] rounded-lg shadow-md shadow-[#0055ff]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* ====================================================
          2. CORPO DO EDITOR (LAYOUT 3 COLUNAS)
          - Esquerda: Miniaturas das páginas (com drag & drop, add, dup, delete, rename)
          - Centro: Visualização grande da página (1200 x 850) com agrupamento de marcas e edição inline
          - Direita: Painel contextual de propriedades
         ==================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUNA ESQUERDA: MINIATURAS DAS PÁGINAS */}
        <TabelaSidebarThumbnails
          pages={pagesList}
          currentPage={currentPage}
          config={config}
          produtos={produtos}
          onSelectPage={(pageNum) => {
            setCurrentPage(pageNum);
            setSelectedTarget(null);
          }}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onReorderPages={handleReorderPages}
        />

        {/* COLUNA CENTRAL: VISUALIZAÇÃO GRANDE DA PÁGINA */}
        <TabelaCanvasPage
          currentPage={currentPage}
          totalPages={pagesList.length}
          currentPageTitle={currentPageInfo.titulo}
          config={config}
          produtos={produtos}
          selectedTarget={selectedTarget}
          zoom={zoom}
          onChangeZoom={setZoom}
          onSelectTarget={setSelectedTarget}
          onUpdateProduto={handleUpdateProduto}
          onDeleteProduto={handleDeleteProduto}
          onDuplicateProduto={handleDuplicateProduto}
          onMoveProduto={handleMoveProduto}
          onAddProdutoToPage={handleAddProdutoToCurrentPage}
          onToggleMarcaAgrupamento={handleToggleMarcaAgrupamento}
          pageContainerRef={pageContainerRef}
        />

        {/* COLUNA DIREITA: PAINEL DE PROPRIEDADES */}
        <TabelaPropertiesPanel
          selectedTarget={selectedTarget}
          config={config}
          produtos={produtos}
          currentPage={currentPage}
          currentPageTitle={currentPageInfo.titulo}
          onUpdateConfig={handleUpdateConfig}
          onUpdateProduto={handleUpdateProduto}
          onDeleteProduto={handleDeleteProduto}
          onDuplicateProduto={handleDuplicateProduto}
          onMoveProduto={handleMoveProduto}
          onToggleMarcaAgrupamento={handleToggleMarcaAgrupamento}
          onUpdatePageTitle={handleUpdatePageTitle}
          onAddProduto={handleAddProdutoToCurrentPage}
        />
      </div>

      {/* ====================================================
          MODAL: SINCRONIZAR PREÇOS COM CRM
         ==================================================== */}
      {isSyncCrmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0e172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <span>Sincronizar Preços com CRM</span>
              </h3>
              <button
                onClick={() => setIsSyncCrmModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Escolha a tabela de preços oficial cadastrada no CRM/Supabase para sincronizar
              exclusivamente os valores dos produtos. Layouts, descrições e páginas permanecem
              intactos.
            </p>

            <div className="space-y-2 pt-1">
              {[
                {
                  id: 'Revenda' as const,
                  title: 'Revenda',
                  desc: 'Preços oficiais para lojas e parceiros revendedores',
                  icon: ShoppingBag,
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10 border-blue-500/30',
                },
                {
                  id: 'Construtora' as const,
                  title: 'Construtora',
                  desc: 'Preços negociados para grandes obras e empreendimentos',
                  icon: Building2,
                  color: 'text-amber-400',
                  bg: 'bg-amber-500/10 border-amber-500/30',
                },
                {
                  id: 'Cliente Final' as const,
                  title: 'Cliente Final',
                  desc: 'Preço de tabela para consumidor final e orçamentos diretos',
                  icon: Users,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10 border-emerald-500/30',
                },
              ].map((tier) => {
                const IconComp = tier.icon;
                const isSelected = selectedSyncTier === tier.id;

                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedSyncTier(tier.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#0055ff] bg-[#0055ff]/15 ring-2 ring-[#0055ff]/40 shadow-sm'
                        : 'border-slate-800 bg-[#121c2e] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tier.bg} ${tier.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{tier.title}</span>
                          {config.tipoTabela === tier.id && (
                            <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-normal">
                              Atual
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{tier.desc}</div>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-[#0055ff] bg-[#0055ff]'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSyncCrmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSyncCrm}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0055ff] hover:bg-[#0044cc] transition-colors shadow-sm shadow-[#0055ff]/30"
              >
                Sincronizar Preços Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: SALVAR COMO CÓPIA COM ESCOLHA DE TIER
         ==================================================== */}
      {isCopiaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0e172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CopyPlus className="w-5 h-5 text-emerald-400" />
              <span>Salvar como Cópia Independente</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crie uma nova tabela comercial no Supabase. As alterações nesta cópia não afetarão o
              modelo original.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Nova Tabela
                </label>
                <input
                  type="text"
                  value={copiaNome}
                  onChange={(e) => setCopiaNome(e.target.value)}
                  placeholder="Ex: Tabela Construtora Outubro 2026"
                  className="w-full bg-[#121c2e] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tabela de Preços Inicial
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Revenda', 'Construtora', 'Cliente Final'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setCopiaTier(tier)}
                      className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        copiaTier === tier
                          ? 'border-[#0055ff] bg-[#0055ff]/15 text-white'
                          : 'border-slate-800 bg-[#121c2e] text-slate-400 hover:text-white'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCopiaModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarComoCopia}
                disabled={isCopying}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isCopying ? 'Criando Cópia...' : 'Salvar Cópia no Supabase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
