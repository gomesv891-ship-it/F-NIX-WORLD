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
import {
  TabelaComercialConfig,
  TabelaLinhaProduto,
  TabelaPaginaInfo,
} from '../../../data/tabelaRevendaModel';

interface TabelaSidebarThumbnailsProps {
  pages: TabelaPaginaInfo[];
  currentPage: number;
  config: TabelaComercialConfig;
  produtos: TabelaLinhaProduto[];
  onSelectPage: (pageNumber: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageNumber: number) => void;
  onDeletePage: (pageNumber: number) => void;
  onRenamePage: (pageNumber: number, newTitle: string) => void;
  onReorderPages: (fromIdx: number, toIdx: number) => void;
}

export const TabelaSidebarThumbnails: React.FC<TabelaSidebarThumbnailsProps> = ({
  pages,
  currentPage,
  config,
  produtos,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onRenamePage,
  onReorderPages,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [renamingPageNum, setRenamingPageNum] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  const handleStartRename = (num: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingPageNum(num);
    setRenameValue(title);
  };

  const handleSaveRename = (num: number, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renameValue.trim()) {
      onRenamePage(num, renameValue.trim());
    }
    setRenamingPageNum(null);
  };

  return (
    <div className="w-56 md:w-64 bg-[#0a1222] border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#0055ff]" />
          Páginas ({pages.length})
        </h4>
        <button
          onClick={onAddPage}
          className="p-1.5 bg-[#121c2e] hover:bg-[#0055ff] text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer shadow-xs"
          title="Adicionar Nova Página"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova</span>
        </button>
      </div>

      {/* Pages List */}
      <div className="p-3 overflow-y-auto flex-1 space-y-3">
        {pages.map((p, idx) => {
          const isSelected = p.numero === currentPage;
          const pageProducts = produtos.filter((prod) => prod.paginaNumero === p.numero);

          return (
            <div
              key={p.numero}
              draggable
              onDragStart={(e) => {
                setDraggedIdx(idx);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIdx !== null && draggedIdx !== idx) {
                  onReorderPages(draggedIdx, idx);
                }
                setDraggedIdx(null);
              }}
              onDragEnd={() => setDraggedIdx(null)}
              onClick={() => onSelectPage(p.numero)}
              className={`p-2 rounded-xl border transition-all cursor-pointer group relative ${
                draggedIdx === idx ? 'opacity-40 border-dashed border-blue-400' : ''
              } ${
                isSelected
                  ? 'border-[#0055ff] bg-[#0055ff]/10 shadow-lg shadow-blue-500/10'
                  : 'border-slate-800/80 bg-[#0e172a] hover:border-slate-700 hover:bg-[#121c2e]'
              }`}
            >
              {/* Drag Handle & Top Controls */}
              <div
                className="absolute top-2 left-2 p-1 text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                title="Arrastar para reordenar página"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/80 rounded-md p-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicatePage(p.numero);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                  title="Duplicar Página"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(p.numero);
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/20"
                  title="Excluir Página"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Title & Info */}
              <div className="flex items-center justify-between text-xs mb-1.5 px-1">
                <span className={`font-bold ${isSelected ? 'text-[#0055ff]' : 'text-white'}`}>
                  {p.numero === 1 ? '1. Capa' : `${p.numero}. ${p.titulo}`}
                </span>
                <span className="text-[10px] text-slate-500">
                  {p.numero === 1 ? 'Capa' : `${pageProducts.length} itens`}
                </span>
              </div>

              {/* Miniature Canvas in Landscape (1200x850 aspect) */}
              <div className="w-full aspect-[1200/850] bg-white rounded-md overflow-hidden relative shadow-xs p-1 text-[7px] text-slate-800 flex flex-col justify-between border border-slate-300 pointer-events-none select-none">
                {p.numero === 1 ? (
                  // Cover Thumbnail
                  <div className="h-full flex flex-col justify-between p-1 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-100">
                    <div className="font-extrabold text-[#002b66] text-[8px]">FÊNIX WORLD</div>
                    <div className="text-center">
                      <p className="font-black text-[#002b66] text-[9px] leading-tight">
                        {config.nome.toUpperCase()}
                      </p>
                      <p className="text-[6px] text-sky-600 font-bold">
                        {config.mes} {config.ano}
                      </p>
                    </div>
                    <div className="text-[5px] text-slate-500 text-center truncate">
                      flexfloor • Fortaleza • Tarkett
                    </div>
                  </div>
                ) : (
                  // Table Page Thumbnail
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span className="font-bold text-[6px]">FÊNIX</span>
                      <span className="font-bold text-[6px] truncate max-w-[90px]">
                        {p.titulo.toUpperCase()}
                      </span>
                      <span className="text-[5px] bg-blue-100 px-0.5 rounded text-blue-700">
                        {config.mes}
                      </span>
                    </div>

                    {/* Miniature rows representation */}
                    <div className="flex-1 py-1 space-y-0.5 overflow-hidden">
                      {pageProducts.slice(0, 6).map((prod, pI) => (
                        <div key={pI} className="flex items-center gap-0.5 h-1.5">
                          <div
                            className="w-4 h-full rounded-xs shrink-0"
                            style={{ backgroundColor: prod.marcaCor || '#0284c7' }}
                          />
                          <div className="flex-1 h-full bg-slate-200 rounded-xs" />
                          <div className="w-4 h-full bg-slate-300 rounded-xs" />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[5px] text-slate-400 border-t border-slate-200 pt-0.5">
                      <span>Fênix World</span>
                      <span>Pág {p.numero - 1}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Page Title Edit & Arrow Actions */}
              <div className="w-full flex items-center justify-between text-xs px-1 mt-1.5">
                {renamingPageNum === p.numero ? (
                  <form
                    onSubmit={(e) => handleSaveRename(p.numero, e)}
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
                    <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingPageNum(null)}
                      className="p-1 text-slate-400 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-semibold truncate text-[11px] text-slate-300">
                      {p.titulo}
                    </span>
                    <button
                      onClick={(e) => handleStartRename(p.numero, p.titulo, e)}
                      className="p-0.5 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Renomear Título da Página"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (idx > 0) onReorderPages(idx, idx - 1);
                    }}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded hover:bg-slate-800"
                    title="Mover para Cima"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (idx < pages.length - 1) onReorderPages(idx, idx + 1);
                    }}
                    disabled={idx === pages.length - 1}
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
          <span>Adicionar Página</span>
        </button>
      </div>
    </div>
  );
};
