import React, { useState } from 'react';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Edit2,
  Check,
  X,
  GripVertical,
} from 'lucide-react';
import { DocumentoPagina, DocumentoCampoModelo } from '../../../types';

interface EditorPageThumbnailsProps {
  paginas: DocumentoPagina[];
  campos: DocumentoCampoModelo[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onRenamePage: (index: number, newTitle: string) => void;
}

export const EditorPageThumbnails: React.FC<EditorPageThumbnailsProps> = ({
  paginas,
  campos,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onRenamePage,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  const handleStartRename = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingIdx(idx);
    setRenameValue(paginas[idx]?.titulo || `Página ${idx + 1}`);
  };

  const handleSaveRename = (idx: number, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renameValue.trim()) {
      onRenamePage(idx, renameValue.trim());
    }
    setRenamingIdx(null);
  };

  return (
    <div className="w-56 md:w-64 bg-[#0a1222] border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#0055ff]" />
          Páginas ({paginas.length})
        </h4>
        <button
          onClick={onAddPage}
          className="p-1.5 bg-[#121c2e] hover:bg-[#0055ff] text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer shadow-xs"
          title="Adicionar Nova Página em Branco"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova</span>
        </button>
      </div>

      {/* Pages List */}
      <div className="p-3 overflow-y-auto flex-1 space-y-3">
        {paginas.map((p, pIdx) => {
          const isSelected = pIdx === currentPageIndex;
          const pW = p.width || 794;
          const pH = p.height || 1123;
          const aspect = pW / pH;
          const thumbW = 140;
          const thumbH = Math.round(thumbW / aspect);
          const camposNaPagina = campos.filter((c) => (c.paginaNumero || 1) === pIdx + 1);

          return (
            <div
              key={p.id || pIdx}
              draggable
              onDragStart={(e) => {
                setDraggedIdx(pIdx);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIdx !== null && draggedIdx !== pIdx) {
                  onMovePage(draggedIdx, pIdx);
                }
                setDraggedIdx(null);
              }}
              onDragEnd={() => setDraggedIdx(null)}
              onClick={() => onSelectPage(pIdx)}
              className={`group rounded-xl border-2 transition-all p-2 flex flex-col items-center gap-2 cursor-pointer relative ${
                draggedIdx === pIdx ? 'opacity-40 border-dashed border-blue-400' : ''
              } ${
                isSelected
                  ? 'border-[#0055ff] bg-[#0055ff]/10 shadow-lg shadow-[#0055ff]/20'
                  : 'border-slate-800 bg-[#121c2e]/60 hover:border-slate-600 hover:bg-[#121c2e]'
              }`}
            >
              {/* Drag Handle Indicator */}
              <div
                className="absolute top-2 left-2 p-1 text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                title="Arrastar para reordenar"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Action Buttons Top Right */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/80 rounded-md p-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicatePage(pIdx);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                  title="Duplicar Página"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(pIdx);
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/20"
                  title="Excluir Página"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Live Miniature Canvas */}
              <div
                className="relative bg-white rounded shadow-sm overflow-hidden pointer-events-none select-none border border-slate-300"
                style={{
                  width: `${thumbW}px`,
                  height: `${thumbH}px`,
                  backgroundColor: p.backgroundColor || '#ffffff',
                  backgroundImage: p.backgroundImage ? `url(${p.backgroundImage})` : undefined,
                  backgroundSize: '100% 100%',
                }}
              >
                {/* Scaled Page Elements */}
                {p.elementos?.map((el) => {
                  const scale = thumbW / pW;
                  return (
                    <div
                      key={el.id}
                      className="absolute overflow-hidden"
                      style={{
                        left: `${el.x * scale}px`,
                        top: `${el.y * scale}px`,
                        width: `${Math.max(2, el.width * scale)}px`,
                        height: `${Math.max(2, el.height * scale)}px`,
                        backgroundColor:
                          el.backgroundColor ||
                          el.fillColor ||
                          (el.tipo === 'texto' ? 'transparent' : '#e2e8f0'),
                        borderWidth: el.borderWidth ? `${Math.max(1, (el.borderWidth || 1) * scale)}px` : undefined,
                        borderColor: el.borderColor,
                        borderRadius: el.borderRadius ? `${el.borderRadius * scale}px` : undefined,
                        opacity: el.opacity !== undefined ? el.opacity : 0.85,
                      }}
                    >
                      {el.tipo === 'texto' && (
                        <div
                          style={{
                            fontSize: '3.5px',
                            lineHeight: '4.5px',
                            color: el.color || '#334155',
                          }}
                          className="truncate px-0.5"
                        >
                          {el.conteudo}
                        </div>
                      )}
                      {el.tipo === 'imagem' && el.src && (
                        <img
                          src={el.src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Scaled Campos */}
                {camposNaPagina.map((c) => {
                  const scale = thumbW / pW;
                  return (
                    <div
                      key={c.id}
                      className="absolute bg-blue-500/20 border border-blue-500/50 rounded-xs overflow-hidden"
                      style={{
                        left: `${c.x * scale}px`,
                        top: `${c.y * scale}px`,
                        width: `${Math.max(4, c.width * scale)}px`,
                        height: `${Math.max(3, c.height * scale)}px`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Page Title & Navigation Arrows */}
              <div className="w-full flex items-center justify-between text-xs px-1 mt-1">
                {renamingIdx === pIdx ? (
                  <form
                    onSubmit={(e) => handleSaveRename(pIdx, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 flex-1 min-w-0"
                  >
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      className="w-full bg-[#050913] border border-[#0055ff] rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingIdx(null)}
                      className="p-1 text-slate-400 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className={`font-bold truncate text-[11px] ${
                        isSelected ? 'text-[#0055ff]' : 'text-slate-300'
                      }`}
                      title={p.titulo || `Página ${pIdx + 1}`}
                    >
                      {pIdx === 0
                        ? `1. ${p.titulo || 'Capa'}`
                        : `${pIdx + 1}. ${p.titulo || `Pág ${pIdx + 1}`}`}
                    </span>
                    <button
                      onClick={(e) => handleStartRename(pIdx, e)}
                      className="p-0.5 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Renomear Página"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pIdx > 0) onMovePage(pIdx, pIdx - 1);
                    }}
                    disabled={pIdx === 0}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded hover:bg-slate-800"
                    title="Mover para Cima"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pIdx < paginas.length - 1) onMovePage(pIdx, pIdx + 1);
                    }}
                    disabled={pIdx === paginas.length - 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded hover:bg-slate-800"
                    title="Mover para Baixo"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Add Page button */}
      <div className="p-3 border-t border-slate-800/80 bg-[#080f1d]">
        <button
          onClick={onAddPage}
          className="w-full py-2 bg-[#121c2e] hover:bg-[#0055ff] text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Nova Página</span>
        </button>
      </div>
    </div>
  );
};
