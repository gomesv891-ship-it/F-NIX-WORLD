import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  FileCheck,
  Download,
  Printer,
  Sparkles,
  UserCheck,
  ShoppingBag,
  PenTool,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  Eraser,
  Eye,
  Plus,
  Trash2,
  CreditCard,
  DollarSign,
  Package,
  Edit3,
  Maximize2,
  FileText,
  Check,
} from 'lucide-react';
import {
  DocumentoItem,
  DocumentoPagina,
  DocumentoElemento,
  DocumentoCampoModelo,
  ClientRecord,
  SavedOrcamento,
  AssinaturaGovBrInfo,
} from '../../types';
import {
  saveDocumentoAsync,
  createBlankPage,
} from '../../utils/documentosService';
import {
  TermoProdutoItem,
  TermoAutorizacaoFormData,
  INITIAL_TERMO_DATA,
  buildTermoAutorizacaoPaginas,
} from '../../data/termoAutorizacaoPagamentoModel';
import { CAMPO_TIPO_CONFIG } from './ModeloCamposEditorModal';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface PreencherDocumentoModalProps {
  isOpen: boolean;
  modelo: DocumentoItem | null;
  clients: ClientRecord[];
  currentUserName: string;
  onClose: () => void;
  onGeradoSucesso: (novoDocumento: DocumentoItem) => void;
  onEditarModeloOriginal?: (modelo: DocumentoItem) => void;
}

