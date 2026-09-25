import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Play,
  RotateCcw,
  RotateCw,
  History,
  CopyPlus,
  RefreshCw,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  DocumentoItem,
  DocumentoPagina,
  DocumentoElemento,
  DocumentoCampoModelo,
  TipoCampoModelo,
  DocumentoCategoria,
  ClientRecord,
} from '../../types';
import {
  saveDocumentoAsync,
  createBlankPage,
} from '../../utils/documentosService';
import { VersoesModal } from './VersoesModal';
import { EditorPageThumbnails } from './editor/EditorPageThumbnails';
import { EditorElementsPalette } from './editor/EditorElementsPalette';
import { EditorPropertiesPanel } from './editor/EditorPropertiesPanel';
import { EditorCanvas } from './editor/EditorCanvas';

// Ícones para os tipos de campos de modelo
import {
  Type,
  Hash,
  Calendar,
  DollarSign,
  FileBadge,
  Phone,
  Mail,
  MapPin,
  ListFilter,
  CheckSquare,
  AlignLeft,
  Image as ImageIcon,
  PenTool,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Package,
  Sliders,
} from 'lucide-react';

interface ModeloCamposEditorModalProps {
  isOpen: boolean;
  modelo: DocumentoItem | null;
  categorias: DocumentoCategoria[];
  clients: ClientRecord[];
  currentUserName: string;
  onClose: () => void;
  onSaved: (savedModelo: DocumentoItem) => void;
  onUseModelo: (modelo: DocumentoItem) => void;
}

interface HistorySnapshot {
  campos: DocumentoCampoModelo[];
  titulo: string;
  paginas: DocumentoPagina[];
}

export const CAMPO_TIPO_CONFIG: Record<
  TipoCampoModelo,
  { label: string; icon: any; cor: string; desc: string }
> = {
  texto: { label: 'Texto Curto', icon: Type, cor: '#0055ff', desc: 'Linha simples de texto' },
  numero: { label: 'Número', icon: Hash, cor: '#0284c7', desc: 'Valores numéricos e quantidades' },
  data: { label: 'Data', icon: Calendar, cor: '#0d9488', desc: 'Seleção de data no calendário' },
  moeda: { label: 'Moeda (R$)', icon: DollarSign, cor: '#16a34a', desc: 'Valores monetários formatados' },
  cpf_cnpj: { label: 'CPF / CNPJ', icon: FileBadge, cor: '#d97706', desc: 'Documento com máscara e validação' },
  telefone: { label: 'Telefone / WhatsApp', icon: Phone, cor: '#2563eb', desc: 'Número de telefone formatado' },
  email: { label: 'E-mail', icon: Mail, cor: '#9333ea', desc: 'Endereço eletrônico' },
  endereco: { label: 'Endereço da Obra', icon: MapPin, cor: '#ea580c', desc: 'Endereço completo da obra ou entrega' },
  selecao: { label: 'Seleção (Dropdown)', icon: ListFilter, cor: '#4f46e5', desc: 'Lista suspensa com opções' },
  checkbox: { label: 'Checkbox', icon: CheckSquare, cor: '#059669', desc: 'Caixa de marcação sim/não' },
  textarea: { label: 'Área de Texto', icon: AlignLeft, cor: '#64748b', desc: 'Texto longo ou observações' },
  imagem: { label: 'Imagem / Foto', icon: ImageIcon, cor: '#e11d48', desc: 'Upload de foto ou comprovante' },
  assinatura_normal: { label: 'Assinatura Normal', icon: PenTool, cor: '#0284c7', desc: 'Desenhar com dedo ou mouse' },
  assinatura_govbr: { label: 'Assinatura gov.br', icon: ShieldCheck, cor: '#15803d', desc: 'Autenticação digital oficial Gov.br' },
  vinculado_cliente: { label: 'Vínculo: Cliente CRM', icon: UserCheck, cor: '#0055ff', desc: 'Preenche automático do cadastro do cliente' },
  vinculado_pedido: { label: 'Vínculo: Pedido CRM', icon: ShoppingBag, cor: '#7c3aed', desc: 'Puxa dados do pedido / orçamento' },
  vinculado_produto: { label: 'Vínculo: Produto / Coleção', icon: Package, cor: '#b45309', desc: 'Puxa itens, unidade e coleção' },
  personalizado: { label: 'Personalizado', icon: Sliders, cor: '#475569', desc: 'Campo livre customizável' },
};

