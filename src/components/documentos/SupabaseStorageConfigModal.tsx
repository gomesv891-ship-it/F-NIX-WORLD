import React, { useState } from 'react';
import { X, Database, Copy, Check, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { SUPABASE_SETUP_SQL, getSupabaseUrl, getSupabaseClient } from '../../utils/supabaseClient';

interface SupabaseStorageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseStorageConfigModal: React.FC<SupabaseStorageConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    buckets: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleTestStorage = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const client = getSupabaseClient();
      if (!client) {
        setTestResult({
          success: false,
          message: 'Supabase não inicializado. Verifique as variáveis de ambiente.',
          buckets: [],
        });
        setTesting(false);
        return;
      }

      const { data: buckets, error: bErr } = await client.storage.listBuckets();
      if (bErr) {
        setTestResult({
          success: false,
          message: `Erro ao listar buckets: ${bErr.message}`,
          buckets: [],
        });
      } else {
        const bucketNames = (buckets || []).map((b) => b.name);
        const hasCatalogos = bucketNames.includes('catalogos');
        const hasDocumentos = bucketNames.includes('documentos');

        if (hasCatalogos && hasDocumentos) {
          setTestResult({
            success: true,
            message: 'Supabase Storage 100% configurado com os buckets oficiais (catalogos, documentos)!',
            buckets: bucketNames,
          });
        } else {
          setTestResult({
            success: false,
            message: `Buckets encontrados: [${bucketNames.join(', ') || 'Nenhum'}]. Execute o script SQL abaixo para criar os buckets catalogos e documentos.`,
            buckets: bucketNames,
          });
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Falha ao testar conexão de Storage.',
        buckets: [],
      });
    } finally {
      setTesting(false);
    }
  };

  const supabaseUrl = getSupabaseUrl();
  const projectId = supabaseUrl.replace('https://', '').split('.')[0];
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052cc] border border-blue-100 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Configuração do Supabase Storage & Database
              </h2>
              <p className="text-xs text-slate-500">
                Script SQL de criação dos buckets, permissões e políticas RLS
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

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Instruções passo a passo */}
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2 text-blue-950">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-blue-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Como aplicar no Supabase em 1 minuto:
              </span>
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0052cc] hover:underline"
              >
                Abrir SQL Editor
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 text-xs">
              <li>Clique no botão <strong>"Copiar Script SQL"</strong> abaixo.</li>
              <li>Acesse o <strong>SQL Editor</strong> do seu painel do Supabase.</li>
              <li>Cole o script e clique em <strong>"RUN"</strong> para criar os buckets e regras RLS.</li>
              <li>Clique no botão <strong>"Verificar Conexão"</strong> abaixo para confirmar.</li>
            </ol>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex-1">
                <p className="font-bold">{testResult.success ? 'Conexão Confirmada' : 'Aviso de Configuração'}</p>
                <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Editor com o SQL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Script SQL Oficial:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0052cc] hover:bg-[#0047b3] text-white font-semibold transition-all cursor-pointer shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed rounded-xl overflow-x-auto max-h-64 border border-slate-800">
                {SUPABASE_SETUP_SQL}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleTestStorage}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Verificando...' : 'Verificar Conexão Storage'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
