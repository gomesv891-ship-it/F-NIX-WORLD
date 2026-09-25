import React, { useRef } from 'react';
import {
  Settings,
  Sliders,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Palette,
  Upload,
  Plus,
  Minus,
} from 'lucide-react';
import {
  DocumentoElemento,
  DocumentoCampoModelo,
  TipoCampoModelo,
} from '../../../types';
import { CAMPO_TIPO_CONFIG } from '../ModeloCamposEditorModal';

interface EditorPropertiesPanelProps {
  selectedElement: DocumentoElemento | null;
  selectedCampo: DocumentoCampoModelo | null;
  onUpdateElement: (updates: Partial<DocumentoElemento>, pushHistory?: boolean) => void;
  onDuplicateElement: () => void;
  onDeleteElement: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onUpdateCampo: (updates: Partial<DocumentoCampoModelo>, pushHistory?: boolean) => void;
  onDuplicateCampo: () => void;
  onDeleteCampo: () => void;
}

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Montserrat, sans-serif',
  'Poppins, sans-serif',
  'Arial, sans-serif',
  'Merriweather, serif',
  'JetBrains Mono, monospace',
];

export const EditorPropertiesPanel: React.FC<EditorPropertiesPanelProps> = ({
  selectedElement,
  selectedCampo,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward,
  onUpdateCampo,
  onDuplicateCampo,
  onDeleteCampo,
}) => {
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateElement({ src: reader.result as string }, true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="w-80 bg-[#0a1222] border-l border-slate-800 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-[#0055ff]" />
          <span>Propriedades</span>
        </h4>
        {selectedElement && (
          <span className="text-[10px] text-[#0055ff] font-bold bg-[#0055ff]/15 px-2 py-0.5 rounded uppercase">
            {selectedElement.tipo}
          </span>
        )}
        {selectedCampo && (
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded uppercase">
            Campo
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* CASE 1: PROPRIEDADES DE UM ELEMENTO DA PÁGINA */}
        {selectedElement ? (
          <div className="space-y-4">
            {/* Texto / Conteúdo Principal */}
            {(selectedElement.tipo === 'texto' ||
              selectedElement.tipo === 'cabecalho' ||
              selectedElement.tipo === 'rodape') && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Conteúdo do Texto
                </label>
                <textarea
                  rows={3}
                  value={selectedElement.conteudo || ''}
                  onChange={(e) => onUpdateElement({ conteudo: e.target.value }, true)}
                  className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#0055ff]"
                />
              </div>
            )}

            {/* Subtítulo para Cabeçalho */}
            {selectedElement.tipo === 'cabecalho' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Subtítulo / Descrição
                </label>
                <input
                  type="text"
                  value={selectedElement.textoSecundario || ''}
                  onChange={(e) => onUpdateElement({ textoSecundario: e.target.value }, true)}
                  className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            )}

            {/* Tipografia */}
            {(selectedElement.tipo === 'texto' ||
              selectedElement.tipo === 'cabecalho' ||
              selectedElement.tipo === 'rodape') && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400">
                  Tipografia & Estilos
                </label>

                {/* Fonte e Tamanho */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <select
                      value={selectedElement.fontFamily || 'Inter, sans-serif'}
                      onChange={(e) => onUpdateElement({ fontFamily: e.target.value }, true)}
                      className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min={8}
                      max={120}
                      value={selectedElement.fontSize || 14}
                      onChange={(e) => onUpdateElement({ fontSize: Number(e.target.value) }, true)}
                      className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs text-center"
                    />
                  </div>
                </div>

                {/* Format buttons: Bold, Italic, Underline, Aligns */}
                <div className="flex items-center gap-1 bg-[#121c2e] p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() =>
                      onUpdateElement(
                        { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' },
                        true
                      )
                    }
                    className={`p-1.5 rounded ${
                      selectedElement.fontWeight === 'bold'
                        ? 'bg-[#0055ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      onUpdateElement(
                        { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' },
                        true
                      )
                    }
                    className={`p-1.5 rounded ${
                      selectedElement.fontStyle === 'italic'
                        ? 'bg-[#0055ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      onUpdateElement(
                        {
                          textDecoration:
                            selectedElement.textDecoration === 'underline' ? 'none' : 'underline',
                        },
                        true
                      )
                    }
                    className={`p-1.5 rounded ${
                      selectedElement.textDecoration === 'underline'
                        ? 'bg-[#0055ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-slate-700 mx-1" />

                  <button
                    onClick={() => onUpdateElement({ textAlign: 'left' }, true)}
                    className={`p-1.5 rounded ${
                      selectedElement.textAlign === 'left' || !selectedElement.textAlign
                        ? 'bg-[#0055ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onUpdateElement({ textAlign: 'center' }, true)}
                    className={`p-1.5 rounded ${
                      selectedElement.textAlign === 'center'
                        ? 'bg-[#0055ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onUpdateElement({ textAlign: 'right' }, true)}
                    className={`p-1.5 rounded ${
                      selectedElement.textAlign === 'right'
                        ? 'bg-[#0055ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cores de Texto e Fundo */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Cor do Texto</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.color || '#091122'}
                        onChange={(e) => onUpdateElement({ color: e.target.value }, true)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-slate-300">
                        {selectedElement.color || '#091122'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Fundo do Texto</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.backgroundColor || '#ffffff'}
                        onChange={(e) => onUpdateElement({ backgroundColor: e.target.value }, true)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <button
                        onClick={() => onUpdateElement({ backgroundColor: 'transparent' }, true)}
                        className="text-[9px] text-slate-400 hover:text-white"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Imagem / Logo */}
            {(selectedElement.tipo === 'imagem' || selectedElement.tipo === 'logo') && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400">
                  Propriedades da Imagem
                </label>
                <input
                  ref={imageUploadRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => imageUploadRef.current?.click()}
                  className="w-full py-2 bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Substituir Imagem</span>
                </button>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Enquadramento</label>
                  <select
                    value={selectedElement.fit || 'contain'}
                    onChange={(e) =>
                      onUpdateElement({ fit: e.target.value as 'contain' | 'cover' | 'fill' }, true)
                    }
                    className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  >
                    <option value="contain">Conter Proporcional (Contain)</option>
                    <option value="cover">Preencher e Cortar (Cover)</option>
                    <option value="fill">Esticar (Fill)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tabela de Produtos / Preços */}
            {selectedElement.tipo === 'tabela' && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400">
                  Estrutura da Tabela
                </label>

                {/* Cores de Cabeçalho */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Fundo Cabeçalho</label>
                    <input
                      type="color"
                      value={selectedElement.headerBg || '#091122'}
                      onChange={(e) => onUpdateElement({ headerBg: e.target.value }, true)}
                      className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Texto Cabeçalho</label>
                    <input
                      type="color"
                      value={selectedElement.headerColor || '#ffffff'}
                      onChange={(e) => onUpdateElement({ headerColor: e.target.value }, true)}
                      className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                {/* Adicionar / Remover Linhas */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const cur = selectedElement.tabelaLinhas || [];
                      const colCount = selectedElement.tabelaHeaders?.length || 4;
                      const newRow = Array(colCount).fill('Novo item');
                      onUpdateElement({ tabelaLinhas: [...cur, newRow] }, true);
                    }}
                    className="flex-1 py-1.5 bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 text-emerald-400"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Linha</span>
                  </button>

                  <button
                    onClick={() => {
                      const cur = selectedElement.tabelaLinhas || [];
                      if (cur.length > 1) {
                        onUpdateElement({ tabelaLinhas: cur.slice(0, -1) }, true);
                      }
                    }}
                    className="py-1.5 px-2 bg-[#121c2e] hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-red-400"
                    title="Remover Última Linha"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Bloco / Forma / Linha */}
            {(selectedElement.tipo === 'forma' || selectedElement.tipo === 'linha') && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400">
                  Cores & Bordas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Preenchimento</label>
                    <input
                      type="color"
                      value={selectedElement.fillColor || selectedElement.backgroundColor || '#0055ff'}
                      onChange={(e) =>
                        onUpdateElement(
                          { fillColor: e.target.value, backgroundColor: e.target.value },
                          true
                        )
                      }
                      className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Cor da Borda</label>
                    <input
                      type="color"
                      value={selectedElement.borderColor || '#cbd5e1'}
                      onChange={(e) => onUpdateElement({ borderColor: e.target.value }, true)}
                      className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Espessura Borda</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={selectedElement.borderWidth || selectedElement.espessuraLinha || 1}
                      onChange={(e) =>
                        onUpdateElement(
                          {
                            borderWidth: Number(e.target.value),
                            espessuraLinha: Number(e.target.value),
                          },
                          true
                        )
                      }
                      className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Arredondamento</label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={selectedElement.borderRadius || 0}
                      onChange={(e) =>
                        onUpdateElement({ borderRadius: Number(e.target.value) }, true)
                      }
                      className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Posição e Dimensões Precisas */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-[11px] font-bold text-slate-400">
                Posição e Dimensões (px)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500">X (Esquerda)</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(e) => onUpdateElement({ x: Number(e.target.value) }, true)}
                    className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Y (Topo)</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(e) => onUpdateElement({ y: Number(e.target.value) }, true)}
                    className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Largura</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.width)}
                    onChange={(e) => onUpdateElement({ width: Number(e.target.value) }, true)}
                    className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Altura</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.height)}
                    onChange={(e) => onUpdateElement({ height: Number(e.target.value) }, true)}
                    className="w-full bg-[#121c2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Camadas (Trazer para frente / Enviar para trás) */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={onBringForward}
                className="flex-1 py-1.5 bg-[#121c2e] hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Trazer para Frente</span>
              </button>
              <button
                onClick={onSendBackward}
                className="flex-1 py-1.5 bg-[#121c2e] hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Enviar para Trás</span>
              </button>
            </div>

            {/* Ações: Duplicar e Excluir */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={onDuplicateElement}
                className="flex-1 py-1.5 bg-[#121c2e] hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar</span>
              </button>
              <button
                onClick={onDeleteElement}
                className="p-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
                title="Excluir Elemento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : selectedCampo ? (
          /* CASE 2: PROPRIEDADES DE UM CAMPO DE MODELO / CRM */
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Nome do Campo (Rótulo) *
              </label>
              <input
                type="text"
                value={selectedCampo.nome}
                onChange={(e) => onUpdateCampo({ nome: e.target.value }, true)}
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-[#0055ff]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Dado</label>
              <select
                value={selectedCampo.tipo}
                onChange={(e) =>
                  onUpdateCampo({ tipo: e.target.value as TipoCampoModelo }, true)
                }
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#0055ff]"
              >
                {(Object.keys(CAMPO_TIPO_CONFIG) as TipoCampoModelo[]).map((k) => (
                  <option key={k} value={k}>
                    {CAMPO_TIPO_CONFIG[k].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Obrigatório */}
            <div className="flex items-center justify-between p-2 bg-[#121c2e] rounded-xl border border-slate-800">
              <div>
                <span className="font-bold text-slate-200">Campo Obrigatório</span>
                <p className="text-[10px] text-slate-400">Exigir preenchimento ao usar modelo</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(selectedCampo.obrigatorio)}
                onChange={(e) => onUpdateCampo({ obrigatorio: e.target.checked }, true)}
                className="w-4 h-4 text-[#0055ff] rounded focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Vínculo CRM */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Preenchimento Automático do CRM
              </label>
              <select
                value={selectedCampo.vinculoCrm || ''}
                onChange={(e) => onUpdateCampo({ vinculoCrm: e.target.value }, true)}
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#0055ff]"
              >
                <option value="">Sem vínculo automático (Preenchimento manual)</option>
                <optgroup label="Dados do Cliente">
                  <option value="cliente_nome">Nome Completo do Cliente</option>
                  <option value="cliente_documento">CPF ou CNPJ</option>
                  <option value="cliente_telefone">Telefone / WhatsApp</option>
                  <option value="cliente_email">E-mail</option>
                  <option value="cliente_endereco">Endereço Completo</option>
                </optgroup>
                <optgroup label="Dados do Pedido / Orçamento">
                  <option value="pedido_numero">Número do Pedido</option>
                  <option value="pedido_total">Valor Total do Pedido</option>
                  <option value="pedido_responsavel">Responsável / Vendedor</option>
                  <option value="pedido_data">Data do Pedido</option>
                  <option value="area_instalada">Área Total Instalada (m²)</option>
                  <option value="data_instalacao">Data da Instalação</option>
                </optgroup>
              </select>
            </div>

            {/* Placeholder */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Texto de Ajuda / Placeholder
              </label>
              <input
                type="text"
                value={selectedCampo.placeholder || ''}
                onChange={(e) => onUpdateCampo({ placeholder: e.target.value }, true)}
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            {/* Coordenadas e Dimensões */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[10px] text-slate-400">Largura (px)</label>
                <input
                  type="number"
                  value={selectedCampo.width}
                  onChange={(e) => onUpdateCampo({ width: Number(e.target.value) }, true)}
                  className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2 py-1 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Altura (px)</label>
                <input
                  type="number"
                  value={selectedCampo.height}
                  onChange={(e) => onUpdateCampo({ height: Number(e.target.value) }, true)}
                  className="w-full bg-[#121c2e] border border-slate-700/80 rounded-lg px-2 py-1 text-white text-xs"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={onDuplicateCampo}
                className="flex-1 py-1.5 bg-[#121c2e] hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar</span>
              </button>
              <button
                onClick={onDeleteCampo}
                className="p-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
                title="Excluir Campo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* CASE 3: NENHUM SELECIONADO */
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Sliders className="w-8 h-8 opacity-40 text-[#0055ff]" />
            <p className="text-xs font-semibold text-slate-300">Nenhum elemento selecionado</p>
            <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
              Clique em qualquer texto, imagem, tabela, bloco ou campo sobre a página para editar propriedades visuais, cores, fontes e alinhamentos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
