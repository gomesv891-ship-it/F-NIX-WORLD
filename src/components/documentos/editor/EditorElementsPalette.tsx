import React, { useRef } from 'react';
import {
  Type,
  ImageIcon,
  Table as TableIcon,
  Square,
  Minus,
  LayoutTemplate,
  Sliders,
  FileBadge,
  Sparkles,
  Upload,
  Palette,
  Layers,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import {
  TipoCampoModelo,
  DocumentoElemento,
  DocumentoPagina,
} from '../../../types';
import { CAMPO_TIPO_CONFIG } from '../ModeloCamposEditorModal';

interface EditorElementsPaletteProps {
  activeTab: 'elementos' | 'campos' | 'pagina';
  onChangeTab: (tab: 'elementos' | 'campos' | 'pagina') => void;
  currentPage: DocumentoPagina;
  onAddElement: (el: Omit<DocumentoElemento, 'id'>) => void;
  onAddCampo: (tipo: TipoCampoModelo) => void;
  onUpdatePage: (updates: Partial<DocumentoPagina>) => void;
  onUploadPageBackground: (file: File) => void;
}

export const EditorElementsPalette: React.FC<EditorElementsPaletteProps> = ({
  activeTab,
  onChangeTab,
  currentPage,
  onAddElement,
  onAddCampo,
  onUpdatePage,
  onUploadPageBackground,
}) => {
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const width = 280;
        const height = Math.round(width / aspect);
        onAddElement({
          tipo: 'imagem',
          src: dataUrl,
          x: 60,
          y: 120,
          width,
          height,
          fit: 'contain',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPageBackground(file);
    }
    e.target.value = '';
  };

  return (
    <div className="w-64 bg-[#0a1222] border-r border-slate-800 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-[#080f1d] p-1.5 gap-1 shrink-0">
        <button
          onClick={() => onChangeTab('elementos')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'elementos'
              ? 'bg-[#0055ff] text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Elementos</span>
        </button>

        <button
          onClick={() => onChangeTab('campos')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'campos'
              ? 'bg-[#0055ff] text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Campos</span>
        </button>

        <button
          onClick={() => onChangeTab('pagina')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'pagina'
              ? 'bg-[#0055ff] text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Fundo e Formato da Página"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={imageUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelect}
      />
      <input
        ref={bgFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBgSelect}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: ELEMENTOS VISUAIS */}
        {activeTab === 'elementos' && (
          <div className="space-y-4">
            {/* Textos */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Type className="w-3 h-3 text-[#0055ff]" />
                <span>Textos & Tipografia</span>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'texto',
                      conteudo: 'Título Principal',
                      fontSize: 28,
                      fontWeight: '700',
                      color: '#091122',
                      x: 60,
                      y: 80,
                      width: 480,
                      height: 48,
                      fontFamily: 'Inter, sans-serif',
                    })
                  }
                  className="w-full text-left p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="text-sm font-bold">Título Grande</span>
                  <span className="text-[10px] text-slate-500">28px</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'texto',
                      conteudo: 'Subtítulo da Seção ou Catálogo',
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#0055ff',
                      x: 60,
                      y: 135,
                      width: 420,
                      height: 34,
                      fontFamily: 'Inter, sans-serif',
                    })
                  }
                  className="w-full text-left p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Subtítulo</span>
                  <span className="text-[10px] text-slate-500">18px</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'texto',
                      conteudo:
                        'Insira aqui o parágrafo descritivo com detalhes técnicos, especificações e condições.',
                      fontSize: 13,
                      fontWeight: 'normal',
                      color: '#334155',
                      x: 60,
                      y: 180,
                      width: 500,
                      height: 60,
                      lineHeight: 1.5,
                      fontFamily: 'Inter, sans-serif',
                    })
                  }
                  className="w-full text-left p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Parágrafo Normal</span>
                  <span className="text-[10px] text-slate-500">13px</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'texto',
                      conteudo: 'DESTAQUE: PREÇO ESPECIAL / LINHA EXCLUSIVA',
                      fontSize: 12,
                      fontWeight: '700',
                      color: '#ffffff',
                      backgroundColor: '#0055ff',
                      borderRadius: 6,
                      padding: 8,
                      textAlign: 'center',
                      x: 60,
                      y: 250,
                      width: 380,
                      height: 38,
                    })
                  }
                  className="w-full text-left p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-blue-400 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Tag / Destaque</span>
                  <span className="text-[10px] text-slate-500">Badge</span>
                </button>
              </div>
            </div>

            {/* Imagens & Logos */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-[#0055ff]" />
                <span>Imagens & Logos</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => imageUploadRef.current?.click()}
                  className="p-2.5 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-[11px]">Enviar Imagem</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'logo',
                      src: '/public/fenix_official_logo.png',
                      x: 60,
                      y: 40,
                      width: 140,
                      height: 48,
                      fit: 'contain',
                    })
                  }
                  className="p-2.5 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileBadge className="w-4 h-4 text-[#0055ff]" />
                  <span className="font-semibold text-[11px]">Logo Oficial</span>
                </button>
              </div>
            </div>

            {/* Tabela de Produtos / Conteúdo */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <TableIcon className="w-3 h-3 text-[#0055ff]" />
                <span>Tabela de Produtos / Preços</span>
              </div>
              <button
                onClick={() =>
                  onAddElement({
                    tipo: 'tabela',
                    x: 50,
                    y: 200,
                    width: 694,
                    height: 180,
                    headerBg: '#091122',
                    headerColor: '#ffffff',
                    tabelaHeaders: ['CÓDIGO', 'DESCRIÇÃO DO PRODUTO', 'UNIDADE', 'PREÇO'],
                    tabelaLinhas: [
                      ['FX-01', 'Piso Vinílico Hospitalar 2mm', 'm²', 'R$ 89,90'],
                      ['FX-02', 'Manta Vinílica Condutiva', 'm²', 'R$ 119,00'],
                      ['FX-03', 'Cordão de Solda Térmica', 'ml', 'R$ 6,80'],
                      ['FX-04', 'Rodapé Hospitalar Curvo', 'ml', 'R$ 14,50'],
                    ],
                  })
                }
                className="w-full text-left p-2.5 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-500/20 text-[#0055ff]">
                    <TableIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-[11px]">Inserir Tabela</p>
                    <p className="text-[10px] text-slate-400">4 colunas, cabeçalho e linhas</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Formas, Linhas & Blocos */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Square className="w-3 h-3 text-[#0055ff]" />
                <span>Formas & Estrutura</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'forma',
                      formaTipo: 'cartao',
                      x: 60,
                      y: 300,
                      width: 320,
                      height: 140,
                      fillColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderRadius: 10,
                    })
                  }
                  className="p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-[11px]">Bloco / Card</p>
                  <p className="text-[10px] text-slate-500">Fundo com borda</p>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'linha',
                      x: 60,
                      y: 220,
                      width: 674,
                      height: 4,
                      borderColor: '#0055ff',
                      espessuraLinha: 2,
                      linhaEstilo: 'solid',
                    })
                  }
                  className="p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-[11px]">Linha Divisória</p>
                  <p className="text-[10px] text-slate-500">Separador de seção</p>
                </button>
              </div>
            </div>

            {/* Cabeçalho e Rodapé Oficial */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <LayoutTemplate className="w-3 h-3 text-[#0055ff]" />
                <span>Cabeçalho & Rodapé</span>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'cabecalho',
                      conteudo: 'CATÁLOGO OFICIAL 2026',
                      textoSecundario: 'Linha Hospitalar e Corporativa',
                      x: 40,
                      y: 30,
                      width: 714,
                      height: 50,
                    })
                  }
                  className="w-full p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold text-[11px]">Cabeçalho Fênix</span>
                  <span className="text-[10px] text-blue-400">Topo</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      tipo: 'rodape',
                      conteudo: 'Fênix World Distribuidora • www.fenixworld.com.br',
                      x: 40,
                      y: (currentPage.height || 1123) - 60,
                      width: 714,
                      height: 35,
                    })
                  }
                  className="w-full p-2 rounded-xl bg-[#121c2e] hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold text-[11px]">Rodapé Oficial</span>
                  <span className="text-[10px] text-blue-400">Base</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAMPOS DE MODELO & CRM */}
        {activeTab === 'campos' && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-slate-400 mb-2 leading-tight">
              Clique em um campo para posicioná-lo sobre a página do modelo:
            </p>
            {(Object.keys(CAMPO_TIPO_CONFIG) as TipoCampoModelo[]).map((tipoKey) => {
              const cfg = CAMPO_TIPO_CONFIG[tipoKey];
              const IconComp = cfg.icon;

              return (
                <button
                  key={tipoKey}
                  onClick={() => onAddCampo(tipoKey)}
                  className="w-full text-left p-2 rounded-xl bg-[#121c2e]/70 hover:bg-[#121c2e] hover:border-slate-700 border border-slate-800/80 flex items-center gap-2.5 transition-all group cursor-pointer"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cfg.cor}20`, color: cfg.cor }}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                      {cfg.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{cfg.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 3: CONFIGURAÇÕES DA PÁGINA */}
        {activeTab === 'pagina' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Cor de Fundo da Página
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentPage.backgroundColor || '#ffffff'}
                  onChange={(e) => onUpdatePage({ backgroundColor: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={currentPage.backgroundColor || '#ffffff'}
                  onChange={(e) => onUpdatePage({ backgroundColor: e.target.value })}
                  className="flex-1 bg-[#121c2e] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {[
                  '#ffffff',
                  '#f8fafc',
                  '#f1f5f9',
                  '#091122',
                  '#0055ff',
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => onUpdatePage({ backgroundColor: color })}
                    style={{ backgroundColor: color }}
                    className="h-6 rounded border border-slate-600 hover:scale-105 transition-transform"
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Imagem de Fundo da Página */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Imagem / Layout de Fundo
              </label>
              <button
                onClick={() => bgFileInputRef.current?.click()}
                className="w-full py-2 bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#0055ff]" />
                <span>Upload Fundo (PDF/PNG)</span>
              </button>

              {currentPage.backgroundImage && (
                <button
                  onClick={() => onUpdatePage({ backgroundImage: undefined })}
                  className="w-full mt-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold"
                >
                  Remover Fundo da Página
                </button>
              )}
            </div>

            {/* Orientação & Dimensões */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Formato da Página
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    onUpdatePage({
                      width: 794,
                      height: 1123,
                      orientation: 'portrait',
                    })
                  }
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer ${
                    (currentPage.width || 794) <= (currentPage.height || 1123)
                      ? 'border-[#0055ff] bg-[#0055ff]/15 text-white'
                      : 'border-slate-800 bg-[#121c2e] text-slate-400'
                  }`}
                >
                  <span>A4 Retrato</span>
                  <span className="text-[10px] text-slate-500">794 x 1123 px</span>
                </button>

                <button
                  onClick={() =>
                    onUpdatePage({
                      width: 1123,
                      height: 794,
                      orientation: 'landscape',
                    })
                  }
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer ${
                    (currentPage.width || 794) > (currentPage.height || 1123)
                      ? 'border-[#0055ff] bg-[#0055ff]/15 text-white'
                      : 'border-slate-800 bg-[#121c2e] text-slate-400'
                  }`}
                >
                  <span>A4 Paisagem</span>
                  <span className="text-[10px] text-slate-500">1123 x 794 px</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
