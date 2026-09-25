import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { DocumentoCategoria, DocumentoItem } from '../../types';
import { saveDocumentoAsync } from '../../utils/documentosService';
import {
  importAnyFileAsModel,
  ACCEPTED_MODEL_FILE_TYPES_STRING,
  getFileFormatLabel,
  formatBytes,
} from '../../utils/fileImporter';

interface ImportarArquivoModeloModalProps {
  isOpen: boolean;
  categorias: DocumentoCategoria[];
  currentUserName: string;
  onClose: () => void;
  onSuccess: (savedModelo: DocumentoItem) => void;
}

export const ImportarArquivoModeloModal: React.FC<ImportarArquivoModeloModalProps> = ({
  isOpen,
  categorias,
  currentUserName,
  onClose,
  onSuccess,
}) => {
  const [titulo, setTitulo] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '');
  const [descricao, setDescricao] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [conversionWarnings, setConversionWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversionSummary, setConversionSummary] = useState<{
    format: string;
    pages: number;
    elements: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setConversionWarnings([]);
    setConversionSummary(null);
    setSelectedFile(file);

    if (!titulo.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitulo(cleanName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      setFileError('Informe o nome do modelo.');
      return;
    }

    if (!selectedFile) {
      setFileError('Selecione um arquivo compatível (PDF, Word, Excel, PowerPoint, SVG, HTML, etc.) para importar.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(10);
    setProgressStatus('Iniciando conversão do arquivo...');
    setFileError(null);
    setConversionWarnings([]);

    try {
      // 1. Converte o arquivo para modelo estruturado e editável (preservando textos, imagens, tabelas e posições)
      setProgressStatus('Extraindo elementos visuais, textos e tabelas...');
      setUploadProgress(25);

      const converted = await importAnyFileAsModel(selectedFile, (step, pct) => {
        setProgressStatus(step);
        setUploadProgress(Math.min(60, pct));
      });

      if (converted.warnings && converted.warnings.length > 0) {
        setConversionWarnings(converted.warnings);
      }

      setConversionSummary({
        format: converted.formatDetected,
        pages: converted.totalPages,
        elements: converted.convertedCount,
      });

      // 2. Salva o arquivo original e o modelo editável no Supabase Storage e Database
      setProgressStatus('Salvando original e modelo no Supabase Storage & Database...');
      setUploadProgress(65);

      const selectedCat = categorias.find((c) => c.id === categoriaId);
      const catNome = selectedCat ? selectedCat.nome : 'Modelos';

      const res = await saveDocumentoAsync(
        {
          titulo: titulo.trim(),
          categoriaId,
          categoriaNome: catNome,
          descricao: descricao.trim(),
          isModelo: true,
          isPdfImportado: true,
          nomeArquivoOriginal: selectedFile.name,
          tipoArquivo: converted.mimeType || selectedFile.type,
          tamanhoArquivo: formatBytes(selectedFile.size),
          totalPaginas: converted.totalPages,
          paginas: converted.pages,
        },
        selectedFile,
        currentUserName,
        {
          onProgress: (progress) => {
            const dbProgress = Math.round(65 + (progress.currentChunk / progress.totalChunks) * 35);
            setUploadProgress(Math.min(99, dbProgress));
            setProgressStatus(
              progress.totalChunks > 1
                ? `Gravando parte ${progress.currentChunk} de ${progress.totalChunks} no Supabase...`
                : 'Confirmando persistência no Supabase...'
            );
          },
        }
      );

      if (!res.success || !res.item) {
        setIsProcessing(false);
        setFileError(
          res.error ||
            'Não foi possível confirmar o salvamento no Supabase. Seus dados e o arquivo selecionado NÃO foram perdidos. Tente novamente.'
        );
        return;
      }

      setUploadProgress(100);
      setProgressStatus('Modelo salvo com sucesso no Supabase!');

      setTimeout(() => {
        setIsProcessing(false);
        onSuccess(res.item!);
      }, 500);
    } catch (err: any) {
      console.error('Erro na importação de arquivo como modelo:', err);
      setIsProcessing(false);
      setFileError(err?.message || 'Falha ao processar arquivo. Verifique sua conexão e tente novamente.');
    }
  };

  const detectedFormat = selectedFile ? getFileFormatLabel(selectedFile.name, selectedFile.type) : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#091122] px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0055ff]/30 to-sky-400/20 text-[#0055ff] border border-blue-500/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Importar Arquivo como Modelo</h3>
                <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Multi-Formato
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                PDF, Word (DOC/DOCX), Excel (XLSX), PowerPoint (PPTX), ODT, SVG, HTML e mais
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {fileError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Falha ao salvar no Supabase</p>
                <p className="mt-0.5 leading-relaxed">{fileError}</p>
                <p className="mt-1 text-[11px] text-rose-300/80">
                  Seus dados e o arquivo selecionado continuam preenchidos. Clique em "Tentar Novamente" abaixo.
                </p>
              </div>
            </div>
          )}

          {/* Avisos não-bloqueantes de conversão */}
          {conversionWarnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Observação da conversão (importação preservada):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/90 pl-1">
                {conversionWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Nome do Modelo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Nome do Modelo *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Contrato de Prestação de Serviços, Ordem de Instalação, Relatório..."
              className="w-full bg-[#121c2e] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0055ff] transition-all"
            />
          </div>

          {/* Categoria & Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Categoria de Modelos *
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0055ff]"
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Descrição ou Instrução (opcional)
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Modelo oficial com cláusulas atualizadas"
                className="w-full bg-[#121c2e] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0055ff]"
              />
            </div>
          </div>

          {/* Área de Seleção do Arquivo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Arquivo Base para o Modelo *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept={ACCEPTED_MODEL_FILE_TYPES_STRING}
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-700 hover:border-[#0055ff]/60 hover:bg-[#121c2e]/40'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between gap-3 text-emerald-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded">
                          {detectedFormat}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatBytes(selectedFile.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 underline font-medium shrink-0">
                    Trocar arquivo
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">
                      Clique para escolher o arquivo
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ou arraste e solte o arquivo aqui
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    {['PDF', 'DOCX', 'XLSX', 'PPTX', 'ODT', 'SVG', 'HTML'].map((fmt) => (
                      <span
                        key={fmt}
                        className="text-[9px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Destaque das Capacidades de Conversão */}
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs space-y-1 text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Conversão e Independência Total:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O arquivo original será arquivado no Supabase Storage e uma versão 100% editável será criada.
              Você poderá mover, redimensionar, formatar, excluir e adicionar novos textos, campos dinâmicos do CRM,
              tabelas e imagens.
            </p>
          </div>

          {/* Status do Processamento e Barra de Progresso */}
          {isProcessing && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-300">
                <span className="flex items-center gap-2 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  {progressStatus || 'Processando arquivo...'}
                </span>
                <span className="font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || !selectedFile}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0055ff] hover:bg-[#0044cc] rounded-xl shadow-lg shadow-[#0055ff]/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Convertendo e Salvando...</span>
                </>
              ) : (
                <>
                  <span>Importar Arquivo como Modelo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