export const ModeloCamposEditorModal: React.FC<ModeloCamposEditorModalProps> = ({
  isOpen,
  modelo,
  categorias,
  clients,
  currentUserName,
  onClose,
  onSaved,
  onUseModelo,
}) => {
  const [titulo, setTitulo] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [paginas, setPaginas] = useState<DocumentoPagina[]>([]);
  const [campos, setCampos] = useState<DocumentoCampoModelo[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Seleções
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedCampoId, setSelectedCampoId] = useState<string | null>(null);

  // Paleta de Adicionar Elementos / Campos
  const [paletteTab, setPaletteTab] = useState<'elementos' | 'campos' | 'pagina'>('elementos');

  // Histórico para Desfazer / Refazer
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Snapshot inicial para "Restaurar Original"
  const [initialSnapshot, setInitialSnapshot] = useState<HistorySnapshot | null>(null);

  // UI state
  const [zoom, setZoom] = useState(0.85);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isVersoesOpen, setIsVersoesOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Inicializa dados ao abrir
  useEffect(() => {
    if (modelo && isOpen) {
      const initialPages =
        modelo.paginas && modelo.paginas.length > 0
          ? JSON.parse(JSON.stringify(modelo.paginas))
          : [createBlankPage(1)];

      const initialCampos: DocumentoCampoModelo[] =
        modelo.camposModelo && modelo.camposModelo.length > 0
          ? JSON.parse(JSON.stringify(modelo.camposModelo))
          : [];

      setTitulo(modelo.titulo || 'Modelo de Documento');
      setCategoriaId(modelo.categoriaId || (categorias[0]?.id || ''));
      setPaginas(initialPages);
      setCampos(initialCampos);
      setCurrentPageIndex(0);
      setSelectedElementId(null);
      setSelectedCampoId(null);
      setSaveStatus('saved');
      setUndoStack([]);
      setRedoStack([]);

      setInitialSnapshot({
        titulo: modelo.titulo || 'Modelo de Documento',
        campos: JSON.parse(JSON.stringify(initialCampos)),
        paginas: JSON.parse(JSON.stringify(initialPages)),
      });
    }
  }, [modelo, categorias, isOpen]);

  // Página atual garantindo proporção e dimensões originais
  const currentPage: DocumentoPagina =
    paginas[currentPageIndex] || paginas[0] || createBlankPage(1);
  const pageWidth = currentPage.width || 794;
  const pageHeight = currentPage.height || 1123;
  const pageNumero = currentPageIndex + 1;

  // Campos sobre a página atual
  const camposPaginaAtual = campos.filter((c) => (c.paginaNumero || 1) === pageNumero);

  // Elemento e Campo selecionados
  const selectedElement =
    currentPage?.elementos?.find((el) => el.id === selectedElementId) || null;
  const selectedCampo = campos.find((c) => c.id === selectedCampoId) || null;

  // Histórico
  const recordHistory = () => {
    setUndoStack((prev) => [
      ...prev.slice(-25),
      {
        campos: JSON.parse(JSON.stringify(campos)),
        titulo,
        paginas: JSON.parse(JSON.stringify(paginas)),
      },
    ]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [
      ...s,
      {
        campos: JSON.parse(JSON.stringify(campos)),
        titulo,
        paginas: JSON.parse(JSON.stringify(paginas)),
      },
    ]);
    setCampos(prev.campos);
    setTitulo(prev.titulo);
    setPaginas(prev.paginas);
    setSaveStatus('dirty');
    showToast('Ação desfeita');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [
      ...s,
      {
        campos: JSON.parse(JSON.stringify(campos)),
        titulo,
        paginas: JSON.parse(JSON.stringify(paginas)),
      },
    ]);
    setCampos(next.campos);
    setTitulo(next.titulo);
    setPaginas(next.paginas);
    setSaveStatus('dirty');
    showToast('Ação refeita');
  };

  // ==========================================
  // ELEMENTOS DA PÁGINA (Adicionar, Mover, Duplicar, Excluir, Z-Index)
  // ==========================================
  const updateCurrentPageElements = (
    newElements: DocumentoElemento[],
    pushHistory = true
  ) => {
    if (pushHistory) recordHistory();
    setPaginas((prev) =>
      prev.map((p, idx) => (idx === currentPageIndex ? { ...p, elementos: newElements } : p))
    );
    setSaveStatus('dirty');
  };

  const handleAddElement = (element: Omit<DocumentoElemento, 'id'>) => {
    recordHistory();
    const newId = `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEl: DocumentoElemento = {
      ...element,
      id: newId,
      zIndex: (currentPage.elementos?.length || 0) + 1,
    };
    updateCurrentPageElements([...(currentPage.elementos || []), newEl], false);
    setSelectedElementId(newId);
    setSelectedCampoId(null);
    showToast(`Elemento "${element.tipo}" adicionado`);
  };

  const handleUpdateElement = (
    id: string,
    updates: Partial<DocumentoElemento>,
    pushHistory = false
  ) => {
    if (pushHistory) recordHistory();
    const newElements = (currentPage.elementos || []).map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    updateCurrentPageElements(newElements, false);
  };

  const handleDuplicateElement = () => {
    if (!selectedElement) return;
    recordHistory();
    const dup: DocumentoElemento = {
      ...JSON.parse(JSON.stringify(selectedElement)),
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: Math.min(pageWidth - selectedElement.width, selectedElement.x + 20),
      y: Math.min(pageHeight - selectedElement.height, selectedElement.y + 20),
      zIndex: (currentPage.elementos?.length || 0) + 1,
    };
    updateCurrentPageElements([...currentPage.elementos, dup], false);
    setSelectedElementId(dup.id);
    showToast('Elemento duplicado');
  };

  const handleDeleteElement = () => {
    if (!selectedElementId) return;
    recordHistory();
    updateCurrentPageElements(
      currentPage.elementos.filter((el) => el.id !== selectedElementId),
      false
    );
    setSelectedElementId(null);
    showToast('Elemento removido');
  };

  const handleBringForward = () => {
    if (!selectedElementId) return;
    recordHistory();
    const curElements = [...(currentPage.elementos || [])];
    const maxZ = Math.max(...curElements.map((e) => e.zIndex || 1), 1);
    updateCurrentPageElements(
      curElements.map((el) => (el.id === selectedElementId ? { ...el, zIndex: maxZ + 1 } : el)),
      false
    );
  };

  const handleSendBackward = () => {
    if (!selectedElementId) return;
    recordHistory();
    const curElements = [...(currentPage.elementos || [])];
    const minZ = Math.min(...curElements.map((e) => e.zIndex || 1), 1);
    updateCurrentPageElements(
      curElements.map((el) =>
        el.id === selectedElementId ? { ...el, zIndex: Math.max(1, minZ - 1) } : el
      ),
      false
    );
  };

  // ==========================================
  // CAMPOS DE MODELO / CRM
  // ==========================================
  const handleAddCampo = (tipo: TipoCampoModelo) => {
    recordHistory();
    const config = CAMPO_TIPO_CONFIG[tipo];
    const newId = `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let defaultWidth = 280;
    let defaultHeight = 38;
    if (tipo === 'textarea') {
      defaultWidth = 590;
      defaultHeight = 75;
    } else if (tipo === 'assinatura_normal' || tipo === 'assinatura_govbr') {
      defaultWidth = 280;
      defaultHeight = 90;
    } else if (tipo === 'checkbox') {
      defaultWidth = 220;
      defaultHeight = 32;
    } else if (tipo === 'endereco') {
      defaultWidth = 590;
      defaultHeight = 38;
    }

    const offset = (camposPaginaAtual.length % 8) * 45;
    const newCampo: DocumentoCampoModelo = {
      id: newId,
      nome: config.label,
      tipo,
      obrigatorio: false,
      paginaNumero: pageNumero,
      x: 60,
      y: Math.min(pageHeight - defaultHeight - 40, 140 + offset),
      width: defaultWidth,
      height: defaultHeight,
      placeholder: `Preencher ${config.label.toLowerCase()}...`,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      color: '#0f172a',
      backgroundColor: '#ffffff',
      borderColor: '#cbd5e1',
      borderWidth: 1,
      borderRadius: 6,
    };

    setCampos([...campos, newCampo]);
    setSelectedCampoId(newId);
    setSelectedElementId(null);
    setSaveStatus('dirty');
    showToast(`Campo "${config.label}" adicionado à página ${pageNumero}`);
  };

  const handleUpdateCampo = (
    id: string,
    updates: Partial<DocumentoCampoModelo>,
    pushHistory = false
  ) => {
    if (pushHistory) recordHistory();
    setCampos((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setSaveStatus('dirty');
  };

  const handleDuplicateCampo = () => {
    if (!selectedCampo) return;
    recordHistory();
    const dupId = `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dup: DocumentoCampoModelo = {
      ...JSON.parse(JSON.stringify(selectedCampo)),
      id: dupId,
      nome: `${selectedCampo.nome} (Cópia)`,
      x: Math.min(pageWidth - selectedCampo.width, selectedCampo.x + 20),
      y: Math.min(pageHeight - selectedCampo.height, selectedCampo.y + 20),
    };
    setCampos([...campos, dup]);
    setSelectedCampoId(dupId);
    setSaveStatus('dirty');
    showToast('Campo duplicado');
  };

  const handleDeleteCampo = () => {
    if (!selectedCampoId) return;
    recordHistory();
    setCampos(campos.filter((c) => c.id !== selectedCampoId));
    setSelectedCampoId(null);
    setSaveStatus('dirty');
    showToast('Campo excluído');
  };

  // ==========================================
  // GERENCIAMENTO DE PÁGINAS (Adicionar, Duplicar, Excluir, Renomear, Reordenar)
  // ==========================================
  const handleAddPage = () => {
    recordHistory();
    const newPageNum = paginas.length + 1;
    const newP: DocumentoPagina = {
      ...createBlankPage(newPageNum),
      width: pageWidth,
      height: pageHeight,
      titulo: `Página ${newPageNum}`,
    };
    setPaginas([...paginas, newP]);
    setCurrentPageIndex(paginas.length);
    setSelectedElementId(null);
    setSelectedCampoId(null);
    setSaveStatus('dirty');
    showToast(`Página ${newPageNum} adicionada`);
  };

  const handleDuplicatePage = (idx: number) => {
    const target = paginas[idx];
    if (!target) return;
    recordHistory();

    // Cria cópia profunda 100% independente com novos IDs para página e elementos
    const dupElements = (target.elementos || []).map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    }));

    const dupPage: DocumentoPagina = {
      ...JSON.parse(JSON.stringify(target)),
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titulo: `${target.titulo || `Página ${idx + 1}`} (Cópia)`,
      numero: idx + 2,
      elementos: dupElements,
    };

    const newPages = [...paginas];
    newPages.splice(idx + 1, 0, dupPage);
    newPages.forEach((p, i) => (p.numero = i + 1));
    setPaginas(newPages);
    setCurrentPageIndex(idx + 1);
    setSelectedElementId(null);
    setSelectedCampoId(null);
    setSaveStatus('dirty');
    showToast(`Página ${idx + 2} duplicada independentemente`);
  };

  const handleDeletePage = (idx: number) => {
    if (paginas.length <= 1) {
      alert('O catálogo/modelo precisa conter pelo menos 1 página.');
      return;
    }
    const pageTitle = paginas[idx]?.titulo || `Página ${idx + 1}`;
    if (
      window.confirm(
        `Deseja excluir permanentemente a "${pageTitle}"? Esta ação removerá a página e seus elementos.`
      )
    ) {
      recordHistory();
      const filtered = paginas.filter((_, i) => i !== idx);
      filtered.forEach((p, i) => (p.numero = i + 1));
      setPaginas(filtered);
      setCurrentPageIndex(Math.max(0, Math.min(currentPageIndex, filtered.length - 1)));
      setSelectedElementId(null);
      setSelectedCampoId(null);
      setSaveStatus('dirty');
      showToast(`"${pageTitle}" excluída`);
    }
  };

  const handleMovePage = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= paginas.length || toIdx >= paginas.length)
      return;
    recordHistory();
    const newPages = [...paginas];
    const [moved] = newPages.splice(fromIdx, 1);
    newPages.splice(toIdx, 0, moved);
    newPages.forEach((p, i) => (p.numero = i + 1));
    setPaginas(newPages);
    setCurrentPageIndex(toIdx);
    setSaveStatus('dirty');
    showToast('Ordem das páginas atualizada');
  };

  const handleRenamePage = (idx: number, newTitle: string) => {
    recordHistory();
    setPaginas((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, titulo: newTitle } : p))
    );
    setSaveStatus('dirty');
  };

  const handleUpdatePageSettings = (updates: Partial<DocumentoPagina>) => {
    recordHistory();
    setPaginas((prev) =>
      prev.map((p, idx) => (idx === currentPageIndex ? { ...p, ...updates } : p))
    );
    setSaveStatus('dirty');
  };

  const handleUploadPageBackground = (file: File) => {
    recordHistory();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.width || 794;
        const h = img.height || 1123;
        handleUpdatePageSettings({
          backgroundImage: dataUrl,
          width: w,
          height: h,
          orientation: w > h ? 'landscape' : 'portrait',
        });
        showToast('Fundo da página atualizado com sucesso!');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // SALVAMENTO REAL NO SUPABASE
  // ==========================================
  const executeSave = async (
    createVersion = false,
    versionDesc?: string
  ): Promise<DocumentoItem | null> => {
    if (!modelo) return null;
    setIsSaving(true);
    setSaveStatus('saving');

    const selectedCat = categorias.find((c) => c.id === categoriaId);
    const catNome = selectedCat ? selectedCat.nome : 'Modelos';

    const res = await saveDocumentoAsync(
      {
        id: modelo.id,
        titulo: titulo.trim() || 'Modelo de Documento',
        categoriaId,
        categoriaNome: catNome,
        isModelo: true,
        camposModelo: campos,
        paginas,
        totalPaginas: paginas.length,
      },
      undefined,
      currentUserName,
      { createVersion, versionDesc }
    );

    setIsSaving(false);
    if (res.success && res.item) {
      setSaveStatus('saved');
      setLastAutoSaveTime(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      onSaved(res.item);
      return res.item;
    } else {
      setSaveStatus('dirty');
      showToast(res.error || 'Erro ao salvar modelo no Supabase');
      return null;
    }
  };

  // Salvar Modelo Manual
  const handleSaveManual = async () => {
    const saved = await executeSave(true, 'Modelo e páginas salvos manualmente');
    if (saved) {
      showToast('Modelo e páginas salvos com sucesso no Supabase!');
    }
  };

  // Salvar como Cópia (Cria novo modelo independente no Supabase)
  const handleSaveAsCopy = async () => {
    if (!modelo) return;
    setIsSaving(true);
    const copyTitle = `${titulo.trim() || 'Modelo'} (Cópia)`;
    const newId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const selectedCat = categorias.find((c) => c.id === categoriaId);

    const res = await saveDocumentoAsync(
      {
        id: newId,
        titulo: copyTitle,
        categoriaId,
        categoriaNome: selectedCat ? selectedCat.nome : 'Modelos',
        isModelo: true,
        camposModelo: JSON.parse(JSON.stringify(campos)),
        paginas: JSON.parse(JSON.stringify(paginas)),
        totalPaginas: paginas.length,
        isPdfImportado: modelo.isPdfImportado,
        nomeArquivoOriginal: modelo.nomeArquivoOriginal,
      },
      undefined,
      currentUserName,
      { createVersion: true, versionDesc: 'Cópia independente do modelo criada' }
    );

    setIsSaving(false);
    if (res.success && res.item) {
      showToast(`Cópia independente "${copyTitle}" criada no Supabase!`);
      onSaved(res.item);
    } else {
      showToast(res.error || 'Erro ao gerar cópia');
    }
  };

  // Restaurar Original
  const handleRestoreOriginal = () => {
    if (!initialSnapshot) return;
    if (
      window.confirm(
        'Tem certeza que deseja restaurar o modelo ao seu estado original ao abrir? Quaisquer alterações não salvas serão revertidas.'
      )
    ) {
      recordHistory();
      setTitulo(initialSnapshot.titulo);
      setCampos(JSON.parse(JSON.stringify(initialSnapshot.campos)));
      setPaginas(JSON.parse(JSON.stringify(initialSnapshot.paginas)));
      setCurrentPageIndex(0);
      setSelectedElementId(null);
      setSelectedCampoId(null);
      setSaveStatus('dirty');
      showToast('Modelo restaurado ao original.');
    }
  };

  // Autosave a cada 40s se houver alterações
  useEffect(() => {
    if (saveStatus !== 'dirty') return;
    const timer = setTimeout(() => {
      executeSave(false, 'Autosave automático do modelo');
    }, 40000);
    return () => clearTimeout(timer);
  }, [saveStatus, campos, titulo, paginas]);

  if (!isOpen || !modelo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070d19] text-slate-100 select-none overflow-hidden font-sans">
      {/* ==========================================
          BARRA SUPERIOR: CONTROLES & AÇÕES
         ========================================== */}
      <div className="h-14 px-4 bg-[#0a1222] border-b border-slate-800 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Esquerda: Fechar, Título do Modelo, Categoria */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Editor de Modelos"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0055ff]/20 text-[#0055ff] border border-[#0055ff]/30 uppercase">
              Modelo Editável
            </span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setSaveStatus('dirty');
              }}
              placeholder="Nome do Modelo..."
              className="bg-[#121c2e] border border-slate-700/80 text-sm font-bold text-white px-2.5 py-1 rounded-lg focus:outline-none focus:border-[#0055ff] max-w-[200px] md:max-w-[280px]"
            />
          </div>
        </div>

        {/* Centro: Desfazer, Refazer, Autosave Status, Versões */}
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

          {/* Status Autosave */}
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
                {lastAutoSaveTime ? `Salvo às ${lastAutoSaveTime}` : 'Salvo no Supabase'}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsVersoesOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#121c2e] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Histórico de Versões"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Histórico</span>
          </button>
        </div>

        {/* Direita: Restaurar Original, Salvar Cópia, USAR MODELO, Salvar Modelo */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestoreOriginal}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#121c2e] hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Restaurar estado original"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Restaurar</span>
          </button>

          <button
            onClick={handleSaveAsCopy}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Criar novo modelo independente"
          >
            <CopyPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Salvar como Cópia</span>
          </button>

          {/* BOTÃO EM DESTAQUE: USAR MODELO */}
          <button
            onClick={async () => {
              const saved = await executeSave(false);
              if (saved) {
                onUseModelo(saved);
              } else if (modelo) {
                onUseModelo({
                  ...modelo,
                  titulo,
                  camposModelo: campos,
                  paginas,
                });
              }
            }}
            className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Abrir tela dividida para preencher formulário e gerar PDF"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Usar Modelo</span>
          </button>

          {/* Salvar Modelo */}
          <button
            onClick={handleSaveManual}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#0055ff] hover:bg-[#0044cc] rounded-lg shadow-md shadow-[#0055ff]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Modelo</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0055ff] text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <Info className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==========================================
          CORPO PRINCIPAL (4 COLUNAS / SEÇÕES INTEGRADAS)
          - Miniaturas das Páginas (lado esquerdo)
          - Paleta de Elementos / Campos (ao lado das miniaturas)
          - Canvas Central de Alta Resolução (centro)
          - Painel de Propriedades do Elemento/Campo (lado direito)
         ========================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Painel de Miniaturas das Páginas */}
        <EditorPageThumbnails
          paginas={paginas}
          campos={campos}
          currentPageIndex={currentPageIndex}
          onSelectPage={(idx) => {
            setCurrentPageIndex(idx);
            setSelectedElementId(null);
            setSelectedCampoId(null);
          }}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onMovePage={handleMovePage}
          onRenamePage={handleRenamePage}
        />

        {/* 2. Paleta de Elementos & Campos */}
        <EditorElementsPalette
          activeTab={paletteTab}
          onChangeTab={setPaletteTab}
          currentPage={currentPage}
          onAddElement={handleAddElement}
          onAddCampo={handleAddCampo}
          onUpdatePage={handleUpdatePageSettings}
          onUploadPageBackground={handleUploadPageBackground}
        />

        {/* 3. Canvas Visual Interativo */}
        <EditorCanvas
          currentPage={currentPage}
          currentPageIndex={currentPageIndex}
          totalPages={paginas.length}
          camposPaginaAtual={camposPaginaAtual}
          selectedElementId={selectedElementId}
          selectedCampoId={selectedCampoId}
          zoom={zoom}
          onChangeZoom={setZoom}
          onSelectElement={setSelectedElementId}
          onSelectCampo={setSelectedCampoId}
          onUpdateElement={(id, updates, pushHistory) =>
            handleUpdateElement(id, updates, pushHistory)
          }
          onUpdateCampo={(id, updates, pushHistory) =>
            handleUpdateCampo(id, updates, pushHistory)
          }
          onRecordHistory={recordHistory}
        />

        {/* 4. Painel de Propriedades */}
        <EditorPropertiesPanel
          selectedElement={selectedElement}
          selectedCampo={selectedCampo}
          onUpdateElement={(updates, pushHistory) => {
            if (selectedElementId) {
              handleUpdateElement(selectedElementId, updates, pushHistory);
            }
          }}
          onDuplicateElement={handleDuplicateElement}
          onDeleteElement={handleDeleteElement}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onUpdateCampo={(updates, pushHistory) => {
            if (selectedCampoId) {
              handleUpdateCampo(selectedCampoId, updates, pushHistory);
            }
          }}
          onDuplicateCampo={handleDuplicateCampo}
          onDeleteCampo={handleDeleteCampo}
        />
      </div>

      {/* Histórico de Versões */}
      {isVersoesOpen && (
        <VersoesModal
          isOpen={isVersoesOpen}
          documentoId={modelo.id}
          documentoTitulo={titulo}
          versoes={modelo.versoes || []}
          currentUserName={currentUserName}
          onClose={() => setIsVersoesOpen(false)}
          onRestore={(v) => {
            recordHistory();
            setPaginas(v.paginas);
            setSaveStatus('dirty');
            setIsVersoesOpen(false);
            showToast(`Versão "${v.descricao}" restaurada.`);
          }}
        />
      )}
    </div>
  );
};
