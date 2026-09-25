import React, { useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import {
  TabelaComercialConfig,
  TabelaLinhaProduto,
  TabelaPaginaInfo,
} from '../../../data/tabelaRevendaModel';
import { FENIX_OFFICIAL_LOGO_BASE64 } from '../../../assets/fenixLogoBase64';

interface TabelaCanvasPageProps {
  currentPage: number;
  totalPages: number;
  currentPageTitle: string;
  config: TabelaComercialConfig;
  produtos: TabelaLinhaProduto[];
  selectedTarget:
    | { type: 'produto'; id: string }
    | { type: 'cabecalho' }
    | { type: 'tabela' }
    | { type: 'coluna'; coluna: 'marca' | 'descricao' | 'preco' | 'unidade' }
    | { type: 'rodape' }
    | { type: 'capa' }
    | { type: 'capa_elemento'; elemento: 'fundo' | 'logo' | 'titulo' | 'vigencia' | 'subtitulo1' | 'subtitulo2' | 'parceiros' }
    | null;
  zoom: number;
  onChangeZoom: (newZoom: number) => void;
  onSelectTarget: (
    target:
      | { type: 'produto'; id: string }
      | { type: 'cabecalho' }
      | { type: 'tabela' }
      | { type: 'coluna'; coluna: 'marca' | 'descricao' | 'preco' | 'unidade' }
      | { type: 'rodape' }
      | { type: 'capa' }
      | { type: 'capa_elemento'; elemento: 'fundo' | 'logo' | 'titulo' | 'vigencia' | 'subtitulo1' | 'subtitulo2' | 'parceiros' }
      | null
  ) => void;
  onUpdateProduto: (id: string, updates: Partial<TabelaLinhaProduto>) => void;
  onDeleteProduto: (id: string) => void;
  onDuplicateProduto: (p: TabelaLinhaProduto) => void;
  onMoveProduto: (id: string, dir: 'up' | 'down') => void;
  onAddProdutoToPage: () => void;
  onToggleMarcaAgrupamento: (marca: string) => void;
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const TabelaCanvasPage: React.FC<TabelaCanvasPageProps> = ({
  currentPage,
  totalPages,
  currentPageTitle,
  config,
  produtos,
  selectedTarget,
  zoom,
  onChangeZoom,
  onSelectTarget,
  onUpdateProduto,
  onDeleteProduto,
  onDuplicateProduto,
  onMoveProduto,
  onAddProdutoToPage,
  onToggleMarcaAgrupamento,
  pageContainerRef,
}) => {
  const currentPaginaProdutos = produtos.filter((p) => p.paginaNumero === currentPage);

  // Determina se a marca deve ser agrupada lateralmente
  const isMarcaAgrupada = (marca: string): boolean => {
    if (config.marcasAgrupadas && config.marcasAgrupadas[marca] !== undefined) {
      return config.marcasAgrupadas[marca];
    }
    return config.agruparMarcasGlobal !== false;
  };

  // Cálculo de blocos contíguos de marcas para agrupamento lateral com rowSpan
  const productRowsWithSpan: Array<{
    produto: TabelaLinhaProduto;
    isGroupStart: boolean;
    groupSpan: number;
    isGrouped: boolean;
  }> = [];

  for (let i = 0; i < currentPaginaProdutos.length; i++) {
    const current = currentPaginaProdutos[i];
    const grouped = isMarcaAgrupada(current.marcaLinha);

    if (!grouped) {
      productRowsWithSpan.push({
        produto: current,
        isGroupStart: true,
        groupSpan: 1,
        isGrouped: false,
      });
      continue;
    }

    // Verifica se é o início de um grupo contíguo
    const prev = i > 0 ? currentPaginaProdutos[i - 1] : null;
    if (!prev || prev.marcaLinha !== current.marcaLinha || !isMarcaAgrupada(prev.marcaLinha)) {
      // Início do grupo: conta quantos produtos contíguos têm a mesma marca
      let spanCount = 1;
      for (let j = i + 1; j < currentPaginaProdutos.length; j++) {
        if (currentPaginaProdutos[j].marcaLinha === current.marcaLinha) {
          spanCount++;
        } else {
          break;
        }
      }
      productRowsWithSpan.push({
        produto: current,
        isGroupStart: true,
        groupSpan: spanCount,
        isGrouped: true,
      });
    } else {
      // Continuação do grupo
      productRowsWithSpan.push({
        produto: current,
        isGroupStart: false,
        groupSpan: 0,
        isGrouped: true,
      });
    }
  }

  return (
    <div
      className="flex-1 bg-[#070d18] overflow-auto flex items-center justify-center p-6 relative select-none"
      onClick={() => onSelectTarget(null)}
    >
      {/* Floating Zoom Controls */}
      <div className="fixed bottom-6 right-84 z-30 flex items-center gap-2 bg-[#091122]/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xl">
        <button
          onClick={() => onChangeZoom(Math.max(0.3, Number((zoom - 0.05).toFixed(2))))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-slate-200 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => onChangeZoom(Math.min(1.8, Number((zoom + 0.05).toFixed(2))))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <button
          onClick={() => onChangeZoom(0.75)}
          className="text-[11px] text-[#0055ff] hover:underline font-semibold"
          title="Zoom Padrão"
        >
          Ajustar
        </button>
      </div>

      {/* Scaled Wrapper */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* CONTAINER DA PÁGINA (1200 x 850 px - PROPORÇÃO FIEL DO PDF ORIGINAL) */}
        <div
          ref={pageContainerRef}
          id="tabela-comercial-page-canvas"
          className="w-[1200px] h-[850px] min-w-[1200px] min-h-[850px] bg-white text-slate-900 rounded-lg shadow-2xl overflow-hidden relative select-none flex flex-col font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ====================================================
              PÁGINA 1: CAPA OFICIAL
             ==================================================== */}
          {currentPage === 1 ? (
            <div
              className={`w-full h-full relative flex overflow-hidden transition-all cursor-pointer ${
                selectedTarget?.type === 'capa' ||
                (selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'fundo')
                  ? 'ring-4 ring-[#0055ff] ring-inset'
                  : ''
              }`}
              style={{
                backgroundColor: config.capaCorFundo || '#ffffff',
              }}
              onClick={() => onSelectTarget({ type: 'capa_elemento', elemento: 'fundo' })}
            >
              {config.capaImagemModo === 'pagina_inteira' ? (
                /* ====================================================
                   CAPA MODO 100% PÁGINA INTEIRA
                   ==================================================== */
                <div className="w-full h-full relative flex flex-col justify-between p-14 z-10">
                  {/* Imagem de Fundo 100% da Página */}
                  {config.capaFotoUrl ? (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url('${config.capaFotoUrl}')`,
                        backgroundSize: config.capaFotoFit === 'ajustar' ? 'contain' : 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  ) : null}

                  {/* Overlay de Escurecimento para Legibilidade dos Elementos */}
                  {config.capaFotoUrl && (
                    <div
                      className="absolute inset-0 pointer-events-none bg-black"
                      style={{
                        opacity: (config.capaOverlayOpacidade ?? 25) / 100,
                      }}
                    />
                  )}

                  {/* Topo: Logo & Título */}
                  <div className="relative z-10 flex flex-col">
                    {/* Logo Fênix World */}
                    {config.capaLogoVisible !== false && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTarget({ type: 'capa_elemento', elemento: 'logo' });
                        }}
                        className={`inline-block mb-10 p-2 rounded-xl transition-all cursor-pointer w-fit ${
                          selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'logo'
                            ? 'ring-2 ring-[#0055ff] bg-blue-500/20'
                            : 'hover:ring-1 hover:ring-blue-400/50'
                        }`}
                      >
                        <img
                          src={config.logoUrl || FENIX_OFFICIAL_LOGO_BASE64}
                          alt="Fênix World"
                          style={{
                            height: `${config.capaLogoHeight || 64}px`,
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    )}

                    {/* Título Principal */}
                    {config.capaTituloConfig?.visible !== false && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTarget({ type: 'capa_elemento', elemento: 'titulo' });
                        }}
                        className={`p-2 rounded-xl transition-all cursor-pointer w-fit max-w-[900px] ${
                          selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'titulo'
                            ? 'ring-2 ring-[#0055ff] bg-blue-500/20'
                            : 'hover:ring-1 hover:ring-blue-400/50'
                        }`}
                      >
                        <h1
                          style={{
                            fontSize: `${config.capaTituloConfig?.fontSize || 60}px`,
                            color: config.capaTituloConfig?.color || '#002b66',
                            fontWeight: config.capaTituloConfig?.bold !== false ? 900 : 400,
                            fontStyle: config.capaTituloConfig?.italic ? 'italic' : 'normal',
                            textAlign: config.capaTituloConfig?.align || 'left',
                            lineHeight: 1.05,
                            textTransform: 'uppercase',
                          }}
                        >
                          {config.nome}
                        </h1>
                      </div>
                    )}

                    {/* Vigência Mês / Ano */}
                    {config.capaVigenciaConfig?.visible !== false && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTarget({ type: 'capa_elemento', elemento: 'vigencia' });
                        }}
                        className={`flex items-center gap-3 my-4 p-2 rounded-xl transition-all cursor-pointer w-fit ${
                          selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'vigencia'
                            ? 'ring-2 ring-[#0055ff] bg-blue-500/20'
                            : 'hover:ring-1 hover:ring-blue-400/50'
                        }`}
                      >
                        <div
                          className="w-12 h-[3px]"
                          style={{ backgroundColor: config.capaVigenciaConfig?.dividerColor || '#0284c7' }}
                        />
                        <span
                          style={{
                            fontSize: `${config.capaVigenciaConfig?.fontSize || 24}px`,
                            color: config.capaVigenciaConfig?.color || '#002b66',
                            fontWeight: config.capaVigenciaConfig?.bold !== false ? 800 : 400,
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {config.mes} {config.ano}
                        </span>
                        <div
                          className="w-12 h-[3px]"
                          style={{ backgroundColor: config.capaVigenciaConfig?.dividerColor || '#0284c7' }}
                        />
                      </div>
                    )}

                    {/* Subtítulos */}
                    <div className="space-y-2 mt-4">
                      {config.capaSubtitulo1Config?.visible !== false && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'capa_elemento', elemento: 'subtitulo1' });
                          }}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer w-fit max-w-[800px] ${
                            selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'subtitulo1'
                              ? 'ring-2 ring-[#0055ff] bg-blue-500/20'
                              : 'hover:ring-1 hover:ring-blue-400/50'
                          }`}
                        >
                          <p
                            style={{
                              fontSize: `${config.capaSubtitulo1Config?.fontSize || 18}px`,
                              color: config.capaSubtitulo1Config?.color || '#334155',
                              fontWeight: config.capaSubtitulo1Config?.bold ? 700 : 500,
                              fontStyle: config.capaSubtitulo1Config?.italic ? 'italic' : 'normal',
                              textAlign: config.capaSubtitulo1Config?.align || 'left',
                            }}
                          >
                            {config.subtituloCapa1}
                          </p>
                        </div>
                      )}

                      {config.capaSubtitulo2Config?.visible !== false && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'capa_elemento', elemento: 'subtitulo2' });
                          }}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer w-fit max-w-[800px] ${
                            selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'subtitulo2'
                              ? 'ring-2 ring-[#0055ff] bg-blue-500/20'
                              : 'hover:ring-1 hover:ring-blue-400/50'
                          }`}
                        >
                          <p
                            style={{
                              fontSize: `${config.capaSubtitulo2Config?.fontSize || 18}px`,
                              color: config.capaSubtitulo2Config?.color || '#334155',
                              fontWeight: config.capaSubtitulo2Config?.bold ? 700 : 500,
                              fontStyle: config.capaSubtitulo2Config?.italic ? 'italic' : 'normal',
                              textAlign: config.capaSubtitulo2Config?.align || 'left',
                            }}
                          >
                            {config.subtituloCapa2}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Faixa Inferior de Marcas Parceiras */}
                  {config.capaParceirosConfig?.visible !== false && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTarget({ type: 'capa_elemento', elemento: 'parceiros' });
                      }}
                      className={`relative z-10 pt-4 border-t border-slate-300/40 p-2 rounded-xl transition-all cursor-pointer ${
                        selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'parceiros'
                          ? 'ring-2 ring-[#0055ff] bg-blue-500/20'
                          : 'hover:ring-1 hover:ring-blue-400/50'
                      }`}
                    >
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Marcas e Parceiros Oficiais
                      </p>
                      <div
                        className="flex items-center gap-6 text-xs font-bold"
                        style={{ color: config.capaParceirosConfig?.color || '#475569' }}
                      >
                        <span className="text-[#b91c1c] font-black text-sm">flexfloor</span>
                        <span className="font-extrabold tracking-wider">FORTALEZA</span>
                        <span className="text-[#0284c7] font-bold">HD FLEX</span>
                        <span className="tracking-widest">NEXA</span>
                        <span className="text-[#4d7c0f] font-bold">VinilForte</span>
                        <span className="font-black">Pix</span>
                        <span className="font-bold">Tarkett</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ====================================================
                   CAPA MODO DIVIDIDO (2 COLUNAS)
                   ==================================================== */
                <div className="w-full h-full flex overflow-hidden">
                  {/* Lado Esquerdo da Capa: Conteúdo Institucional */}
                  <div className="w-[620px] h-full p-14 flex flex-col justify-between z-10 bg-linear-to-br from-white via-slate-50 to-blue-50/40">
                    <div>
                      {/* Logo Fênix World */}
                      {config.capaLogoVisible !== false && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'capa_elemento', elemento: 'logo' });
                          }}
                          className={`inline-block mb-12 p-2 rounded-xl transition-all cursor-pointer w-fit ${
                            selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'logo'
                              ? 'ring-2 ring-[#0055ff] bg-blue-50'
                              : 'hover:ring-1 hover:ring-slate-300'
                          }`}
                        >
                          <img
                            src={config.logoUrl || FENIX_OFFICIAL_LOGO_BASE64}
                            alt="Fênix World"
                            style={{
                              height: `${config.capaLogoHeight || 64}px`,
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      )}

                      {/* Título Principal */}
                      {config.capaTituloConfig?.visible !== false && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'capa_elemento', elemento: 'titulo' });
                          }}
                          className={`p-2 rounded-xl transition-all cursor-pointer w-fit ${
                            selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'titulo'
                              ? 'ring-2 ring-[#0055ff] bg-blue-50'
                              : 'hover:ring-1 hover:ring-slate-300'
                          }`}
                        >
                          <h1
                            style={{
                              fontSize: `${config.capaTituloConfig?.fontSize || 56}px`,
                              color: config.capaTituloConfig?.color || '#002b66',
                              fontWeight: config.capaTituloConfig?.bold !== false ? 900 : 400,
                              fontStyle: config.capaTituloConfig?.italic ? 'italic' : 'normal',
                              textAlign: config.capaTituloConfig?.align || 'left',
                              lineHeight: 1.05,
                              textTransform: 'uppercase',
                            }}
                          >
                            {config.nome}
                          </h1>
                        </div>
                      )}

                      {/* Vigência Mês / Ano */}
                      {config.capaVigenciaConfig?.visible !== false && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'capa_elemento', elemento: 'vigencia' });
                          }}
                          className={`flex items-center gap-3 my-5 p-2 rounded-xl transition-all cursor-pointer w-fit ${
                            selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'vigencia'
                              ? 'ring-2 ring-[#0055ff] bg-blue-50'
                              : 'hover:ring-1 hover:ring-slate-300'
                          }`}
                        >
                          <div
                            className="w-12 h-[2px]"
                            style={{ backgroundColor: config.capaVigenciaConfig?.dividerColor || '#0284c7' }}
                          />
                          <span
                            style={{
                              fontSize: `${config.capaVigenciaConfig?.fontSize || 24}px`,
                              color: config.capaVigenciaConfig?.color || '#002b66',
                              fontWeight: config.capaVigenciaConfig?.bold !== false ? 800 : 400,
                              letterSpacing: '2px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {config.mes} {config.ano}
                          </span>
                          <div
                            className="w-12 h-[2px]"
                            style={{ backgroundColor: config.capaVigenciaConfig?.dividerColor || '#0284c7' }}
                          />
                        </div>
                      )}

                      {/* Subtítulos */}
                      <div className="space-y-1 mt-6">
                        {config.capaSubtitulo1Config?.visible !== false && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTarget({ type: 'capa_elemento', elemento: 'subtitulo1' });
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer w-fit ${
                              selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'subtitulo1'
                                ? 'ring-2 ring-[#0055ff] bg-blue-50'
                                : 'hover:ring-1 hover:ring-slate-300'
                            }`}
                          >
                            <p
                              style={{
                                fontSize: `${config.capaSubtitulo1Config?.fontSize || 18}px`,
                                color: config.capaSubtitulo1Config?.color || '#334155',
                                fontWeight: config.capaSubtitulo1Config?.bold ? 700 : 500,
                                fontStyle: config.capaSubtitulo1Config?.italic ? 'italic' : 'normal',
                                textAlign: config.capaSubtitulo1Config?.align || 'left',
                              }}
                            >
                              {config.subtituloCapa1}
                            </p>
                          </div>
                        )}

                        {config.capaSubtitulo2Config?.visible !== false && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTarget({ type: 'capa_elemento', elemento: 'subtitulo2' });
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer w-fit ${
                              selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'subtitulo2'
                                ? 'ring-2 ring-[#0055ff] bg-blue-50'
                                : 'hover:ring-1 hover:ring-slate-300'
                            }`}
                          >
                            <p
                              style={{
                                fontSize: `${config.capaSubtitulo2Config?.fontSize || 18}px`,
                                color: config.capaSubtitulo2Config?.color || '#334155',
                                fontWeight: config.capaSubtitulo2Config?.bold ? 700 : 500,
                                fontStyle: config.capaSubtitulo2Config?.italic ? 'italic' : 'normal',
                                textAlign: config.capaSubtitulo2Config?.align || 'left',
                              }}
                            >
                              {config.subtituloCapa2}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Faixa inferior de marcas parceiras */}
                    {config.capaParceirosConfig?.visible !== false && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTarget({ type: 'capa_elemento', elemento: 'parceiros' });
                        }}
                        className={`pt-6 border-t border-slate-200 p-2 rounded-xl transition-all cursor-pointer ${
                          selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'parceiros'
                            ? 'ring-2 ring-[#0055ff] bg-blue-50'
                            : 'hover:ring-1 hover:ring-slate-300'
                        }`}
                      >
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Marcas e Parceiros Oficiais
                        </p>
                        <div
                          className="flex items-center gap-6 text-xs font-bold"
                          style={{ color: config.capaParceirosConfig?.color || '#475569' }}
                        >
                          <span className="text-[#b91c1c] font-black text-sm">flexfloor</span>
                          <span className="font-extrabold tracking-wider">FORTALEZA</span>
                          <span className="text-[#0284c7] font-bold">HD FLEX</span>
                          <span className="tracking-widest">NEXA</span>
                          <span className="text-[#4d7c0f] font-bold">VinilForte</span>
                          <span className="font-black">Pix</span>
                          <span className="font-bold">Tarkett</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lado Direito da Capa: Imagem Decorativa */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTarget({ type: 'capa_elemento', elemento: 'fundo' });
                    }}
                    className={`flex-1 h-full relative overflow-hidden bg-[#0c1628] cursor-pointer ${
                      selectedTarget?.type === 'capa_elemento' && selectedTarget.elemento === 'fundo'
                        ? 'ring-4 ring-[#0055ff] ring-inset'
                        : ''
                    }`}
                  >
                    {config.capaFotoUrl ? (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url('${config.capaFotoUrl}')`,
                          backgroundSize: config.capaFotoFit === 'ajustar' ? 'contain' : 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                        Clique para adicionar foto da capa
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/30 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ====================================================
                PÁGINAS DE CONTEÚDO (TABELAS COMERCIAIS)
               ==================================================== */
            <div className="w-full h-full p-8 flex flex-col justify-between bg-white text-slate-900">
              {/* 1. CABEÇALHO */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget({ type: 'cabecalho' });
                }}
                className={`flex items-center justify-between pb-3 border-b-2 border-slate-900 cursor-pointer rounded-lg p-2 transition-all ${
                  selectedTarget?.type === 'cabecalho'
                    ? 'ring-2 ring-[#0055ff] bg-blue-50/40'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Logo */}
                <div className="flex items-center gap-2">
                  <img
                    src={config.logoUrl || FENIX_OFFICIAL_LOGO_BASE64}
                    alt="Fênix World"
                    className="h-9 object-contain"
                  />
                </div>

                {/* Título Central */}
                <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-wide text-center">
                  {currentPageTitle}
                </h2>

                {/* Badge Mês/Ano */}
                <div className="bg-[#e0f2fe] text-[#0369a1] px-4 py-1.5 rounded-lg text-sm font-extrabold tracking-wider uppercase border border-sky-200">
                  {config.mes} {config.ano}
                </div>
              </div>

              {/* 2. TABELA DE PRODUTOS */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget({ type: 'tabela' });
                }}
                className={`flex-1 my-3 overflow-hidden border border-slate-300 rounded-lg flex flex-col justify-between transition-all ${
                  selectedTarget?.type === 'tabela' ? 'ring-2 ring-[#0055ff]' : ''
                }`}
              >
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left border-collapse table-fixed">
                    {/* Cabeçalho das Colunas */}
                    <thead>
                      <tr
                        style={{
                          backgroundColor: config.tabelaHeaderBg || '#0b192e',
                          color: config.tabelaHeaderColor || '#ffffff',
                        }}
                        className="text-xs font-bold uppercase select-none sticky top-0 z-20"
                      >
                        <th
                          style={{ width: `${config.colunaMarcaWidth || 220}px` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'coluna', coluna: 'marca' });
                          }}
                          className={`py-2.5 px-3 text-center border-r border-slate-700 cursor-pointer transition-colors ${
                            selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'marca'
                              ? 'bg-[#0055ff] text-white ring-2 ring-white/50'
                              : 'hover:bg-slate-800'
                          }`}
                          title="Clique para formatar a coluna MARCA / LINHA"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>MARCA / LINHA</span>
                            {selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'marca' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'coluna', coluna: 'descricao' });
                          }}
                          className={`py-2.5 px-4 border-r border-slate-700 cursor-pointer transition-colors ${
                            selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'descricao'
                              ? 'bg-[#0055ff] text-white ring-2 ring-white/50'
                              : 'hover:bg-slate-800'
                          }`}
                          title="Clique para formatar a coluna DESCRIÇÃO"
                        >
                          <div className="flex items-center gap-1">
                            <span>DESCRIÇÃO</span>
                            {selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'descricao' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                          </div>
                        </th>
                        <th
                          style={{ width: `${config.colunaPrecoWidth || 120}px` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'coluna', coluna: 'preco' });
                          }}
                          className={`py-2.5 px-3 text-right border-r border-slate-700 cursor-pointer transition-colors ${
                            selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'preco'
                              ? 'bg-[#0055ff] text-white ring-2 ring-white/50'
                              : 'hover:bg-slate-800'
                          }`}
                          title="Clique para formatar a coluna PREÇO"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>PREÇO</span>
                            {selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'preco' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                          </div>
                        </th>
                        <th
                          style={{ width: '65px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTarget({ type: 'coluna', coluna: 'unidade' });
                          }}
                          className={`py-2.5 px-3 text-center cursor-pointer transition-colors ${
                            selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'unidade'
                              ? 'bg-[#0055ff] text-white ring-2 ring-white/50'
                              : 'hover:bg-slate-800'
                          }`}
                          title="Clique para formatar a coluna UNIDADE"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>UN.</span>
                            {selectedTarget?.type === 'coluna' && selectedTarget.coluna === 'unidade' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 text-xs">
                      {productRowsWithSpan.map(({ produto, isGroupStart, groupSpan, isGrouped }) => {
                        const isSelected =
                          selectedTarget?.type === 'produto' && selectedTarget.id === produto.id;

                        return (
                          <tr
                            key={produto.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTarget({ type: 'produto', id: produto.id });
                            }}
                            className={`group transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-100/70 ring-1 ring-[#0055ff]'
                                : 'hover:bg-blue-50/50 bg-white'
                            }`}
                            style={{ height: `${config.alturaLinha || 38}px` }}
                          >
                            {/* COLUNA MARCA / LINHA (AGRUPADA LATERALMENTE OU INDIVIDUAL) */}
                            {isGrouped ? (
                              isGroupStart ? (
                                <td
                                  rowSpan={groupSpan}
                                  className="py-2 px-2 border-r border-slate-300 leading-tight align-middle relative group/marca"
                                  style={{
                                    backgroundColor: produto.marcaCor || '#0284c7',
                                    color: config.estiloMarca?.color || produto.marcaTextColor || '#ffffff',
                                    fontSize: `${config.estiloMarca?.fontSize || 12}px`,
                                    fontWeight: config.estiloMarca?.bold !== false ? 'bold' : 'normal',
                                    fontStyle: config.estiloMarca?.italic ? 'italic' : 'normal',
                                    textAlign: config.estiloMarca?.align || 'center',
                                  }}
                                >
                                  <div className="flex flex-col items-center justify-center h-full px-1">
                                    <span className="uppercase tracking-wider">
                                      {produto.marcaLinha}
                                    </span>
                                    {groupSpan > 1 && (
                                      <span className="text-[9px] opacity-80 mt-1">
                                        ({groupSpan} itens)
                                      </span>
                                    )}

                                    {/* Botão sutil para desmesclar marca */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleMarcaAgrupamento(produto.marcaLinha);
                                      }}
                                      className="opacity-0 group-hover/marca:opacity-100 transition-opacity mt-1.5 px-1.5 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[8px] text-white"
                                      title="Desmesclar / Desagrupar linhas desta marca"
                                    >
                                      Desagrupar
                                    </button>
                                  </div>
                                </td>
                              ) : null
                            ) : (
                              <td
                                className="py-1.5 px-2 border-r border-slate-200 leading-tight align-middle relative group/marca"
                                style={{
                                  backgroundColor: produto.marcaCor || '#0284c7',
                                  color: config.estiloMarca?.color || produto.marcaTextColor || '#ffffff',
                                  fontSize: `${config.estiloMarca?.fontSize || 12}px`,
                                  fontWeight: config.estiloMarca?.bold !== false ? 'bold' : 'normal',
                                  fontStyle: config.estiloMarca?.italic ? 'italic' : 'normal',
                                  textAlign: config.estiloMarca?.align || 'center',
                                }}
                              >
                                <span>{produto.marcaLinha}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleMarcaAgrupamento(produto.marcaLinha);
                                  }}
                                  className="opacity-0 group-hover/marca:opacity-100 transition-opacity ml-1 px-1 py-0.5 rounded bg-black/30 text-[8px] text-white"
                                  title="Agrupar produtos desta marca lateralmente"
                                >
                                  Agrupar
                                </button>
                              </td>
                            )}

                            {/* COLUNA DESCRIÇÃO */}
                            <td className="py-1.5 px-3 border-r border-slate-200 align-middle">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const text = e.currentTarget.innerText;
                                        if (text !== produto.descricao) {
                                          onUpdateProduto(produto.id, { descricao: text });
                                        }
                                      }}
                                      className="outline-none"
                                      style={{
                                        fontSize: `${config.estiloDescricao?.fontSize || config.fontSizeDescricao || 12}px`,
                                        color: config.estiloDescricao?.color || '#0f172a',
                                        fontWeight: config.estiloDescricao?.bold ? 'bold' : 'normal',
                                        fontStyle: config.estiloDescricao?.italic ? 'italic' : 'normal',
                                        textAlign: config.estiloDescricao?.align || 'left',
                                        display: 'inline-block',
                                        width: '100%',
                                      }}
                                    >
                                      {produto.descricao}
                                    </span>

                                    {produto.promocao && (
                                      <span className="px-1.5 py-0.2 bg-red-600 text-white font-extrabold text-[9px] rounded uppercase shrink-0">
                                        {produto.promocaoTexto || 'PROMOÇÃO'}
                                      </span>
                                    )}
                                  </div>

                                  {produto.subDescricao && (
                                    <p
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const text = e.currentTarget.innerText;
                                        onUpdateProduto(produto.id, { subDescricao: text });
                                      }}
                                      className="text-[10px] text-slate-500 italic mt-0.5 outline-none"
                                    >
                                      {produto.subDescricao}
                                    </p>
                                  )}
                                </div>

                                {/* Ações rápidas no hover da linha */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMoveProduto(produto.id, 'up');
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-800"
                                    title="Mover para Cima"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMoveProduto(produto.id, 'down');
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-800"
                                    title="Mover para Baixo"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDuplicateProduto(produto);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600"
                                    title="Duplicar Produto"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteProduto(produto.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600"
                                    title="Excluir Produto"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* COLUNA PREÇO */}
                            <td
                              style={{
                                textAlign: config.estiloPreco?.align || 'right',
                              }}
                              className="py-1.5 px-3 border-r border-slate-200 whitespace-nowrap align-middle"
                            >
                              <span className="text-slate-500 text-[10px] mr-1">R$</span>
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const raw = e.currentTarget.innerText
                                    .replace('R$', '')
                                    .replace(/\./g, '')
                                    .replace(',', '.')
                                    .trim();
                                  const num = parseFloat(raw);
                                  if (!isNaN(num)) {
                                    onUpdateProduto(produto.id, { preco: num });
                                  }
                                }}
                                className="outline-none"
                                style={{
                                  fontSize: `${config.estiloPreco?.fontSize || config.fontSizePreco || 13}px`,
                                  color: config.estiloPreco?.color || '#002b66',
                                  fontWeight: config.estiloPreco?.bold !== false ? 'bold' : 'normal',
                                  fontStyle: config.estiloPreco?.italic ? 'italic' : 'normal',
                                }}
                              >
                                {produto.preco.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                  })}
                              </span>
                            </td>

                            {/* COLUNA UNIDADE */}
                            <td
                              style={{
                                textAlign: config.estiloUnidade?.align || 'center',
                              }}
                              className="py-1.5 px-2 align-middle"
                            >
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const val = e.currentTarget.innerText.trim();
                                  if (val) {
                                    onUpdateProduto(produto.id, { unidade: val });
                                  }
                                }}
                                className="outline-none"
                                style={{
                                  fontSize: `${config.estiloUnidade?.fontSize || 11}px`,
                                  color: config.estiloUnidade?.color || '#64748b',
                                  fontWeight: config.estiloUnidade?.bold ? 'bold' : 'normal',
                                  fontStyle: config.estiloUnidade?.italic ? 'italic' : 'normal',
                                }}
                              >
                                {produto.unidade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Linha para Adicionar Produto */}
                <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Total: {currentPaginaProdutos.length} produtos nesta página
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddProdutoToPage();
                    }}
                    className="px-3 py-1 bg-white hover:bg-[#0055ff] text-slate-700 hover:text-white border border-slate-300 hover:border-[#0055ff] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Produto à Página</span>
                  </button>
                </div>
              </div>

              {/* 3. RODAPÉ */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget({ type: 'rodape' });
                }}
                className={`pt-2 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500 cursor-pointer rounded-lg p-1.5 transition-all ${
                  selectedTarget?.type === 'rodape'
                    ? 'ring-2 ring-[#0055ff] bg-blue-50/40'
                    : 'hover:bg-slate-50'
                }`}
              >
                <p className="text-[10px] font-medium max-w-[900px] truncate">
                  {config.observacaoRodape}
                </p>
                <p className="font-bold text-[11px] text-slate-700">
                  Página {currentPage - 1}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
