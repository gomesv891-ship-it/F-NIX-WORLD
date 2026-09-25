import React, { useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  PenTool,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import {
  DocumentoPagina,
  DocumentoElemento,
  DocumentoCampoModelo,
} from '../../../types';
import { CAMPO_TIPO_CONFIG } from '../ModeloCamposEditorModal';

interface EditorCanvasProps {
  currentPage: DocumentoPagina;
  currentPageIndex: number;
  totalPages: number;
  camposPaginaAtual: DocumentoCampoModelo[];
  selectedElementId: string | null;
  selectedCampoId: string | null;
  zoom: number;
  onChangeZoom: (newZoom: number) => void;
  onSelectElement: (id: string | null) => void;
  onSelectCampo: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DocumentoElemento>, pushHistory?: boolean) => void;
  onUpdateCampo: (id: string, updates: Partial<DocumentoCampoModelo>, pushHistory?: boolean) => void;
  onRecordHistory: () => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  currentPage,
  currentPageIndex,
  totalPages,
  camposPaginaAtual,
  selectedElementId,
  selectedCampoId,
  zoom,
  onChangeZoom,
  onSelectElement,
  onSelectCampo,
  onUpdateElement,
  onUpdateCampo,
  onRecordHistory,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag & Resize state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [activeDragTarget, setActiveDragTarget] = useState<'element' | 'campo' | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [startBounds, setStartBounds] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const pageWidth = currentPage.width || 794;
  const pageHeight = currentPage.height || 1123;

  // Handle Mouse Down on Element
  const handleMouseDownElement = (e: React.MouseEvent, el: DocumentoElemento) => {
    e.stopPropagation();
    onSelectCampo(null);
    onSelectElement(el.id);

    setIsDragging(true);
    setActiveDragTarget('element');
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setStartBounds({ x: el.x, y: el.y, w: el.width, h: el.height });
  };

  // Handle Mouse Down on Campo
  const handleMouseDownCampo = (e: React.MouseEvent, campo: DocumentoCampoModelo) => {
    e.stopPropagation();
    onSelectElement(null);
    onSelectCampo(campo.id);

    setIsDragging(true);
    setActiveDragTarget('campo');
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setStartBounds({ x: campo.x, y: campo.y, w: campo.width, h: campo.height });
  };

  // Canvas Mouse Move (Drag & Resize with boundary checks)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const dx = (e.clientX - dragStartPos.x) / zoom;
    const dy = (e.clientY - dragStartPos.y) / zoom;

    if (isDragging) {
      const newX = Math.max(0, Math.min(pageWidth - startBounds.w, Math.round(startBounds.x + dx)));
      const newY = Math.max(0, Math.min(pageHeight - startBounds.h, Math.round(startBounds.y + dy)));

      if (activeDragTarget === 'element' && selectedElementId) {
        onUpdateElement(selectedElementId, { x: newX, y: newY }, false);
      } else if (activeDragTarget === 'campo' && selectedCampoId) {
        onUpdateCampo(selectedCampoId, { x: newX, y: newY }, false);
      }
    } else if (isResizing) {
      let newW = startBounds.w;
      let newH = startBounds.h;
      let newX = startBounds.x;
      let newY = startBounds.y;

      if (resizeHandle.includes('e')) newW = Math.max(20, Math.round(startBounds.w + dx));
      if (resizeHandle.includes('s')) newH = Math.max(16, Math.round(startBounds.h + dy));
      if (resizeHandle.includes('w')) {
        const potW = startBounds.w - dx;
        if (potW >= 20) {
          newW = Math.round(potW);
          newX = Math.round(startBounds.x + dx);
        }
      }
      if (resizeHandle.includes('n')) {
        const potH = startBounds.h - dy;
        if (potH >= 16) {
          newH = Math.round(potH);
          newY = Math.round(startBounds.y + dy);
        }
      }

      // Constrain within page bounds
      if (newX < 0) {
        newW += newX;
        newX = 0;
      }
      if (newY < 0) {
        newH += newY;
        newY = 0;
      }
      if (newX + newW > pageWidth) newW = pageWidth - newX;
      if (newY + newH > pageHeight) newH = pageHeight - newY;

      if (activeDragTarget === 'element' && selectedElementId) {
        onUpdateElement(selectedElementId, { width: newW, height: newH, x: newX, y: newY }, false);
      } else if (activeDragTarget === 'campo' && selectedCampoId) {
        onUpdateCampo(selectedCampoId, { width: newW, height: newH, x: newX, y: newY }, false);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      onRecordHistory();
    }
    setIsDragging(false);
    setIsResizing(false);
    setActiveDragTarget(null);
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-[#050913] overflow-auto p-8 flex flex-col items-center justify-start relative select-none"
      onClick={() => {
        onSelectElement(null);
        onSelectCampo(null);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Floating Zoom Controls */}
      <div className="fixed bottom-6 right-84 z-30 flex items-center gap-2 bg-[#091122]/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xl">
        <button
          onClick={() => onChangeZoom(Math.max(0.3, Number((zoom - 0.1).toFixed(2))))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-slate-200 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => onChangeZoom(Math.min(2.0, Number((zoom + 0.1).toFixed(2))))}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <button
          onClick={() => onChangeZoom(0.85)}
          className="text-[11px] text-[#0055ff] hover:underline font-semibold"
        >
          100%
        </button>
      </div>

      {/* Main Page Canvas Preserving Exact Aspect Ratio & Dimensions */}
      <div
        className="relative bg-white shadow-2xl rounded-xs text-slate-900 overflow-hidden"
        style={{
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          minWidth: `${pageWidth}px`,
          minHeight: `${pageHeight}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: isDragging || isResizing ? 'none' : 'transform 0.1s ease-out',
          backgroundColor: currentPage.backgroundColor || '#ffffff',
          backgroundImage: currentPage.backgroundImage ? `url(${currentPage.backgroundImage})` : undefined,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================
            PAGE ELEMENTS (Textos, Imagens, Tabelas, Blocos, etc.)
           ======================================================== */}
        {currentPage.elementos?.map((el) => {
          const isSelected = el.id === selectedElementId;

          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleMouseDownElement(e, el)}
              className={`absolute select-none cursor-move transition-shadow ${
                isSelected
                  ? 'ring-2 ring-[#0055ff] shadow-xl z-30'
                  : 'hover:ring-1 hover:ring-blue-400 z-10'
              }`}
              style={{
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.width}px`,
                height: `${el.height}px`,
                zIndex: el.zIndex || 1,
              }}
            >
              <div
                className="w-full h-full overflow-hidden"
                style={{
                  fontSize: el.fontSize ? `${el.fontSize}px` : '14px',
                  fontFamily: el.fontFamily || 'Inter, sans-serif',
                  color: el.color || '#0f172a',
                  backgroundColor: el.backgroundColor || 'transparent',
                  textAlign: el.textAlign || 'left',
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  textDecoration: el.textDecoration || 'none',
                  lineHeight: el.lineHeight || 1.4,
                  letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                  padding: el.padding ? `${el.padding}px` : '0px',
                  borderRadius:
                    el.formaTipo === 'circulo'
                      ? '9999px'
                      : el.formaTipo === 'cartao'
                      ? '12px'
                      : el.borderRadius
                      ? `${el.borderRadius}px`
                      : '0px',
                  borderWidth: el.borderWidth ? `${el.borderWidth}px` : '0px',
                  borderColor: el.borderColor || 'transparent',
                  borderStyle: el.borderStyle || 'solid',
                  opacity: el.opacity !== undefined ? el.opacity : 1,
                }}
              >
                {/* Texto com edição inline */}
                {el.tipo === 'texto' && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onKeyDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const val = e.currentTarget.innerText;
                      if (val !== el.conteudo) {
                        onRecordHistory();
                        onUpdateElement(el.id, { conteudo: val }, false);
                      }
                    }}
                    className="w-full h-full outline-none whitespace-pre-wrap cursor-text"
                  >
                    {el.conteudo}
                  </div>
                )}

                {/* Imagens e Logos */}
                {(el.tipo === 'imagem' || el.tipo === 'logo') && (
                  <img
                    src={el.src || '/public/fenix_official_logo.png'}
                    alt="Imagem"
                    className="w-full h-full pointer-events-none select-none"
                    style={{ objectFit: el.fit || 'contain' }}
                  />
                )}

                {/* Formas / Blocos */}
                {el.tipo === 'forma' && (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: el.fillColor || el.backgroundColor || '#0055ff',
                    }}
                  />
                )}

                {/* Linha Divisória */}
                {el.tipo === 'linha' && (
                  <div
                    className="w-full"
                    style={{
                      borderTopWidth: `${el.espessuraLinha || 2}px`,
                      borderTopColor: el.borderColor || '#0055ff',
                      borderTopStyle: el.linhaEstilo || 'solid',
                    }}
                  />
                )}

                {/* Cabeçalho Oficial Fênix */}
                {el.tipo === 'cabecalho' && (
                  <div className="w-full h-full flex items-center justify-between border-b-2 border-[#0055ff] pb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src="/public/fenix_official_logo.png"
                        alt="Logo"
                        className="h-9 object-contain"
                      />
                      <div>
                        <p className="font-bold text-xs text-[#091122]">FÊNIX WORLD DISTRIBUIDORA</p>
                        <p className="text-[10px] text-slate-500">{el.textoSecundario || 'Catálogo Oficial'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#0055ff]">{el.conteudo || 'CATÁLOGO'}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date().toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rodapé Oficial */}
                {el.tipo === 'rodape' && (
                  <div className="w-full h-full flex items-center justify-between border-t border-slate-300 pt-1 text-[10px] text-slate-500">
                    <p>{el.conteudo || 'Fênix World Distribuidora'}</p>
                    <p>
                      Página {currentPageIndex + 1} de {totalPages}
                    </p>
                  </div>
                )}

                {/* Tabela de Produtos / Preços */}
                {el.tipo === 'tabela' && (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: el.headerBg || '#0055ff',
                          color: el.headerColor || '#fff',
                        }}
                      >
                        {el.tabelaHeaders?.map((h, hIdx) => (
                          <th
                            key={hIdx}
                            className="px-2 py-1 text-left font-bold text-[11px] border border-slate-300"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {el.tabelaLinhas?.map((r, rIdx) => (
                        <tr
                          key={rIdx}
                          className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                        >
                          {r.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const newText = e.currentTarget.innerText;
                                const curRows = [...(el.tabelaLinhas || [])];
                                if (curRows[rIdx]) {
                                  curRows[rIdx][cIdx] = newText;
                                  onRecordHistory();
                                  onUpdateElement(el.id, { tabelaLinhas: curRows }, false);
                                }
                              }}
                              className="px-2 py-1 text-slate-800 border border-slate-200 outline-none"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Resize Handles for Selected Element */}
              {isSelected && (
                <>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsResizing(true);
                      setResizeHandle('se');
                      setActiveDragTarget('element');
                      setDragStartPos({ x: e.clientX, y: e.clientY });
                      setStartBounds({ x: el.x, y: el.y, w: el.width, h: el.height });
                    }}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#0055ff] border-2 border-white rounded-full cursor-se-resize shadow-md z-40"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsResizing(true);
                      setResizeHandle('e');
                      setActiveDragTarget('element');
                      setDragStartPos({ x: e.clientX, y: e.clientY });
                      setStartBounds({ x: el.x, y: el.y, w: el.width, h: el.height });
                    }}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-[#0055ff] border border-white rounded-full cursor-e-resize shadow-md z-40"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsResizing(true);
                      setResizeHandle('s');
                      setActiveDragTarget('element');
                      setDragStartPos({ x: e.clientX, y: e.clientY });
                      setStartBounds({ x: el.x, y: el.y, w: el.width, h: el.height });
                    }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#0055ff] border border-white rounded-full cursor-s-resize shadow-md z-40"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* ========================================================
            CAMPOS DE MODELO / CRM SOBRE A PÁGINA
           ======================================================== */}
        {camposPaginaAtual.map((campo) => {
          const isSelected = campo.id === selectedCampoId;
          const config = CAMPO_TIPO_CONFIG[campo.tipo] || CAMPO_TIPO_CONFIG.texto;
          const IconComp = config.icon;

          return (
            <div
              key={campo.id}
              onMouseDown={(e) => handleMouseDownCampo(e, campo)}
              className={`absolute group cursor-move select-none transition-shadow ${
                isSelected
                  ? 'ring-2 ring-[#0055ff] shadow-xl z-30'
                  : 'hover:ring-1 hover:ring-blue-400 z-10'
              }`}
              style={{
                left: `${campo.x}px`,
                top: `${campo.y}px`,
                width: `${campo.width}px`,
                height: `${campo.height}px`,
              }}
            >
              <div
                className="w-full h-full rounded-md border flex flex-col justify-between overflow-hidden relative shadow-xs"
                style={{
                  backgroundColor: campo.backgroundColor || 'rgba(248, 250, 252, 0.92)',
                  borderColor: isSelected ? '#0055ff' : campo.borderColor || '#cbd5e1',
                  borderWidth: `${campo.borderWidth || 1}px`,
                }}
              >
                {/* Header do Campo */}
                <div
                  className="px-2 py-0.5 flex items-center justify-between text-[10px] font-bold border-b"
                  style={{
                    backgroundColor: `${config.cor}15`,
                    borderColor: `${config.cor}30`,
                    color: config.cor,
                  }}
                >
                  <span className="truncate flex items-center gap-1">
                    <IconComp className="w-3 h-3 shrink-0" />
                    {campo.nome}
                    {campo.obrigatorio && <span className="text-red-500">*</span>}
                  </span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/70">
                    {config.label}
                  </span>
                </div>

                {/* Preenchimento simulado do Campo */}
                <div className="flex-1 px-2 flex items-center justify-between text-xs text-slate-500 italic truncate">
                  <span className="truncate">
                    {campo.placeholder || `[${campo.nome}]`}
                  </span>

                  {campo.tipo === 'assinatura_normal' && (
                    <PenTool className="w-4 h-4 text-blue-500 opacity-60 shrink-0" />
                  )}
                  {campo.tipo === 'assinatura_govbr' && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 opacity-80 shrink-0" />
                  )}
                  {campo.tipo === 'checkbox' && (
                    <CheckSquare className="w-4 h-4 text-emerald-500 opacity-60 shrink-0" />
                  )}
                </div>
              </div>

              {/* Resize Handles for Selected Campo */}
              {isSelected && (
                <>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsResizing(true);
                      setResizeHandle('se');
                      setActiveDragTarget('campo');
                      setDragStartPos({ x: e.clientX, y: e.clientY });
                      setStartBounds({ x: campo.x, y: campo.y, w: campo.width, h: campo.height });
                    }}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#0055ff] border-2 border-white rounded-full cursor-se-resize shadow-md z-40"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsResizing(true);
                      setResizeHandle('e');
                      setActiveDragTarget('campo');
                      setDragStartPos({ x: e.clientX, y: e.clientY });
                      setStartBounds({ x: campo.x, y: campo.y, w: campo.width, h: campo.height });
                    }}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-[#0055ff] border border-white rounded-full cursor-e-resize shadow-md z-40"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsResizing(true);
                      setResizeHandle('s');
                      setActiveDragTarget('campo');
                      setDragStartPos({ x: e.clientX, y: e.clientY });
                      setStartBounds({ x: campo.x, y: campo.y, w: campo.width, h: campo.height });
                    }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#0055ff] border border-white rounded-full cursor-s-resize shadow-md z-40"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