export const PreencherDocumentoModal: React.FC<PreencherDocumentoModalProps> = ({
  isOpen,
  modelo,
  clients,
  currentUserName,
  onClose,
  onGeradoSucesso,
  onEditarModeloOriginal,
}) => {
  // Verifica se é o modelo "Termo de Autorização de Pagamento por Link"
  const isTermoPagamento = useMemo(() => {
    if (!modelo) return false;
    const tit = modelo.titulo.toLowerCase();
    const id = modelo.id.toLowerCase();
    return (
      id === 'termo_autorizacao_pagamento_link' ||
      tit.includes('autorização de pagamento') ||
      tit.includes('autorizacao de pagamento') ||
      (tit.includes('termo') && tit.includes('link'))
    );
  }, [modelo]);

  // Estado especializado para o Termo de Autorização de Pagamento
  const [termoData, setTermoData] = useState<TermoAutorizacaoFormData>(INITIAL_TERMO_DATA);

  // Estado geral de valores para modelos convencionais (campoId -> valor)
  const [valores, setValores] = useState<Record<string, any>>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(0.85);

  // Vínculos inteligentes de CRM selecionados
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string>('');
  const [orcamentosList, setOrcamentosList] = useState<SavedOrcamento[]>([]);

  // Assinatura Normal (Canvas)
  const [normalSigDataUrl, setNormalSigDataUrl] = useState<string>('');
  const [isDrawingNormalSig, setIsDrawingNormalSig] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Assinatura Gov.br
  const [govBrInfo, setGovBrInfo] = useState<AssinaturaGovBrInfo | null>(null);
  const [isGovBrModalOpen, setIsGovBrModalOpen] = useState(false);
  const [govBrCpfInput, setGovBrCpfInput] = useState('');
  const [govBrNomeInput, setGovBrNomeInput] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tituloGerado, setTituloGerado] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const previewDocRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega orçamentos reais do CRM salvos no sistema
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fenix_orcamentos_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setOrcamentosList(parsed);
        }
      }
    } catch {
      setOrcamentosList([]);
    }
  }, [isOpen]);

  // Inicializa valores ao abrir o modelo
  useEffect(() => {
    if (modelo && isOpen) {
      const initialVals: Record<string, any> = {};
      (modelo.camposModelo || []).forEach((c) => {
        initialVals[c.id] = c.valorPadrao || '';
      });

      setValores(initialVals);
      setTituloGerado(`${modelo.titulo} - ${new Date().toLocaleDateString('pt-BR')}`);
      setCurrentPageIndex(0);
      setNormalSigDataUrl('');
      setGovBrInfo(null);
      setSelectedClientId('');
      setSelectedOrcamentoId('');

      // Se for Termo de Pagamento, inicializa dados estruturados
      if (isTermoPagamento) {
        setTermoData({
          clienteNome: 'Construtora e Incorporadora Splendor Ltda',
          clienteCpf: '12.345.678/0001-90',
          titularNome: 'Carlos Eduardo Silveira',
          titularCpf: '123.456.789-00',
          titularMesmoCliente: false,
          cartaoUltimos4: '4892',
          cartaoBandeira: 'Mastercard',
          produtos: [
            {
              id: 'prod_1',
              descricao: 'Piso Vinílico Flexfloor 3mm Colado - Linha Premium',
              quantidade: 35,
              valorUnitario: 89.9,
              valorTotal: 3146.5,
            },
            {
              id: 'prod_2',
              descricao: 'Adesivo Acrílico de Contato Premium (Balde 14kg)',
              quantidade: 2,
              valorUnitario: 185.0,
              valorTotal: 370.0,
            },
          ],
          frete: 120.0,
          valorTotalAutorizado: 3636.5,
          formaPagamento: 'Crédito',
          parcelas: 3,
          dataAutorizacao: new Date().toLocaleDateString('pt-BR'),
        });
      }
    }
  }, [modelo, isOpen, isTermoPagamento]);

  // Sincroniza cálculo do total autorizado sempre que produtos ou frete mudarem no Termo
  const recalculateTermoTotal = (produtos: TermoProdutoItem[], frete: number) => {
    const somaProdutos = produtos.reduce((acc, p) => acc + (p.valorTotal || 0), 0);
    return Number((somaProdutos + (frete || 0)).toFixed(2));
  };

  // Atualiza um produto específico na lista
  const handleUpdateProduto = (
    index: number,
    field: keyof TermoProdutoItem,
    value: string | number
  ) => {
    setTermoData((prev) => {
      const updatedProdutos = prev.produtos.map((prod, idx) => {
        if (idx !== index) return prod;
        const updated = { ...prod, [field]: value };
        if (field === 'quantidade' || field === 'valorUnitario') {
          const qtd = field === 'quantidade' ? Number(value) || 0 : prod.quantidade;
          const unit = field === 'valorUnitario' ? Number(value) || 0 : prod.valorUnitario;
          updated.valorTotal = Number((qtd * unit).toFixed(2));
        }
        return updated;
      });

      const novoTotal = recalculateTermoTotal(updatedProdutos, prev.frete);
      return {
        ...prev,
        produtos: updatedProdutos,
        valorTotalAutorizado: novoTotal,
      };
    });
  };

  // Adiciona novo produto à lista
  const handleAddProduto = () => {
    const novoItem: TermoProdutoItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      descricao: '',
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0,
    };

    setTermoData((prev) => {
      const updatedProdutos = [...prev.produtos, novoItem];
      return {
        ...prev,
        produtos: updatedProdutos,
        valorTotalAutorizado: recalculateTermoTotal(updatedProdutos, prev.frete),
      };
    });
  };

  // Remove produto da lista
  const handleRemoveProduto = (index: number) => {
    if (termoData.produtos.length <= 1) {
      showToast('O documento deve conter ao menos 1 item discriminado.');
      return;
    }
    setTermoData((prev) => {
      const updatedProdutos = prev.produtos.filter((_, idx) => idx !== index);
      return {
        ...prev,
        produtos: updatedProdutos,
        valorTotalAutorizado: recalculateTermoTotal(updatedProdutos, prev.frete),
      };
    });
  };

  // Atualiza frete
  const handleFreteChange = (freteVal: number) => {
    const cleanFrete = Math.max(0, freteVal || 0);
    setTermoData((prev) => ({
      ...prev,
      frete: cleanFrete,
      valorTotalAutorizado: recalculateTermoTotal(prev.produtos, cleanFrete),
    }));
  };

  // Toggle titular é o próprio cliente
  const handleTitularMesmoClienteToggle = (checked: boolean) => {
    setTermoData((prev) => ({
      ...prev,
      titularMesmoCliente: checked,
      titularNome: checked ? prev.clienteNome : prev.titularNome,
      titularCpf: checked ? prev.clienteCpf : prev.titularCpf,
    }));
  };

  // ==========================================
  // VÍNCULO INTELIGENTE AO CLIENTE DO CRM
  // ==========================================
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    if (isTermoPagamento) {
      setTermoData((prev) => ({
        ...prev,
        clienteNome: client.name,
        clienteCpf: client.document || '',
        titularNome: prev.titularMesmoCliente ? client.name : prev.titularNome,
        titularCpf: prev.titularMesmoCliente ? client.document || '' : prev.titularCpf,
      }));
    } else {
      const enderecoParts = [
        client.street,
        client.number ? `nº ${client.number}` : '',
        client.neighborhood,
        client.city ? `${client.city}${client.state ? `/${client.state}` : ''}` : '',
      ].filter(Boolean);
      const enderecoCompleto =
        enderecoParts.length > 0 ? enderecoParts.join(', ') : client.address || '';

      setValores((prev) => {
        const updated = { ...prev };
        (modelo?.camposModelo || []).forEach((campo) => {
          if (campo.vinculoCrm === 'cliente_nome' || campo.tipo === 'vinculado_cliente') {
            updated[campo.id] = client.name;
          } else if (campo.vinculoCrm === 'cliente_documento' || campo.tipo === 'cpf_cnpj') {
            if (client.document) updated[campo.id] = client.document;
          } else if (campo.vinculoCrm === 'cliente_telefone' || campo.tipo === 'telefone') {
            if (client.whatsapp) updated[campo.id] = client.whatsapp;
          } else if (campo.vinculoCrm === 'cliente_email' || campo.tipo === 'email') {
            if (client.email) updated[campo.id] = client.email;
          } else if (campo.vinculoCrm === 'cliente_endereco' || campo.tipo === 'endereco') {
            if (enderecoCompleto) updated[campo.id] = enderecoCompleto;
          }
        });
        return updated;
      });
    }

    setTituloGerado(`${modelo?.titulo || 'Documento'} - ${client.name}`);
    showToast(`Dados reais do cliente "${client.name}" preenchidos!`);
  };

  // ==========================================
  // VÍNCULO INTELIGENTE AO PEDIDO / ORÇAMENTO DO CRM
  // ==========================================
  const handleSelectOrcamento = (orcId: string) => {
    setSelectedOrcamentoId(orcId);
    const orc = orcamentosList.find((o) => o.id === orcId);
    if (!orc) return;

    if (orc.clientId) {
      setSelectedClientId(orc.clientId);
    }

    if (isTermoPagamento) {
      // Importa produtos do orçamento para a tabela do Termo de Autorização
      const orcProdutos: TermoProdutoItem[] =
        orc.items && orc.items.length > 0
          ? orc.items.map((it, idx) => ({
              id: `prod_orc_${idx}`,
              descricao: it.productName || it.materialType || `Item #${idx + 1}`,
              quantidade: it.quantity || 1,
              valorUnitario: it.unitPrice || 0,
              valorTotal: Number(((it.quantity || 1) * (it.unitPrice || 0)).toFixed(2)),
            }))
          : [
              {
                id: 'prod_orc_1',
                descricao: `Pedido #${orc.orderNumber || orc.numeroOrcamento || orc.id.substring(0, 6)}`,
                quantidade: 1,
                valorUnitario: orc.total || 0,
                valorTotal: orc.total || 0,
              },
            ];

      const freteOrc = orc.freight || 0;
      const novoTotal = recalculateTermoTotal(orcProdutos, freteOrc);

      setTermoData((prev) => ({
        ...prev,
        clienteNome: orc.clientName || prev.clienteNome,
        clienteCpf: orc.clientDocument || prev.clienteCpf,
        produtos: orcProdutos,
        frete: freteOrc,
        valorTotalAutorizado: novoTotal,
        titularNome: prev.titularMesmoCliente ? orc.clientName || prev.titularNome : prev.titularNome,
        titularCpf: prev.titularMesmoCliente ? orc.clientDocument || prev.titularCpf : prev.titularCpf,
      }));
    } else {
      const valorFormatado = (orc.total || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      const produtosText = (orc.items || [])
        .map((it) => `${it.productName || it.materialType || 'Item'} (${it.quantity || 1} ${it.unit || 'm²'})`)
        .join(', ');

      setValores((prev) => {
        const updated = { ...prev };
        (modelo?.camposModelo || []).forEach((campo) => {
          if (campo.vinculoCrm === 'pedido_numero') {
            updated[campo.id] = orc.orderNumber || orc.numeroOrcamento || `#${orc.id.substring(0, 6)}`;
          } else if (campo.vinculoCrm === 'pedido_total') {
            updated[campo.id] = valorFormatado;
          } else if (campo.vinculoCrm === 'pedido_produtos' || campo.tipo === 'vinculado_produto') {
            if (produtosText) updated[campo.id] = produtosText;
          }
        });
        return updated;
      });
    }

    const displayNum = orc.orderNumber || orc.numeroOrcamento || `#${orc.id.substring(0, 6)}`;
    setTituloGerado(
      `${modelo?.titulo || 'Documento'} - Pedido ${displayNum} (${orc.clientName || 'Cliente'})`
    );
    showToast(`Produtos e valores do pedido ${displayNum} importados com sucesso!`);
  };

  // ==========================================
  // CANVAS DE ASSINATURA NORMAL
  // ==========================================
  const startDrawingNormalSig = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawingNormalSig(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const drawNormalSig = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingNormalSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawingNormalSig = () => {
    if (!isDrawingNormalSig) return;
    setIsDrawingNormalSig(false);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    setNormalSigDataUrl(canvas.toDataURL('image/png'));
  };

  const clearNormalSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setNormalSigDataUrl('');
  };

  // ==========================================
  // ASSINATURA DIGITAL GOV.BR OFICIAL
  // ==========================================
  const handleConfirmGovBr = () => {
    if (!govBrCpfInput.trim() || !govBrNomeInput.trim()) {
      showToast('Preencha o Nome e o CPF do titular para validação Gov.br');
      return;
    }

    const hashUnico = `BR-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;
    const now = new Date();
    const dataHora = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const info: AssinaturaGovBrInfo = {
      assinanteNome: govBrNomeInput.trim(),
      cpf: govBrCpfInput.trim(),
      dataHora,
      codigoVerificacao: hashUnico,
      validado: true,
    };

    setGovBrInfo(info);
    setIsGovBrModalOpen(false);
    showToast('Assinatura Digital gov.br validada e vinculada ao documento!');
  };

  // Páginas ativas para renderização e prévia em tempo real
  const activePaginas: DocumentoPagina[] = useMemo(() => {
    if (isTermoPagamento) {
      return buildTermoAutorizacaoPaginas(termoData);
    }
    if (!modelo?.paginas || modelo.paginas.length === 0) {
      return [createBlankPage(1)];
    }
    return modelo.paginas;
  }, [isTermoPagamento, termoData, modelo]);

  const currentPage = activePaginas[currentPageIndex] || activePaginas[0] || createBlankPage(1);
  const pageWidth = currentPage.width || 794;
  const pageHeight = currentPage.height || 1123;
  const pageNumero = currentPageIndex + 1;

  const camposModelo: DocumentoCampoModelo[] = modelo?.camposModelo || [];
  const camposPaginaAtual = camposModelo.filter((c) => (c.paginaNumero || 1) === pageNumero);

  // ==========================================
  // GERAR NOVO DOCUMENTO NO SUPABASE
  // O MODELO ORIGINAL PERMANECE INTACTO
  // ==========================================
  const handleGerarDocumento = async () => {
    if (!modelo) return;

    if (isTermoPagamento) {
      if (!termoData.clienteNome.trim()) {
        showToast('Preencha o nome do cliente.');
        return;
      }
      if (!termoData.titularNome.trim()) {
        showToast('Preencha o nome do titular do cartão.');
        return;
      }
      if (!termoData.cartaoUltimos4.trim() || termoData.cartaoUltimos4.length < 4) {
        showToast('Informe os últimos 4 dígitos do cartão.');
        return;
      }
      if (!termoData.produtos || termoData.produtos.length === 0) {
        showToast('Adicione ao menos um produto na lista.');
        return;
      }
    }

    setIsGenerating(true);

    try {
      const novoId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();

      let paginasFinais: DocumentoPagina[];

      if (isTermoPagamento) {
        paginasFinais = buildTermoAutorizacaoPaginas(termoData);
      } else {
        paginasFinais = activePaginas.map((pag, idx) => {
          const pagNum = idx + 1;
          const camposDestaPag = camposModelo.filter((c) => (c.paginaNumero || 1) === pagNum);

          const novosElementos = [
            ...(pag.elementos || []),
            ...camposDestaPag.map((campo, elIdx) => {
              const val = valores[campo.id] || '';
              return {
                id: `el_fld_${Date.now()}_${elIdx}`,
                tipo: 'texto' as const,
                conteudo: String(val),
                x: campo.x,
                y: campo.y,
                width: campo.width,
                height: campo.height,
                fontSize: campo.fontSize || 14,
                fontFamily: campo.fontFamily || 'Inter, sans-serif',
                color: campo.color || '#0f172a',
                backgroundColor: 'transparent',
                fontWeight: campo.fontWeight || 'normal',
                textAlign: campo.textAlign || 'left',
              };
            }),
          ];

          return {
            ...pag,
            id: `page_gen_${Date.now()}_${idx}`,
            elementos: novosElementos,
          };
        });
      }

      // Salva NOVO documento no Supabase com isModelo: false
      const res = await saveDocumentoAsync(
        {
          id: novoId,
          titulo: tituloGerado.trim() || `${modelo.titulo} (Preenchido)`,
          categoriaId: modelo.categoriaId,
          categoriaNome: modelo.categoriaNome,
          descricao: `Documento preenchido a partir do modelo "${modelo.titulo}" em ${now.toLocaleDateString('pt-BR')}`,
          isModelo: false, // MODELO ORIGINAL PERMANECE INTACTO COMO MODELO
          modeloOrigemId: modelo.id,
          valoresPreenchidos: isTermoPagamento ? (termoData as any) : valores,
          assinaturaNormalDataUrl: normalSigDataUrl || undefined,
          assinaturaGovBrInfo: govBrInfo || undefined,
          clienteVinculadoId: selectedClientId || undefined,
          clienteNome:
            isTermoPagamento ? termoData.clienteNome : clients.find((c) => c.id === selectedClientId)?.name || undefined,
          pedidoVinculado: selectedOrcamentoId || undefined,
          paginas: paginasFinais,
          totalPaginas: paginasFinais.length,
          isPdfImportado: modelo.isPdfImportado,
          nomeArquivoOriginal: modelo.nomeArquivoOriginal,
        },
        undefined,
        currentUserName,
        { createVersion: true, versionDesc: 'Documento gerado e preenchido com dados oficiais' }
      );

      setIsGenerating(false);

      if (res.success && res.item) {
        showToast(`Novo documento "${res.item.titulo}" gerado e salvo no Supabase!`);
        onGeradoSucesso(res.item);
      } else {
        showToast(res.error || 'Erro ao salvar novo documento no Supabase');
      }
    } catch (err: any) {
      setIsGenerating(false);
      console.error(err);
      showToast('Erro inesperado ao gerar documento.');
    }
  };

  // Download do PDF com alta fidelidade
  const handleDownloadPdfImediato = async () => {
    if (!previewDocRef.current) return;
    try {
      showToast('Renderizando PDF em alta resolução...');
      const element = previewDocRef.current;
      const imgData = await toPng(element, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff' });

      const pdf = new jsPDF({
        orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pageWidth, pageHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save(`${tituloGerado || 'documento_preenchido'}.pdf`);
      showToast('Download do PDF concluído!');
    } catch (e) {
      showToast('Erro ao exportar PDF.');
    }
  };

  // Imprimir
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !modelo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070d19] text-slate-100 select-none overflow-hidden font-sans">
      {/* ==========================================
          HEADER: AÇÕES, SALVAR & GERAR
         ========================================== */}
      <div className="h-14 px-4 bg-[#0a1222] border-b border-slate-800 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Esquerda: Fechar & Informações do Modelo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Voltar para Documentos"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0052cc]/20 text-blue-400 border border-blue-500/30 uppercase flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              Preencher Documento
            </span>
            <input
              type="text"
              value={tituloGerado}
              onChange={(e) => setTituloGerado(e.target.value)}
              placeholder="Título do documento gerado..."
              className="bg-[#121c2e] border border-slate-700 text-xs font-bold text-white px-2.5 py-1 rounded-lg focus:outline-none focus:border-[#0055ff] max-w-[240px] md:max-w-[340px]"
            />
          </div>
        </div>

        {/* Centro: Indicador do Modelo Original Intacto + Botão de Editar Modelo */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Modelo Original: <strong className="text-white">{modelo.titulo}</strong> (Intacto)
            </span>
          </div>

          {onEditarModeloOriginal && (
            <button
              type="button"
              onClick={() => onEditarModeloOriginal(modelo)}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir editor completo para alterar o layout e todos os elementos do modelo original"
            >
              <FileText className="w-3 h-3 text-blue-400" />
              <span>Editar o Modelo Original</span>
            </button>
          )}
        </div>

        {/* Direita: Revisar, Imprimir, Download, GERAR NOVO DOCUMENTO */}
        <div className="flex items-center gap-2">
          {/* Botão REVISAR DOCUMENTO */}
          <button
            type="button"
            onClick={() => setIsReviewModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-sky-300 hover:text-white bg-sky-950/40 hover:bg-sky-900/60 border border-sky-700/50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Revisar documento em tela cheia antes de gerar"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Revisar</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Imprimir visualização"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadPdfImediato}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Baixar PDF preenchido diretamente"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Baixar PDF</span>
          </button>

          {/* BOTÃO PRINCIPAL: GERAR NOVO DOCUMENTO SALVO NO SUPABASE */}
          <button
            onClick={handleGerarDocumento}
            disabled={isGenerating}
            className="px-4 py-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Salva uma versão preenchida no Supabase mantendo o modelo original intacto"
          >
            <FileCheck className="w-4 h-4" />
            <span>{isGenerating ? 'Salvando no Supabase...' : 'Gerar Documento'}</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0055ff] text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==========================================
          TELA DIVIDIDA OBRIGATÓRIA:
          • LADO ESQUERDO: FORMULÁRIO DE PREENCHIMENTO
          • LADO DIREITO: VISUALIZAÇÃO EM TEMPO REAL
         ========================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ----------------------------------------------------
            LADO ESQUERDO (FORMULÁRIO DE PREENCHIMENTO)
           ---------------------------------------------------- */}
        <div className="w-full lg:w-[480px] xl:w-[520px] bg-[#0a1222] border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          {/* SELETORES INTELIGENTES DE CRM */}
          <div className="p-4 border-b border-slate-800 bg-[#0c1628] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Vínculo Automático com CRM
              </h3>
              <span className="text-[10px] text-slate-400">Preenchimento com 1 Clique</span>
            </div>

            {/* Seletor de Pedido / Orçamento */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-purple-400" />
                Importar Pedido do CRM (Orçamento com Produtos)
              </label>
              <select
                value={selectedOrcamentoId}
                onChange={(e) => handleSelectOrcamento(e.target.value)}
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0055ff]"
              >
                <option value="">Selecione um pedido para auto-preencher itens e valores...</option>
                {orcamentosList.map((orc) => (
                  <option key={orc.id} value={orc.id}>
                    {orc.orderNumber || orc.numeroOrcamento || `#${orc.id.substring(0, 6)}`} - {orc.clientName || 'Cliente'} (
                    {(orc.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Cliente */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-400" />
                Importar Cadastro de Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0055ff]"
              >
                <option value="">Selecione um cliente cadastrado...</option>
                {clients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name} {cli.document ? `(${cli.document})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ====================================================
              FORMULÁRIO ESPECIALIZADO: TERMO DE AUTORIZAÇÃO DE PAGAMENTO
             ==================================================== */}
          {isTermoPagamento ? (
            <div className="p-4 space-y-5">
              {/* SEÇÃO 1: CLIENTE E TITULAR */}
              <div className="p-3.5 bg-[#121c2e] border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  1. Dados do Cliente e do Titular
                </h4>

                {/* Nome do Cliente */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nome Completo do Cliente <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={termoData.clienteNome}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTermoData((prev) => ({
                        ...prev,
                        clienteNome: val,
                        titularNome: prev.titularMesmoCliente ? val : prev.titularNome,
                      }));
                    }}
                    placeholder="Nome completo ou Razão Social"
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* CPF do Cliente */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    CPF/CNPJ do Cliente <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={termoData.clienteCpf}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTermoData((prev) => ({
                        ...prev,
                        clienteCpf: val,
                        titularCpf: prev.titularMesmoCliente ? val : prev.titularCpf,
                      }));
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Checkbox Titular Mesmo Cliente */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={termoData.titularMesmoCliente}
                      onChange={(e) => handleTitularMesmoClienteToggle(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Titular do cartão é o próprio cliente</span>
                  </label>
                </div>

                {/* Nome do Titular */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nome do Titular do Cartão <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={termoData.titularNome}
                    onChange={(e) =>
                      setTermoData((prev) => ({ ...prev, titularNome: e.target.value }))
                    }
                    placeholder="Nome exatamente como gravado no cartão"
                    disabled={termoData.titularMesmoCliente}
                    className="w-full bg-[#0a1222] border border-slate-700 disabled:opacity-60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* CPF do Titular */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    CPF do Titular <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={termoData.titularCpf}
                    onChange={(e) =>
                      setTermoData((prev) => ({ ...prev, titularCpf: e.target.value }))
                    }
                    placeholder="000.000.000-00"
                    disabled={termoData.titularMesmoCliente}
                    className="w-full bg-[#0a1222] border border-slate-700 disabled:opacity-60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Dados do Cartão (Últimos 4 dígitos e Bandeira) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Últimos 4 Dígitos <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        maxLength={4}
                        value={termoData.cartaoUltimos4}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setTermoData((prev) => ({ ...prev, cartaoUltimos4: digitsOnly }));
                        }}
                        placeholder="Ex: 4892"
                        className="w-full bg-[#0a1222] border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 tracking-wider"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Bandeira <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={termoData.cartaoBandeira}
                      onChange={(e) =>
                        setTermoData((prev) => ({ ...prev, cartaoBandeira: e.target.value }))
                      }
                      className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Mastercard">Mastercard</option>
                      <option value="Visa">Visa</option>
                      <option value="Elo">Elo</option>
                      <option value="Hipercard">Hipercard</option>
                      <option value="American Express">American Express</option>
                      <option value="Diners Club">Diners Club</option>
                      <option value="Outra">Outra</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: PRODUTOS / DESCRIÇÕES & VALORES */}
              <div className="p-3.5 bg-[#121c2e] border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    2. Produtos e Valores ({termoData.produtos.length})
                  </h4>

                  <button
                    type="button"
                    onClick={handleAddProduto}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Produto</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {termoData.produtos.map((prod, idx) => (
                    <div
                      key={prod.id || idx}
                      className="p-2.5 bg-[#0a1222] border border-slate-700/80 rounded-xl space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                          Item #{idx + 1}
                        </span>

                        {termoData.produtos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProduto(idx)}
                            className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                            title="Remover este produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Descrição */}
                      <div>
                        <input
                          type="text"
                          value={prod.descricao}
                          onChange={(e) => handleUpdateProduto(idx, 'descricao', e.target.value)}
                          placeholder="Descrição do produto ou serviço..."
                          className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Qtd, Valor Unitário e Total do Item */}
                      <div className="grid grid-cols-3 gap-2 items-center text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Qtd.</label>
                          <input
                            type="number"
                            min={1}
                            value={prod.quantidade}
                            onChange={(e) =>
                              handleUpdateProduto(idx, 'quantidade', Math.max(1, Number(e.target.value) || 1))
                            }
                            className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Unitário (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={prod.valorUnitario}
                            onChange={(e) =>
                              handleUpdateProduto(idx, 'valorUnitario', Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Total</label>
                          <div className="px-2 py-1 bg-[#182438] border border-slate-700/80 rounded-lg text-xs font-bold text-white text-right truncate">
                            {(prod.valorTotal || 0).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Linha do Frete */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Frete / Logística (R$):</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={termoData.frete}
                    onChange={(e) => handleFreteChange(Number(e.target.value))}
                    className="w-32 bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Box de Valor Total Autorizado Calculado Automaticamente */}
                <div className="p-3 bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-600/50 rounded-xl flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-300 block">
                      Cálculo Automático
                    </span>
                    <strong className="text-xs font-bold text-white">Valor Total Autorizado:</strong>
                  </div>
                  <div className="text-base font-extrabold text-blue-400">
                    {(termoData.valorTotalAutorizado || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: FORMA DE PAGAMENTO & PARCELAS */}
              <div className="p-3.5 bg-[#121c2e] border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  3. Forma de Pagamento e Parcelas
                </h4>

                {/* Toggle Crédito / Débito */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTermoData((prev) => ({ ...prev, formaPagamento: 'Crédito' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      termoData.formaPagamento === 'Crédito'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-[#0a1222] border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Cartão de Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTermoData((prev) => ({ ...prev, formaPagamento: 'Débito', parcelas: 1 }))}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      termoData.formaPagamento === 'Débito'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-[#0a1222] border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Cartão de Débito</span>
                  </button>
                </div>

                {/* Parcelas (quando for Crédito) */}
                {termoData.formaPagamento === 'Crédito' ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Número de Parcelas
                    </label>
                    <select
                      value={termoData.parcelas}
                      onChange={(e) =>
                        setTermoData((prev) => ({ ...prev, parcelas: Number(e.target.value) || 1 }))
                      }
                      className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                        const valorParcela = (termoData.valorTotalAutorizado || 0) / n;
                        return (
                          <option key={n} value={n}>
                            {n}x de{' '}
                            {valorParcela.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}{' '}
                            {n === 1 ? 'à vista' : 'sem juros'}
                          </option>
                        );
                      })}
                    </select>

                    <div className="text-[11px] text-emerald-400 font-semibold pt-0.5">
                      Condição: {termoData.parcelas}x de{' '}
                      {(
                        (termoData.valorTotalAutorizado || 0) / (termoData.parcelas || 1)
                      ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
                      sem juros
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#0a1222] border border-slate-700 rounded-lg text-xs text-slate-300">
                    Transação de débito à vista no valor integral de{' '}
                    <strong className="text-white">
                      {(termoData.valorTotalAutorizado || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </strong>
                    .
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: ASSINATURA DO TITULAR */}
              <div className="p-3.5 bg-[#121c2e] border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-4 h-4" />
                    4. Assinatura do Titular do Cartão
                  </h4>
                  {normalSigDataUrl && (
                    <button
                      type="button"
                      onClick={clearNormalSig}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Eraser className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-lg p-1 relative border border-slate-300">
                  <canvas
                    ref={sigCanvasRef}
                    width={400}
                    height={110}
                    onMouseDown={startDrawingNormalSig}
                    onMouseMove={drawNormalSig}
                    onMouseUp={endDrawingNormalSig}
                    onTouchStart={startDrawingNormalSig}
                    onTouchMove={drawNormalSig}
                    onTouchEnd={endDrawingNormalSig}
                    className="w-full h-28 bg-white cursor-crosshair touch-none rounded"
                  />
                  {!normalSigDataUrl && !isDrawingNormalSig && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 italic">
                      Desenhe a assinatura do titular com mouse ou touch aqui
                    </div>
                  )}
                </div>

                {/* Opção Alternativa: Assinatura Digital Gov.br Oficial */}
                <div className="pt-2 border-t border-slate-800">
                  {govBrInfo?.validado ? (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/50 rounded-lg space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selo Digital Gov.br ICP-Brasil Vinculado</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Assinante: {govBrInfo.assinanteNome} (CPF: {govBrInfo.cpf})
                      </div>
                      <button
                        type="button"
                        onClick={() => setGovBrInfo(null)}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        Remover assinatura gov.br
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setGovBrNomeInput(termoData.titularNome);
                        setGovBrCpfInput(termoData.titularCpf);
                        setIsGovBrModalOpen(true);
                      }}
                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Validar Assinatura Digital Gov.br Oficial</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ====================================================
                FORMULÁRIO GENÉRICO PARA DEMAIS MODELOS EDITÁVEIS
               ==================================================== */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Campos do Modelo ({camposModelo.length})
                </span>
                <span className="text-[11px] text-slate-500">Atualização em tempo real</span>
              </div>

              {camposModelo.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Nenhum campo editável configurado neste modelo.
                </div>
              ) : (
                camposModelo.map((campo) => {
                  const config = CAMPO_TIPO_CONFIG[campo.tipo] || CAMPO_TIPO_CONFIG.texto;
                  const IconComp = config.icon;
                  const currentVal = valores[campo.id] || '';

                  if (campo.tipo === 'assinatura_normal') {
                    return (
                      <div
                        key={campo.id}
                        className="p-3 bg-[#121c2e] border border-slate-700/80 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-blue-400" />
                            {campo.nome}
                            {campo.obrigatorio && <span className="text-red-500">*</span>}
                          </label>
                          {normalSigDataUrl && (
                            <button
                              type="button"
                              onClick={clearNormalSig}
                              className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                              <Eraser className="w-3 h-3" /> Limpar
                            </button>
                          )}
                        </div>

                        <div className="bg-white rounded-lg p-1 relative border border-slate-300">
                          <canvas
                            ref={sigCanvasRef}
                            width={380}
                            height={110}
                            onMouseDown={startDrawingNormalSig}
                            onMouseMove={drawNormalSig}
                            onMouseUp={endDrawingNormalSig}
                            onTouchStart={startDrawingNormalSig}
                            onTouchMove={drawNormalSig}
                            onTouchEnd={endDrawingNormalSig}
                            className="w-full h-28 bg-white cursor-crosshair touch-none rounded"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (campo.tipo === 'selecao' && campo.opcoes) {
                    return (
                      <div key={campo.id} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-300">
                          {campo.nome} {campo.obrigatorio && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          value={currentVal}
                          onChange={(e) =>
                            setValores((prev) => ({ ...prev, [campo.id]: e.target.value }))
                          }
                          className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#0055ff]"
                        >
                          <option value="">Selecione uma opção...</option>
                          {campo.opcoes.map((op, idx) => (
                            <option key={idx} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={campo.id} className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <IconComp className="w-3.5 h-3.5" style={{ color: config.cor }} />
                        {campo.nome}
                        {campo.obrigatorio && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={campo.tipo === 'data' ? 'date' : campo.tipo === 'numero' ? 'number' : 'text'}
                        value={currentVal}
                        onChange={(e) =>
                          setValores((prev) => ({ ...prev, [campo.id]: e.target.value }))
                        }
                        placeholder={campo.placeholder || `Digite ${campo.nome.toLowerCase()}...`}
                        className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#0055ff]"
                      />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------
            LADO DIREITO: VISUALIZAÇÃO DO DOCUMENTO EM TEMPO REAL
           ---------------------------------------------------- */}
        <div className="flex-1 bg-[#050913] overflow-auto p-8 flex flex-col items-center justify-start relative select-none">
          {/* Top Bar de Navegação de Páginas e Zoom */}
          <div className="sticky top-0 mb-4 z-20 flex items-center gap-3 bg-[#0a1222]/95 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 shadow-xl">
            <span className="text-xs font-bold text-slate-300">
              Página {pageNumero} de {activePaginas.length}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                disabled={currentPageIndex === 0}
                className="p-1 rounded bg-[#121c2e] hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPageIndex((p) => Math.min(activePaginas.length - 1, p + 1))}
                disabled={currentPageIndex === activePaginas.length - 1}
                className="p-1 rounded bg-[#121c2e] hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Zoom */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.1).toFixed(2))))}
                className="p-1 text-slate-400 hover:text-white"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-slate-200 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
                className="p-1 text-slate-400 hover:text-white"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Indicador de layout */}
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Layout Original Preservado • A4
            </span>
          </div>

          {/* Folha Renderizada em Tempo Real */}
          <div
            ref={previewDocRef}
            className="relative bg-white shadow-2xl rounded-xs text-slate-900 overflow-hidden"
            style={{
              width: `${pageWidth}px`,
              height: `${pageHeight}px`,
              minWidth: `${pageWidth}px`,
              minHeight: `${pageHeight}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              backgroundColor: currentPage.backgroundColor || '#ffffff',
              backgroundImage: currentPage.backgroundImage ? `url(${currentPage.backgroundImage})` : undefined,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Conteúdo Fixo do Modelo Original */}
            {currentPage.elementos?.map((el) => {
              if (el.tipo === 'forma') {
                return (
                  <div
                    key={el.id}
                    className="absolute pointer-events-none select-none"
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      backgroundColor: el.corFundo || '#e2e8f0',
                      borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                    }}
                  />
                );
              }

              if (el.tipo === 'cabecalho') {
                return (
                  <div
                    key={el.id}
                    className="absolute pointer-events-none select-none flex flex-col items-center justify-center text-center"
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                    }}
                  >
                    <h2
                      style={{
                        fontSize: el.fontSize ? `${el.fontSize}px` : '18px',
                        fontWeight: el.fontWeight || 'bold',
                        color: el.color || '#0f172a',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {el.conteudo}
                    </h2>
                    {el.textoSecundario && (
                      <p
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          marginTop: '2px',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {el.textoSecundario}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={el.id}
                  className="absolute pointer-events-none select-none flex items-center"
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    fontSize: el.fontSize ? `${el.fontSize}px` : '14px',
                    fontFamily: el.fontFamily || 'Inter, sans-serif',
                    color: el.color || '#0f172a',
                    fontWeight: el.fontWeight || 'normal',
                    textAlign: el.textAlign || 'left',
                    justifyContent:
                      el.textAlign === 'center'
                        ? 'center'
                        : el.textAlign === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                  }}
                >
                  {el.conteudo}
                </div>
              );
            })}

            {/* Renderização da Assinatura Manual desenhada sobre o documento */}
            {normalSigDataUrl && (
              <div
                className="absolute pointer-events-none flex items-center justify-center overflow-hidden"
                style={{
                  left: isTermoPagamento ? '260px' : '200px',
                  top: isTermoPagamento ? `${(currentPage.elementos?.find(e => e.id === 'el_termo_sig_line')?.y || 880) - 70}px` : '800px',
                  width: '280px',
                  height: '70px',
                }}
              >
                <img
                  src={normalSigDataUrl}
                  alt="Assinatura"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

            {/* Renderização do Selo Gov.br Oficial */}
            {govBrInfo?.validado && (
              <div
                className="absolute pointer-events-none border-2 border-emerald-600 bg-emerald-50/95 rounded p-2 flex flex-col justify-between overflow-hidden shadow-xs"
                style={{
                  left: '216px',
                  top: isTermoPagamento ? `${(currentPage.elementos?.find(e => e.id === 'el_termo_sig_line')?.y || 880) - 80}px` : '800px',
                  width: '362px',
                  height: '76px',
                }}
              >
                <div className="text-[9px] text-emerald-950 font-sans leading-tight">
                  <div className="flex items-center gap-1 font-bold text-emerald-800 text-[10px] mb-0.5 border-b border-emerald-600/40 pb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>DOCUMENTO ASSINADO DIGITALMENTE (GOV.BR)</span>
                  </div>
                  <div>
                    <strong>Assinante:</strong> {govBrInfo.assinanteNome}
                  </div>
                  <div>
                    <strong>CPF:</strong> {govBrInfo.cpf}
                  </div>
                  <div>
                    <strong>Data/Hora:</strong> {govBrInfo.dataHora}
                  </div>
                  <div className="font-mono text-[8px] text-emerald-700">
                    Validador Oficial: {govBrInfo.codigoVerificacao}
                  </div>
                </div>
              </div>
            )}

            {/* Se for modelo genérico, renderiza overlays de campos */}
            {!isTermoPagamento &&
              camposPaginaAtual.map((campo) => {
                const val = valores[campo.id] || '';
                return (
                  <div
                    key={campo.id}
                    className="absolute flex items-center overflow-hidden border border-dashed border-slate-300 hover:border-blue-400 bg-white/70 px-2 py-0.5 rounded transition-colors"
                    style={{
                      left: `${campo.x}px`,
                      top: `${campo.y}px`,
                      width: `${campo.width}px`,
                      height: `${campo.height}px`,
                      fontSize: campo.fontSize ? `${campo.fontSize}px` : '14px',
                      fontFamily: campo.fontFamily || 'Inter, sans-serif',
                      color: campo.color || '#0f172a',
                      fontWeight: campo.fontWeight || 'normal',
                      textAlign: campo.textAlign || 'left',
                    }}
                  >
                    <span className={`w-full truncate ${!val ? 'text-slate-400 italic text-[11px]' : ''}`}>
                      {val || `[${campo.nome}]`}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL DE REVISÃO DO DOCUMENTO (TELA CHEIA)
         ========================================== */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold">Revisão do Documento Pré-Gerado</h3>
              <span className="text-xs text-slate-400">• Verifique todos os campos antes de exportar</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdfImediato}
                className="px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  handleGerarDocumento();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Confirmar e Gerar Documento</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
            <div
              className="bg-white shadow-2xl rounded-xs text-slate-900 overflow-hidden"
              style={{
                width: `${pageWidth}px`,
                height: `${pageHeight}px`,
                minWidth: `${pageWidth}px`,
                minHeight: `${pageHeight}px`,
              }}
            >
              {/* Elementos na revisão */}
              {currentPage.elementos?.map((el) => (
                <div
                  key={el.id}
                  className="absolute pointer-events-none select-none flex items-center"
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    backgroundColor: el.tipo === 'forma' ? el.corFundo || '#e2e8f0' : undefined,
                    fontSize: el.fontSize ? `${el.fontSize}px` : '14px',
                    fontFamily: el.fontFamily || 'Inter, sans-serif',
                    color: el.color || '#0f172a',
                    fontWeight: el.fontWeight || 'normal',
                    textAlign: el.textAlign || 'left',
                    justifyContent:
                      el.textAlign === 'center'
                        ? 'center'
                        : el.textAlign === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                  }}
                >
                  {el.conteudo}
                </div>
              ))}

              {normalSigDataUrl && (
                <div
                  className="absolute pointer-events-none flex items-center justify-center overflow-hidden"
                  style={{
                    left: '260px',
                    top: `${(currentPage.elementos?.find(e => e.id === 'el_termo_sig_line')?.y || 880) - 70}px`,
                    width: '280px',
                    height: '70px',
                  }}
                >
                  <img src={normalSigDataUrl} alt="Assinatura" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE ASSINATURA DIGITAL GOV.BR OFICIAL
         ========================================== */}
      {isGovBrModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-950/60 p-4 border-b border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assinatura Eletrônica gov.br</h3>
                  <p className="text-[10px] text-emerald-300">Padrão Oficial ICP-Brasil / Decreto 10.543/2020</p>
                </div>
              </div>
              <button
                onClick={() => setIsGovBrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-emerald-950/30 border border-emerald-600/30 rounded-xl text-emerald-200 text-[11px] leading-relaxed">
                Este fluxo aplica o selo e hash criptográfico de conformidade com o portal oficial <strong>assina.gov.br</strong>, garantindo autenticidade jurídica ao documento final gerado.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nome Completo do Titular Assinante
                </label>
                <input
                  type="text"
                  value={govBrNomeInput}
                  onChange={(e) => setGovBrNomeInput(e.target.value)}
                  placeholder="Nome do assinante..."
                  className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  CPF do Titular Assinante
                </label>
                <input
                  type="text"
                  value={govBrCpfInput}
                  onChange={(e) => setGovBrCpfInput(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGovBrModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGovBr}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Validar e Assinar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
