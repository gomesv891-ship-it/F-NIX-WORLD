import React, { useRef, useState, useEffect } from 'react';
import {
  Settings,
  Package,
  Layers,
  Sparkles,
  DollarSign,
  Palette,
  FileText,
  Upload,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Tag,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Type,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sliders,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import {
  TabelaComercialConfig,
  TabelaLinhaProduto,
  CampoEstiloFormatacao,
  CapaElementoConfig,
} from '../../../data/tabelaRevendaModel';

interface TabelaPropertiesPanelProps {
  selectedTarget:
    | { type: 'produto'; id: string }
    | { type: 'cabecalho' }
    | { type: 'tabela' }
    | { type: 'coluna'; coluna: 'marca' | 'descricao' | 'preco' | 'unidade' }
    | { type: 'rodape' }
    | { type: 'capa' }
    | { type: 'capa_elemento'; elemento: 'fundo' | 'logo' | 'titulo' | 'vigencia' | 'subtitulo1' | 'subtitulo2' | 'parceiros' }
    | null;
  config: TabelaComercialConfig;
  produtos: TabelaLinhaProduto[];
  currentPage: number;
  currentPageTitle: string;
  onUpdateConfig: (updates: Partial<TabelaComercialConfig>) => void;
  onUpdateProduto: (id: string, updates: Partial<TabelaLinhaProduto>) => void;
  onDeleteProduto: (id: string) => void;
  onDuplicateProduto: (p: TabelaLinhaProduto) => void;
  onMoveProduto: (id: string, dir: 'up' | 'down') => void;
  onToggleMarcaAgrupamento: (marca: string, forcedValue?: boolean) => void;
  onUpdatePageTitle: (title: string) => void;
  onAddProduto: () => void;
}

const BRAND_COLOR_PRESETS = [
  { name: 'Vermelho Flexfloor', color: '#b91c1c', textColor: '#ffffff' },
  { name: 'Azul Vexa', color: '#7dd3fc', textColor: '#0f172a' },
  { name: 'Verde VinilForte', color: '#4d7c0f', textColor: '#ffffff' },
  { name: 'Laranja HD Flex', color: '#ea580c', textColor: '#ffffff' },
  { name: 'Azul Escuro Fênix', color: '#0284c7', textColor: '#ffffff' },
  { name: 'Cinza Escuro', color: '#334155', textColor: '#ffffff' },
  { name: 'Preto / Grafite', color: '#0f172a', textColor: '#ffffff' },
];

const FONT_COLOR_PRESETS = [
  '#002b66',
  '#0f172a',
  '#1e293b',
  '#334155',
  '#0284c7',
  '#0055ff',
  '#b91c1c',
  '#d97706',
  '#16a34a',
  '#ffffff',
];

export const TabelaPropertiesPanel: React.FC<TabelaPropertiesPanelProps> = ({
  selectedTarget,
  config,
  produtos,
  currentPage,
  currentPageTitle,
  onUpdateConfig,
  onUpdateProduto,
  onDeleteProduto,
  onDuplicateProduto,
  onMoveProduto,
  onToggleMarcaAgrupamento,
  onUpdatePageTitle,
  onAddProduto,
}) => {
  const capaFotoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Subaba ativa para formatação de colunas
  const [activeColunaTab, setActiveColunaTab] = useState<'marca' | 'descricao' | 'preco' | 'unidade'>('marca');

  // Subaba ativa para edição da capa
  const [activeCapaTab, setActiveCapaTab] = useState<
    'fundo' | 'logo' | 'titulo' | 'vigencia' | 'subtitulo' | 'parceiros'
  >('fundo');

  // Sincroniza abas contextualmente com a seleção
  useEffect(() => {
    if (selectedTarget?.type === 'coluna') {
      setActiveColunaTab(selectedTarget.coluna);
    } else if (selectedTarget?.type === 'capa_elemento') {
      if (selectedTarget.elemento === 'subtitulo1' || selectedTarget.elemento === 'subtitulo2') {
        setActiveCapaTab('subtitulo');
      } else {
        setActiveCapaTab(selectedTarget.elemento);
      }
    }
  }, [selectedTarget]);

  const selectedProduto =
    selectedTarget?.type === 'produto'
      ? produtos.find((p) => p.id === selectedTarget.id) || null
      : null;

  const isSelectedMarcaAgrupada = selectedProduto
    ? config.marcasAgrupadas && config.marcasAgrupadas[selectedProduto.marcaLinha] !== undefined
      ? config.marcasAgrupadas[selectedProduto.marcaLinha]
      : config.agruparMarcasGlobal !== false
    : true;

  const handleCapaFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateConfig({ capaFotoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateConfig({ logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Helper para atualizar formatação independente de coluna
  const updateColunaEstilo = (
    coluna: 'marca' | 'descricao' | 'preco' | 'unidade',
    updates: Partial<CampoEstiloFormatacao>
  ) => {
    if (coluna === 'marca') {
      onUpdateConfig({
        estiloMarca: {
          ...(config.estiloMarca || { fontSize: 12, color: '#002b66', bold: true, align: 'center' }),
          ...updates,
        },
      });
    } else if (coluna === 'descricao') {
      onUpdateConfig({
        estiloDescricao: {
          ...(config.estiloDescricao || { fontSize: 12, color: '#0f172a', bold: false, align: 'left' }),
          ...updates,
        },
      });
    } else if (coluna === 'preco') {
      onUpdateConfig({
        estiloPreco: {
          ...(config.estiloPreco || { fontSize: 13, color: '#002b66', bold: true, align: 'right' }),
          ...updates,
        },
      });
    } else if (coluna === 'unidade') {
      onUpdateConfig({
        estiloUnidade: {
          ...(config.estiloUnidade || { fontSize: 11, color: '#64748b', bold: false, align: 'center' }),
          ...updates,
        },
      });
    }
  };

  const getColunaEstiloAtual = (coluna: 'marca' | 'descricao' | 'preco' | 'unidade'): CampoEstiloFormatacao => {
    if (coluna === 'marca') {
      return config.estiloMarca || { fontSize: 12, color: '#002b66', bold: true, italic: false, align: 'center' };
    }
    if (coluna === 'descricao') {
      return config.estiloDescricao || { fontSize: config.fontSizeDescricao || 12, color: '#0f172a', bold: false, italic: false, align: 'left' };
    }
    if (coluna === 'preco') {
      return config.estiloPreco || { fontSize: config.fontSizePreco || 13, color: '#002b66', bold: true, italic: false, align: 'right' };
    }
    return config.estiloUnidade || { fontSize: 11, color: '#64748b', bold: false, italic: false, align: 'center' };
  };

  return (
    <div className="w-84 bg-[#0a1222] border-l border-slate-800 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-[#0055ff]" />
          <span>Painel de Propriedades</span>
        </h4>
        {selectedTarget && (
          <span className="text-[10px] text-[#0055ff] font-bold bg-[#0055ff]/15 px-2 py-0.5 rounded uppercase">
            {selectedTarget.type === 'coluna'
              ? `Coluna ${selectedTarget.coluna}`
              : selectedTarget.type === 'capa_elemento'
              ? `Capa: ${selectedTarget.elemento}`
              : selectedTarget.type}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ====================================================
            1. QUANDO UM PRODUTO ESTÁ SELECIONADO
           ==================================================== */}
        {selectedProduto ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Editar Produto</span>
              <span className="text-[10px] text-slate-400">ID: {selectedProduto.id}</span>
            </div>

            {/* Marca / Linha */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Marca / Linha *
              </label>
              <input
                type="text"
                value={selectedProduto.marcaLinha}
                onChange={(e) =>
                  onUpdateProduto(selectedProduto.id, { marcaLinha: e.target.value.toUpperCase() })
                }
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-bold uppercase focus:outline-none focus:border-[#0055ff]"
              />
            </div>

            {/* Agrupamento individual desta marca */}
            <div className="p-2.5 bg-[#121c2e] rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">
                  Agrupar Marca no Catálogo
                </span>
                <span className="text-[10px] text-blue-400 font-bold">
                  {isSelectedMarcaAgrupada ? 'Ativo (1 Bloco)' : 'Desagrupado'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Consolida produtos desta mesma marca em um único bloco vertical na página.
              </p>
              <button
                type="button"
                onClick={() => onToggleMarcaAgrupamento(selectedProduto.marcaLinha)}
                className={`w-full mt-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelectedMarcaAgrupada
                    ? 'bg-[#0055ff] hover:bg-[#0044cc] text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {isSelectedMarcaAgrupada ? '✓ Marca Agrupada Lateralmente' : 'Desagrupada (Linha a linha)'}
              </button>
            </div>

            {/* Descrição Principal */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Descrição do Produto *
              </label>
              <input
                type="text"
                value={selectedProduto.descricao}
                onChange={(e) =>
                  onUpdateProduto(selectedProduto.id, { descricao: e.target.value })
                }
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-[#0055ff]"
              />
            </div>

            {/* Sub-descrição */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Sub-descrição / Especificação
              </label>
              <input
                type="text"
                value={selectedProduto.subDescricao || ''}
                onChange={(e) =>
                  onUpdateProduto(selectedProduto.id, { subDescricao: e.target.value })
                }
                placeholder="Ex: Espessura, dimensões, textura..."
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#0055ff]"
              />
            </div>

            {/* Preço e Unidade */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedProduto.preco}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      onUpdateProduto(selectedProduto.id, { preco: val, isPrecoManual: true });
                    }
                  }}
                  className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-extrabold focus:outline-none focus:border-[#0055ff]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Unidade</label>
                <input
                  type="text"
                  value={selectedProduto.unidade}
                  onChange={(e) =>
                    onUpdateProduto(selectedProduto.id, { unidade: e.target.value })
                  }
                  className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-center focus:outline-none focus:border-[#0055ff]"
                />
              </div>
            </div>

            {/* Promoção */}
            <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selectedProduto.promocao)}
                  onChange={(e) =>
                    onUpdateProduto(selectedProduto.id, { promocao: e.target.checked })
                  }
                  className="rounded text-red-600 focus:ring-0"
                />
                <span className="font-bold text-white text-xs">Destacar como Promoção</span>
              </label>

              {selectedProduto.promocao && (
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Texto da Badge</label>
                  <input
                    type="text"
                    value={selectedProduto.promocaoTexto || 'PROMOÇÃO'}
                    onChange={(e) =>
                      onUpdateProduto(selectedProduto.id, { promocaoTexto: e.target.value })
                    }
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                </div>
              )}
            </div>

            {/* Cor de Fundo da Marca */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                Cor da Faixa da Marca
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {BRAND_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      onUpdateProduto(selectedProduto.id, {
                        marcaCor: p.color,
                        marcaTextColor: p.textColor,
                      })
                    }
                    className="h-7 rounded-lg border border-slate-700 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  >
                    {selectedProduto.marcaCor === p.color && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Ações do Produto */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onMoveProduto(selectedProduto.id, 'up')}
                  className="py-1.5 bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Subir</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMoveProduto(selectedProduto.id, 'down')}
                  className="py-1.5 bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Descer</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDuplicateProduto(selectedProduto)}
                className="w-full py-1.5 bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Duplicar Este Produto</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteProduto(selectedProduto.id)}
                className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Produto</span>
              </button>
            </div>
          </div>
        ) : selectedTarget?.type === 'coluna' || selectedTarget?.type === 'tabela' ? (
          /* ====================================================
              2. FORMATAÇÃO INDEPENDENTE DE COLUNAS & TABELA (PROMPT 5)
             ==================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Formatação de Colunas</span>
              <span className="text-[10px] text-blue-400 font-bold uppercase">Prompt 5</span>
            </div>

            {/* Abas das 4 Colunas Obrigatórias */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#121c2e] rounded-xl border border-slate-800">
              {(
                [
                  { id: 'marca', label: 'Marca' },
                  { id: 'descricao', label: 'Descr.' },
                  { id: 'preco', label: 'Preço' },
                  { id: 'unidade', label: 'Unid.' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveColunaTab(tab.id)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeColunaTab === tab.id
                      ? 'bg-[#0055ff] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Painel de Controles da Coluna Selecionada */}
            {(() => {
              const estilo = getColunaEstiloAtual(activeColunaTab);
              const colNome =
                activeColunaTab === 'marca'
                  ? 'MARCA / LINHA'
                  : activeColunaTab === 'descricao'
                  ? 'DESCRIÇÃO'
                  : activeColunaTab === 'preco'
                  ? 'PREÇO'
                  : 'UNIDADE';

              return (
                <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-700/50">
                    <span className="font-extrabold text-white text-xs">Coluna: {colNome}</span>
                    <span className="text-[10px] text-slate-400">Controle independente</span>
                  </div>

                  {/* Tamanho da Fonte */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Tamanho da Fonte (px)
                      </label>
                      <span className="text-xs font-extrabold text-blue-400">
                        {estilo.fontSize || 12}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={8}
                        max={24}
                        value={estilo.fontSize || 12}
                        onChange={(e) =>
                          updateColunaEstilo(activeColunaTab, { fontSize: Number(e.target.value) })
                        }
                        className="flex-1 accent-[#0055ff]"
                      />
                      <input
                        type="number"
                        min={8}
                        max={32}
                        value={estilo.fontSize || 12}
                        onChange={(e) =>
                          updateColunaEstilo(activeColunaTab, { fontSize: Number(e.target.value) || 12 })
                        }
                        className="w-14 bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-center text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Cor da Fonte */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Cor da Fonte
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={estilo.color || '#002b66'}
                        onChange={(e) =>
                          updateColunaEstilo(activeColunaTab, { color: e.target.value })
                        }
                        className="w-10 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={estilo.color || '#002b66'}
                        onChange={(e) =>
                          updateColunaEstilo(activeColunaTab, { color: e.target.value })
                        }
                        className="flex-1 bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {FONT_COLOR_PRESETS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateColunaEstilo(activeColunaTab, { color: hex })}
                          className="w-5 h-5 rounded-md border border-slate-700 cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Negrito e Itálico */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Estilo da Fonte
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateColunaEstilo(activeColunaTab, { bold: !estilo.bold })
                        }
                        className={`py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          estilo.bold
                            ? 'bg-[#0055ff] border-[#0055ff] text-white'
                            : 'bg-[#0a1222] border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                        <span>Negrito</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateColunaEstilo(activeColunaTab, { italic: !estilo.italic })
                        }
                        className={`py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          estilo.italic
                            ? 'bg-[#0055ff] border-[#0055ff] text-white'
                            : 'bg-[#0a1222] border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Italic className="w-3.5 h-3.5" />
                        <span>Itálico</span>
                      </button>
                    </div>
                  </div>

                  {/* Alinhamento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Alinhamento da Coluna
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-[#0a1222] p-1 rounded-lg border border-slate-700">
                      {(
                        [
                          { id: 'left', label: 'Esquerda', icon: AlignLeft },
                          { id: 'center', label: 'Centro', icon: AlignCenter },
                          { id: 'right', label: 'Direita', icon: AlignRight },
                        ] as const
                      ).map((al) => {
                        const Icon = al.icon;
                        const isCurrent = (estilo.align || 'left') === al.id;
                        return (
                          <button
                            key={al.id}
                            type="button"
                            onClick={() =>
                              updateColunaEstilo(activeColunaTab, { align: al.id })
                            }
                            className={`py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-[#0055ff] text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{al.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Agrupamento Global e Layout da Tabela */}
            <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 text-xs block pb-1 border-b border-slate-800">
                Layout Geral da Tabela
              </span>

              {/* Agrupamento Global de Marcas */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-300 text-[11px]">
                    Agrupar Marcas Lateralmente
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Ocupa verticalmente as linhas dos produtos
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ agruparMarcasGlobal: true })}
                  className={`py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    config.agruparMarcasGlobal !== false
                      ? 'bg-[#0055ff] text-white'
                      : 'bg-[#0a1222] text-slate-400 hover:text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>SIM (Agrupar)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateConfig({ agruparMarcasGlobal: false })}
                  className={`py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    config.agruparMarcasGlobal === false
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#0a1222] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>NÃO (Linha a linha)</span>
                </button>
              </div>

              {/* Largura das Colunas */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Largura Marca (px)</label>
                  <input
                    type="number"
                    min={120}
                    max={360}
                    value={config.colunaMarcaWidth || 220}
                    onChange={(e) =>
                      onUpdateConfig({ colunaMarcaWidth: Number(e.target.value) || 220 })
                    }
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Largura Preço (px)</label>
                  <input
                    type="number"
                    min={80}
                    max={200}
                    value={config.colunaPrecoWidth || 120}
                    onChange={(e) =>
                      onUpdateConfig({ colunaPrecoWidth: Number(e.target.value) || 120 })
                    }
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold"
                  />
                </div>
              </div>

              {/* Altura da Linha */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Altura da Linha (px)</label>
                <input
                  type="number"
                  min={28}
                  max={80}
                  value={config.alturaLinha || 38}
                  onChange={(e) => onUpdateConfig({ alturaLinha: Number(e.target.value) || 38 })}
                  className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold"
                />
              </div>

              {/* Cores do Cabeçalho da Tabela */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Fundo Cabeçalho</label>
                  <input
                    type="color"
                    value={config.tabelaHeaderBg || '#0b192e'}
                    onChange={(e) => onUpdateConfig({ tabelaHeaderBg: e.target.value })}
                    className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Texto Cabeçalho</label>
                  <input
                    type="color"
                    value={config.tabelaHeaderColor || '#ffffff'}
                    onChange={(e) => onUpdateConfig({ tabelaHeaderColor: e.target.value })}
                    className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Botão Adicionar Produto */}
            <button
              type="button"
              onClick={onAddProduto}
              className="w-full py-2 bg-[#0055ff] hover:bg-[#0044cc] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>+ Adicionar Produto à Página</span>
            </button>
          </div>
        ) : selectedTarget?.type === 'capa' || selectedTarget?.type === 'capa_elemento' || currentPage === 1 ? (
          /* ====================================================
              3. EDIÇÃO COMPLETA DA CAPA (PROMPT 5)
             ==================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Editar Capa Oficial</span>
              <span className="text-[10px] text-blue-400 font-bold uppercase">Página 1</span>
            </div>

            {/* Abas dos Elementos da Capa */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#121c2e] rounded-xl border border-slate-800">
              {(
                [
                  { id: 'fundo', label: 'Fundo/Foto' },
                  { id: 'logo', label: 'Logo' },
                  { id: 'titulo', label: 'Título' },
                  { id: 'vigencia', label: 'Vigência' },
                  { id: 'subtitulo', label: 'Subtítulos' },
                  { id: 'parceiros', label: 'Parceiros' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCapaTab(tab.id)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeCapaTab === tab.id
                      ? 'bg-[#0055ff] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ABA: FUNDO / FOTO 100% */}
            {activeCapaTab === 'fundo' && (
              <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3.5">
                <span className="font-bold text-white text-xs block pb-1 border-b border-slate-700/50">
                  Imagem de Fundo da Capa
                </span>

                {/* Modo: 100% Página Inteira vs Dividida */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Layout da Capa
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ capaImagemModo: 'pagina_inteira' })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        config.capaImagemModo === 'pagina_inteira'
                          ? 'bg-[#0055ff] text-white shadow-sm'
                          : 'bg-[#0a1222] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      <span>100% Página Inteira</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ capaImagemModo: 'dividida' })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        config.capaImagemModo !== 'pagina_inteira'
                          ? 'bg-[#0055ff] text-white shadow-sm'
                          : 'bg-[#0a1222] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      <span>Dividida (2 Colunas)</span>
                    </button>
                  </div>
                </div>

                {/* Opção Preencher vs Ajustar */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Enquadramento da Imagem
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ capaFotoFit: 'preencher' })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        config.capaFotoFit !== 'ajustar'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-[#0a1222] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                      title="Preencher toda a área da página (cover)"
                    >
                      <Maximize2 className="w-3.5 h-3.5 inline mr-1" />
                      <span>Preencher (100%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ capaFotoFit: 'ajustar' })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        config.capaFotoFit === 'ajustar'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-[#0a1222] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                      title="Ajustar proporcionalmente sem cortes (contain)"
                    >
                      <span>Ajustar (Proporcional)</span>
                    </button>
                  </div>
                </div>

                {/* Upload e Substituição */}
                <div>
                  <input
                    ref={capaFotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCapaFotoUpload}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => capaFotoInputRef.current?.click()}
                      className="py-2 bg-[#0055ff] hover:bg-[#0044cc] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{config.capaFotoUrl ? 'Substituir Imagem' : 'Upload Imagem'}</span>
                    </button>

                    {config.capaFotoUrl && (
                      <button
                        type="button"
                        onClick={() => onUpdateConfig({ capaFotoUrl: '' })}
                        className="py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Remover imagem mantendo os elementos editáveis sobre o fundo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Imagem</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cor de Fundo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Cor de Fundo da Capa
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.capaCorFundo || '#ffffff'}
                      onChange={(e) => onUpdateConfig({ capaCorFundo: e.target.value })}
                      className="w-10 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.capaCorFundo || '#ffffff'}
                      onChange={(e) => onUpdateConfig({ capaCorFundo: e.target.value })}
                      className="flex-1 bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Escurecimento / Overlay da Foto */}
                {config.capaFotoUrl && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Escurecimento da Foto (Contraste)
                      </label>
                      <span className="text-xs font-bold text-blue-400">
                        {config.capaOverlayOpacidade ?? 25}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      value={config.capaOverlayOpacidade ?? 25}
                      onChange={(e) =>
                        onUpdateConfig({ capaOverlayOpacidade: Number(e.target.value) })
                      }
                      className="w-full accent-[#0055ff]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ABA: LOGO OFICIAL */}
            {activeCapaTab === 'logo' && (
              <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3.5">
                <span className="font-bold text-white text-xs block pb-1 border-b border-slate-700/50">
                  Logo na Capa
                </span>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-xs">Exibir Logo na Capa</span>
                  <input
                    type="checkbox"
                    checked={config.capaLogoVisible !== false}
                    onChange={(e) => onUpdateConfig({ capaLogoVisible: e.target.checked })}
                    className="rounded text-[#0055ff]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">Altura do Logo (px)</label>
                    <span className="text-xs font-bold text-blue-400">{config.capaLogoHeight || 64}px</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={150}
                    value={config.capaLogoHeight || 64}
                    onChange={(e) => onUpdateConfig({ capaLogoHeight: Number(e.target.value) })}
                    className="w-full accent-[#0055ff]"
                  />
                </div>

                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-2 bg-[#0a1222] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Trocar Imagem do Logo</span>
                  </button>
                </div>
              </div>
            )}

            {/* ABA: TÍTULO DA CAPA */}
            {activeCapaTab === 'titulo' && (
              <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3.5">
                <span className="font-bold text-white text-xs block pb-1 border-b border-slate-700/50">
                  Título Principal da Capa
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Texto do Título
                  </label>
                  <input
                    type="text"
                    value={config.nome}
                    onChange={(e) => onUpdateConfig({ nome: e.target.value })}
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-black"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">Tamanho da Fonte (px)</label>
                    <span className="text-xs font-bold text-blue-400">
                      {config.capaTituloConfig?.fontSize || 60}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={24}
                    max={96}
                    value={config.capaTituloConfig?.fontSize || 60}
                    onChange={(e) =>
                      onUpdateConfig({
                        capaTituloConfig: {
                          ...(config.capaTituloConfig || {}),
                          fontSize: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#0055ff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Cor do Título
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.capaTituloConfig?.color || '#002b66'}
                      onChange={(e) =>
                        onUpdateConfig({
                          capaTituloConfig: {
                            ...(config.capaTituloConfig || {}),
                            color: e.target.value,
                          },
                        })
                      }
                      className="w-10 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.capaTituloConfig?.color || '#002b66'}
                      onChange={(e) =>
                        onUpdateConfig({
                          capaTituloConfig: {
                            ...(config.capaTituloConfig || {}),
                            color: e.target.value,
                          },
                        })
                      }
                      className="flex-1 bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        capaTituloConfig: {
                          ...(config.capaTituloConfig || {}),
                          bold: config.capaTituloConfig?.bold === false ? true : false,
                        },
                      })
                    }
                    className={`py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      config.capaTituloConfig?.bold !== false
                        ? 'bg-[#0055ff] border-[#0055ff] text-white'
                        : 'bg-[#0a1222] border-slate-700 text-slate-400'
                    }`}
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>Negrito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        capaTituloConfig: {
                          ...(config.capaTituloConfig || {}),
                          italic: !config.capaTituloConfig?.italic,
                        },
                      })
                    }
                    className={`py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      config.capaTituloConfig?.italic
                        ? 'bg-[#0055ff] border-[#0055ff] text-white'
                        : 'bg-[#0a1222] border-slate-700 text-slate-400'
                    }`}
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>Itálico</span>
                  </button>
                </div>
              </div>
            )}

            {/* ABA: VIGÊNCIA MÊS / ANO */}
            {activeCapaTab === 'vigencia' && (
              <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3.5">
                <span className="font-bold text-white text-xs block pb-1 border-b border-slate-700/50">
                  Vigência da Tabela
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Mês</label>
                    <input
                      type="text"
                      value={config.mes}
                      onChange={(e) => onUpdateConfig({ mes: e.target.value })}
                      className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Ano</label>
                    <input
                      type="text"
                      value={config.ano}
                      onChange={(e) => onUpdateConfig({ ano: e.target.value })}
                      className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Cor do Texto
                  </label>
                  <input
                    type="color"
                    value={config.capaVigenciaConfig?.color || '#002b66'}
                    onChange={(e) =>
                      onUpdateConfig({
                        capaVigenciaConfig: {
                          ...(config.capaVigenciaConfig || {}),
                          color: e.target.value,
                        },
                      })
                    }
                    className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Cor das Linhas Divisórias
                  </label>
                  <input
                    type="color"
                    value={config.capaVigenciaConfig?.dividerColor || '#0284c7'}
                    onChange={(e) =>
                      onUpdateConfig({
                        capaVigenciaConfig: {
                          ...(config.capaVigenciaConfig || {}),
                          dividerColor: e.target.value,
                        },
                      })
                    }
                    className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* ABA: SUBTÍTULOS */}
            {activeCapaTab === 'subtitulo' && (
              <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3.5">
                <span className="font-bold text-white text-xs block pb-1 border-b border-slate-700/50">
                  Subtítulos da Capa
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Subtítulo 1
                  </label>
                  <input
                    type="text"
                    value={config.subtituloCapa1}
                    onChange={(e) => onUpdateConfig({ subtituloCapa1: e.target.value })}
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Subtítulo 2
                  </label>
                  <input
                    type="text"
                    value={config.subtituloCapa2}
                    onChange={(e) => onUpdateConfig({ subtituloCapa2: e.target.value })}
                    className="w-full bg-[#0a1222] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Cor dos Subtítulos
                  </label>
                  <input
                    type="color"
                    value={config.capaSubtitulo1Config?.color || '#334155'}
                    onChange={(e) =>
                      onUpdateConfig({
                        capaSubtitulo1Config: {
                          ...(config.capaSubtitulo1Config || {}),
                          color: e.target.value,
                        },
                        capaSubtitulo2Config: {
                          ...(config.capaSubtitulo2Config || {}),
                          color: e.target.value,
                        },
                      })
                    }
                    className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* ABA: PARCEIROS OFICIAIS */}
            {activeCapaTab === 'parceiros' && (
              <div className="p-3 bg-[#121c2e] rounded-xl border border-slate-800 space-y-3.5">
                <span className="font-bold text-white text-xs block pb-1 border-b border-slate-700/50">
                  Marcas e Parceiros na Capa
                </span>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-xs">Exibir Faixa de Parceiros</span>
                  <input
                    type="checkbox"
                    checked={config.capaParceirosConfig?.visible !== false}
                    onChange={(e) =>
                      onUpdateConfig({
                        capaParceirosConfig: {
                          ...(config.capaParceirosConfig || {}),
                          visible: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-[#0055ff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Cor dos Nomes das Marcas
                  </label>
                  <input
                    type="color"
                    value={config.capaParceirosConfig?.color || '#475569'}
                    onChange={(e) =>
                      onUpdateConfig({
                        capaParceirosConfig: {
                          ...(config.capaParceirosConfig || {}),
                          color: e.target.value,
                        },
                      })
                    }
                    className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        ) : selectedTarget?.type === 'cabecalho' ? (
          /* ====================================================
              4. CABEÇALHO DAS PÁGINAS DE CONTEÚDO
             ==================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Editar Cabeçalho</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Título desta Página ({currentPage})
              </label>
              <input
                type="text"
                value={currentPageTitle}
                onChange={(e) => onUpdatePageTitle(e.target.value)}
                className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
              />
            </div>
          </div>
        ) : selectedTarget?.type === 'rodape' ? (
          /* ====================================================
              5. RODAPÉ
             ==================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Editar Rodapé</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Texto de Observação Legal / Rodapé
              </label>
              <textarea
                rows={4}
                value={config.observacaoRodape}
                onChange={(e) => onUpdateConfig({ observacaoRodape: e.target.value })}
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#0055ff]"
              />
            </div>
          </div>
        ) : (
          /* ====================================================
              NENHUM ELEMENTO SELECIONADO
             ==================================================== */
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Package className="w-8 h-8 opacity-40 text-[#0055ff]" />
            <p className="text-xs font-semibold text-slate-300">
              Selecione um elemento para formatar
            </p>
            <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
              Clique nas colunas (Marca, Descrição, Preço, Unidade), nos produtos ou nos elementos da Capa para editar estilos, fontes e cores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
