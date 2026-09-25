import React, { useState } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  Palette,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { DocumentoCategoria } from '../../types';
import {
  getCategoryUsage,
  transferCategoryItemsAndDelete,
  deleteDocumentoCategoriaAsync,
  saveDocumentoCategoriaAsync,
  updateDocumentoCategoriaAsync,
} from '../../utils/documentosService';

interface GerenciarCategoriasModalProps {
  isOpen: boolean;
  tipo: 'catalogo' | 'documento' | 'modelo';
  categorias: DocumentoCategoria[];
  currentUserName: string;
  onClose: () => void;
  onUpdated: () => void;
}

const PRESET_COLORS = [
  '#0284c7', // Azul
  '#d97706', // Âmbar / Dourado
  '#8b5cf6', // Violeta
  '#10b981', // Esmeralda
  '#ec4899', // Rosa
  '#64748b', // Ardósia
  '#06b6d4', // Ciano
  '#6b7280', // Cinza
  '#f97316', // Laranja
  '#ef4444', // Vermelho
];

export const GerenciarCategoriasModal: React.FC<GerenciarCategoriasModalProps> = ({
  isOpen,
  tipo,
  categorias,
  currentUserName,
  onClose,
  onUpdated,
}) => {
  const [activeTipo, setActiveTipo] = useState<'catalogo' | 'documento' | 'modelo'>(tipo || 'catalogo');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('#0284c7');

  const [isCreating, setIsCreating] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCor, setNewCor] = useState('#0284c7');

  // Modal de transferência quando categoria possui arquivos vinculados
  const [transferModalData, setTransferModalData] = useState<{
    categoriaId: string;
    categoriaNome: string;
    usageCount: number;
    destinationCatId: string;
  } | null>(null);

  // Confirmação de exclusão para categoria sem arquivos (sem window.confirm)
  const [categoryToDelete, setCategoryToDelete] = useState<DocumentoCategoria | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTipo(tipo || 'catalogo');
      setIsCreating(false);
      setEditingId(null);
      setErrorMessage('');
      setCategoryToDelete(null);
      setTransferModalData(null);
    }
  }, [isOpen, tipo]);

  if (!isOpen) return null;

  const filteredCategorias = categorias.filter((c) => c.tipo === activeTipo);

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewNome('');
    setNewCor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setEditingId(null);
    setErrorMessage('');
  };

  const handleSaveNew = async () => {
    const clean = newNome.trim();
    if (!clean) {
      setErrorMessage('Informe o nome da categoria.');
      return;
    }

    const exists = filteredCategorias.some(
      (c) => c.nome.toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      setErrorMessage('Já existe uma categoria com este nome nesta seção.');
      return;
    }

    setIsLoading(true);
    try {
      await saveDocumentoCategoriaAsync(
        {
          nome: clean,
          tipo: activeTipo,
          cor: newCor,
        },
        currentUserName
      );
      setIsCreating(false);
      setNewNome('');
      onUpdated();
    } catch {
      setErrorMessage('Erro ao salvar nova categoria no Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (cat: DocumentoCategoria) => {
    setEditingId(cat.id);
    setEditNome(cat.nome);
    setEditCor(cat.cor || '#0284c7');
    setIsCreating(false);
    setErrorMessage('');
  };

  const handleSaveEdit = async (catId: string) => {
    const clean = editNome.trim();
    if (!clean) {
      setErrorMessage('Informe o nome da categoria.');
      return;
    }
    setIsLoading(true);
    try {
      await updateDocumentoCategoriaAsync(
        catId,
        {
          nome: clean,
          cor: editCor,
        },
        currentUserName
      );
      setEditingId(null);
      onUpdated();
    } catch {
      setErrorMessage('Erro ao atualizar categoria no Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (cat: DocumentoCategoria) => {
    setErrorMessage('');
    const usage = getCategoryUsage(cat.id);
    const count =
      activeTipo === 'catalogo'
        ? usage.catalogosCount
        : activeTipo === 'documento'
        ? usage.documentosCount
        : usage.modelosCount;

    if (count > 0) {
      // Requer transferência obrigatória
      const otherCats = filteredCategorias.filter((c) => c.id !== cat.id);
      if (otherCats.length === 0) {
        setErrorMessage(
          'Esta é a única categoria desta seção e contém arquivos vinculados. Crie outra categoria antes de excluí-la para transferir os arquivos.'
        );
        return;
      }
      setTransferModalData({
        categoriaId: cat.id,
        categoriaNome: cat.nome,
        usageCount: count,
        destinationCatId: otherCats[0].id,
      });
    } else {
      // Sem arquivos vinculados, abre modal de confirmação dedicado
      setCategoryToDelete(cat);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsLoading(true);
    try {
      await deleteDocumentoCategoriaAsync(categoryToDelete.id, currentUserName);
      setCategoryToDelete(null);
      onUpdated();
    } catch {
      setErrorMessage('Erro ao remover categoria do Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransferAndDelete = async () => {
    if (!transferModalData) return;
    const destCat = filteredCategorias.find((c) => c.id === transferModalData.destinationCatId);
    if (!destCat) return;

    setIsLoading(true);
    try {
      await transferCategoryItemsAndDelete(
        transferModalData.categoriaId,
        destCat.id,
        destCat.nome,
        currentUserName
      );
      setTransferModalData(null);
      onUpdated();
    } catch {
      setErrorMessage('Erro ao transferir arquivos da categoria.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoLabel = (t: 'catalogo' | 'documento' | 'modelo') => {
    switch (t) {
      case 'catalogo':
        return 'Catálogos';
      case 'documento':
        return 'Documentos';
      case 'modelo':
        return 'Modelos Editáveis';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052cc] border border-blue-100 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Gerenciar Categorias
                </h2>
                <p className="text-xs text-slate-500">
                  Categorias 100% dinâmicas e independentes salvas no Supabase
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 Abas Independentes de Categorias */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/70">
            {(['catalogo', 'documento', 'modelo'] as const).map((t) => {
              const countCats = categorias.filter((c) => c.tipo === t).length;
              const isActive = activeTipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setActiveTipo(t);
                    setIsCreating(false);
                    setEditingId(null);
                    setErrorMessage('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0052cc] text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{getTipoLabel(t)}</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#003d99] text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {countCats}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Botão para Nova Categoria */}
          {!isCreating && (
            <button
              onClick={handleStartCreate}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50/50 border border-dashed border-slate-300 hover:border-[#0052cc] rounded-xl text-xs font-semibold text-[#0052cc] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria para {getTipoLabel(activeTipo)}</span>
            </button>
          )}

          {/* Form inline para criação */}
          {isCreating && (
            <div className="p-4 bg-slate-50 border border-[#0052cc]/40 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Criar Nova Categoria</span>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                placeholder="Nome da categoria..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc] focus:outline-none"
                autoFocus
              />
              <div>
                <span className="text-[11px] text-slate-600 block mb-1.5 flex items-center gap-1 font-medium">
                  <Palette className="w-3 h-3 text-[#0052cc]" /> Cor da etiqueta:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        newCor === c ? 'scale-125 ring-2 ring-[#0052cc] ring-offset-2' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNew}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-600/25"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Categoria'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de Categorias */}
          <div className="space-y-2">
            {filteredCategorias.map((cat) => {
              const usage = getCategoryUsage(cat.id);
              const count =
                activeTipo === 'catalogo'
                  ? usage.catalogosCount
                  : activeTipo === 'documento'
                  ? usage.documentosCount
                  : usage.modelosCount;
              const isEditingThis = editingId === cat.id;

              if (isEditingThis) {
                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-slate-50 border border-[#0052cc]/40 rounded-xl space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc] focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={isLoading}
                        className="p-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded-lg cursor-pointer"
                        title="Salvar alterações"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditCor(c)}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                            editCor === c ? 'scale-125 ring-2 ring-[#0052cc] ring-offset-1' : 'opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.cor || '#0284c7' }}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{cat.nome}</p>
                      <p className="text-[11px] text-slate-500">
                        {count === 0
                          ? 'Nenhum arquivo vinculado'
                          : `${count} ${count === 1 ? 'arquivo vinculado' : 'arquivos vinculados'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Categoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal de Transferência Obrigatória ao Excluir Categoria com Arquivos */}
        {transferModalData && (
          <div className="absolute inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-amber-300 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Transferência Obrigatória</h3>
                  <p className="text-xs text-amber-700 font-medium">
                    Arquivos vinculados não podem ser perdidos
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                A categoria <strong className="text-slate-900">"{transferModalData.categoriaNome}"</strong>{' '}
                possui{' '}
                <strong className="text-slate-900">
                  {transferModalData.usageCount}{' '}
                  {transferModalData.usageCount === 1 ? 'arquivo' : 'arquivos'}
                </strong>
                . Para excluí-la, selecione a categoria de destino para transferir todos os arquivos:
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transferir para:
                </label>
                <select
                  value={transferModalData.destinationCatId}
                  onChange={(e) =>
                    setTransferModalData({
                      ...transferModalData,
                      destinationCatId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:border-[#0052cc] focus:bg-white focus:outline-none"
                >
                  {filteredCategorias
                    .filter((c) => c.id !== transferModalData.categoriaId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalData(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransferAndDelete}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-600/25"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Transferir e Excluir Categoria</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Categoria */}
        {categoryToDelete && (
          <div className="absolute inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white border border-rose-200 rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Excluir Categoria</h3>
                  <p className="text-xs text-rose-600 font-medium">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza que deseja excluir a categoria <strong className="text-slate-900">"{categoryToDelete.nome}"</strong>? Ela será removida permanentemente do Supabase.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-600/25"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Excluindo...' : 'Excluir Categoria'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
