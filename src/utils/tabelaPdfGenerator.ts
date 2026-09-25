import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import {
  TabelaComercialConfig,
  TabelaLinhaProduto,
  TabelaPaginaInfo,
} from '../data/tabelaRevendaModel';
import { FENIX_OFFICIAL_LOGO_BASE64 } from '../assets/fenixLogoBase64';

export interface GenerateTabelaPdfOptions {
  config: TabelaComercialConfig;
  produtos: TabelaLinhaProduto[];
  onProgress?: (progressText: string) => void;
}

const MAX_PRODUCTS_PER_PAGE = 13;

/**
 * Gera um PDF profissional de alta resolução da Tabela de Revenda:
 * - Oculta todos os controles, botões e elementos de edição.
 * - Pagina automaticamente caso os produtos excedam o espaço da página, sem alterar o modelo.
 * - Repete o cabeçalho e colunas nas páginas de continuação.
 * - Preserva layout paisagem (1200 x 850), cores de marcas e tipografia.
 */
export async function generateTabelaPdf({
  config,
  produtos,
  onProgress,
}: GenerateTabelaPdfOptions): Promise<boolean> {
  const pagesList: TabelaPaginaInfo[] =
    config.paginasLista && config.paginasLista.length > 0
      ? config.paginasLista
      : [
          { numero: 1, titulo: 'Capa Oficial' },
          { numero: 2, titulo: 'Pisos, Manta Hospitalar e Teto Vinílico' },
          { numero: 3, titulo: 'Rodapés e Ripados' },
          { numero: 4, titulo: 'Materiais para Instalação de Piso Vinílico' },
          { numero: 5, titulo: 'Outros Produtos' },
        ];

  // Cria container temporário offscreen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.zIndex = '-9999';
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [1200, 850],
    });

    let isFirstPdfPage = true;
    let currentPdfPageNumber = 1;

    for (let pageIdx = 0; pageIdx < pagesList.length; pageIdx++) {
      const pageInfo = pagesList[pageIdx];

      if (onProgress) {
        onProgress(`Processando ${pageInfo.titulo}...`);
      }

      // ----------------------------------------------------
      // PÁGINA 1: CAPA OFICIAL LIMPA (SEM BOTÕES OU CONTROLES)
      // ----------------------------------------------------
      if (pageInfo.numero === 1) {
        const coverEl = document.createElement('div');
        coverEl.style.width = '1200px';
        coverEl.style.height = '850px';
        coverEl.style.backgroundColor = config.capaCorFundo || '#ffffff';
        coverEl.style.display = 'flex';
        coverEl.style.overflow = 'hidden';
        coverEl.style.fontFamily = 'Inter, sans-serif';
        coverEl.style.position = 'relative';

        const isFullPage = config.capaImagemModo === 'pagina_inteira';
        const fitMode = config.capaFotoFit === 'ajustar' ? 'contain' : 'cover';

        if (isFullPage) {
          const bgImgStyle = config.capaFotoUrl
            ? `background-image: url('${config.capaFotoUrl}'); background-size: ${fitMode}; background-position: center; background-repeat: no-repeat;`
            : '';
          const overlayOpacity = (config.capaOverlayOpacidade ?? 25) / 100;

          coverEl.innerHTML = `
            <div style="position: absolute; inset: 0; ${bgImgStyle}"></div>
            ${
              config.capaFotoUrl
                ? `<div style="position: absolute; inset: 0; background-color: #000000; opacity: ${overlayOpacity};"></div>`
                : ''
            }
            <div style="position: relative; z-index: 10; width: 100%; height: 100%; padding: 56px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                ${
                  config.capaLogoVisible !== false
                    ? `<img src="${config.logoUrl || FENIX_OFFICIAL_LOGO_BASE64}" alt="Logo" style="height: ${config.capaLogoHeight || 64}px; object-fit: contain; margin-bottom: 48px;" />`
                    : ''
                }
                ${
                  config.capaTituloConfig?.visible !== false
                    ? `<h1 style="font-size: ${config.capaTituloConfig?.fontSize || 60}px; font-weight: ${config.capaTituloConfig?.bold !== false ? 900 : 400}; font-style: ${config.capaTituloConfig?.italic ? 'italic' : 'normal'}; color: ${config.capaTituloConfig?.color || '#002b66'}; line-height: 1.05; margin: 0 0 16px 0; text-transform: uppercase;">
                        ${config.nome}
                      </h1>`
                    : ''
                }
                ${
                  config.capaVigenciaConfig?.visible !== false
                    ? `<div style="display: flex; align-items: center; gap: 12px; margin: 20px 0;">
                        <div style="width: 48px; height: 3px; background-color: ${config.capaVigenciaConfig?.dividerColor || '#0284c7'};"></div>
                        <span style="font-size: ${config.capaVigenciaConfig?.fontSize || 24}px; font-weight: ${config.capaVigenciaConfig?.bold !== false ? 800 : 400}; letter-spacing: 2px; color: ${config.capaVigenciaConfig?.color || '#002b66'}; text-transform: uppercase;">
                          ${config.mes} ${config.ano}
                        </span>
                        <div style="width: 48px; height: 3px; background-color: ${config.capaVigenciaConfig?.dividerColor || '#0284c7'};"></div>
                      </div>`
                    : ''
                }
                <div style="margin-top: 20px; line-height: 1.5;">
                  ${
                    config.capaSubtitulo1Config?.visible !== false
                      ? `<p style="margin: 0 0 4px 0; font-size: ${config.capaSubtitulo1Config?.fontSize || 18}px; font-weight: ${config.capaSubtitulo1Config?.bold ? 700 : 500}; font-style: ${config.capaSubtitulo1Config?.italic ? 'italic' : 'normal'}; color: ${config.capaSubtitulo1Config?.color || '#334155'};">${config.subtituloCapa1 || ''}</p>`
                      : ''
                  }
                  ${
                    config.capaSubtitulo2Config?.visible !== false
                      ? `<p style="margin: 0; font-size: ${config.capaSubtitulo2Config?.fontSize || 18}px; font-weight: ${config.capaSubtitulo2Config?.bold ? 700 : 500}; font-style: ${config.capaSubtitulo2Config?.italic ? 'italic' : 'normal'}; color: ${config.capaSubtitulo2Config?.color || '#334155'};">${config.subtituloCapa2 || ''}</p>`
                      : ''
                  }
                </div>
              </div>
              ${
                config.capaParceirosConfig?.visible !== false
                  ? `<div style="padding-top: 20px; border-top: 1px solid rgba(148, 163, 184, 0.4);">
                      <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                        Marcas e Parceiros Oficiais
                      </p>
                      <div style="display: flex; align-items: center; gap: 24px; font-size: 13px; font-weight: 700; color: ${config.capaParceirosConfig?.color || '#475569'};">
                        <span style="color: #b91c1c; font-weight: 900; font-size: 15px;">flexfloor</span>
                        <span style="font-weight: 800; letter-spacing: 1px;">FORTALEZA</span>
                        <span style="color: #0284c7;">HD FLEX</span>
                        <span style="letter-spacing: 2px;">NEXA</span>
                        <span style="color: #4d7c0f;">VinilForte</span>
                        <span style="font-weight: 900;">Pix</span>
                        <span>Tarkett</span>
                      </div>
                    </div>`
                  : ''
              }
            </div>
          `;
        } else {
          coverEl.innerHTML = `
            <div style="width: 620px; height: 100%; padding: 56px; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #eff6ff 100%);">
              <div>
                ${
                  config.capaLogoVisible !== false
                    ? `<img src="${config.logoUrl || FENIX_OFFICIAL_LOGO_BASE64}" alt="Logo" style="height: ${config.capaLogoHeight || 64}px; object-fit: contain; margin-bottom: 56px;" />`
                    : ''
                }
                ${
                  config.capaTituloConfig?.visible !== false
                    ? `<h1 style="font-size: ${config.capaTituloConfig?.fontSize || 56}px; font-weight: ${config.capaTituloConfig?.bold !== false ? 900 : 400}; font-style: ${config.capaTituloConfig?.italic ? 'italic' : 'normal'}; color: ${config.capaTituloConfig?.color || '#002b66'}; line-height: 1.05; margin: 0 0 16px 0; text-transform: uppercase;">
                        ${config.nome}
                      </h1>`
                    : ''
                }
                ${
                  config.capaVigenciaConfig?.visible !== false
                    ? `<div style="display: flex; align-items: center; gap: 12px; margin: 24px 0;">
                        <div style="width: 48px; height: 2px; background-color: ${config.capaVigenciaConfig?.dividerColor || '#0284c7'}; margin-top: 14px;"></div>
                        <span style="font-size: ${config.capaVigenciaConfig?.fontSize || 24}px; font-weight: ${config.capaVigenciaConfig?.bold !== false ? 800 : 400}; letter-spacing: 2px; color: ${config.capaVigenciaConfig?.color || '#002b66'}; text-transform: uppercase;">
                          ${config.mes} ${config.ano}
                        </span>
                        <div style="width: 48px; height: 2px; background-color: ${config.capaVigenciaConfig?.dividerColor || '#0284c7'}; margin-top: 14px;"></div>
                      </div>`
                    : ''
                }
                <div style="margin-top: 24px; line-height: 1.5;">
                  ${
                    config.capaSubtitulo1Config?.visible !== false
                      ? `<p style="margin: 0 0 4px 0; font-size: ${config.capaSubtitulo1Config?.fontSize || 18}px; font-weight: ${config.capaSubtitulo1Config?.bold ? 700 : 500}; font-style: ${config.capaSubtitulo1Config?.italic ? 'italic' : 'normal'}; color: ${config.capaSubtitulo1Config?.color || '#334155'};">${config.subtituloCapa1 || ''}</p>`
                      : ''
                  }
                  ${
                    config.capaSubtitulo2Config?.visible !== false
                      ? `<p style="margin: 0; font-size: ${config.capaSubtitulo2Config?.fontSize || 18}px; font-weight: ${config.capaSubtitulo2Config?.bold ? 700 : 500}; font-style: ${config.capaSubtitulo2Config?.italic ? 'italic' : 'normal'}; color: ${config.capaSubtitulo2Config?.color || '#334155'};">${config.subtituloCapa2 || ''}</p>`
                      : ''
                  }
                </div>
              </div>
              ${
                config.capaParceirosConfig?.visible !== false
                  ? `<div style="padding-top: 24px; border-top: 1px solid #e2e8f0;">
                      <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                        Marcas e Parceiros Oficiais
                      </p>
                      <div style="display: flex; align-items: center; gap: 24px; font-size: 13px; font-weight: 700; color: ${config.capaParceirosConfig?.color || '#475569'};">
                        <span style="color: #b91c1c; font-weight: 900; font-size: 15px;">flexfloor</span>
                        <span style="font-weight: 800; letter-spacing: 1px;">FORTALEZA</span>
                        <span style="color: #0284c7;">HD FLEX</span>
                        <span style="letter-spacing: 2px;">NEXA</span>
                        <span style="color: #4d7c0f;">VinilForte</span>
                        <span style="font-weight: 900;">Pix</span>
                        <span style="color: #0f172a;">Tarkett</span>
                      </div>
                    </div>`
                  : ''
              }
            </div>
            <div style="flex: 1; height: 100%; position: relative; background-color: #0c1628; overflow: hidden;">
              <div style="position: absolute; inset: 0; background-image: url('${config.capaFotoUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop"}'); background-size: ${fitMode}; background-position: center; background-repeat: no-repeat;"></div>
              <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(0,0,0,0.3) 100%);"></div>
            </div>
          `;
        }

        container.appendChild(coverEl);
        const dataUrl = await toPng(coverEl, { quality: 0.95, pixelRatio: 2 });
        container.removeChild(coverEl);

        if (!isFirstPdfPage) {
          pdf.addPage([1200, 850], 'landscape');
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1200, 850);
        isFirstPdfPage = false;
        continue;
      }

      // ----------------------------------------------------
      // PÁGINAS DE CONTEÚDO (PRODUTOS) COM PAGINAÇÃO AUTOMÁTICA
      // ----------------------------------------------------
      const pageProducts = produtos.filter((p) => p.paginaNumero === pageInfo.numero);

      // Divide em lotes de no máximo MAX_PRODUCTS_PER_PAGE para nunca cortar produtos
      const productChunks: TabelaLinhaProduto[][] = [];
      if (pageProducts.length === 0) {
        productChunks.push([]);
      } else {
        for (let i = 0; i < pageProducts.length; i += MAX_PRODUCTS_PER_PAGE) {
          productChunks.push(pageProducts.slice(i, i + MAX_PRODUCTS_PER_PAGE));
        }
      }

      for (let chunkIdx = 0; chunkIdx < productChunks.length; chunkIdx++) {
        const chunk = productChunks[chunkIdx];
        const isContinuation = chunkIdx > 0;
        const pageTitleDisplay = isContinuation
          ? `${pageInfo.titulo} (Continuação)`
          : pageInfo.titulo;

        const isMarcaAgrupada = (marca: string): boolean => {
          if (config.marcasAgrupadas && config.marcasAgrupadas[marca] !== undefined) {
            return config.marcasAgrupadas[marca];
          }
          return config.agruparMarcasGlobal !== false;
        };

        // Calcula agrupamento com rowSpan dentro do lote
        const rowsWithSpan: Array<{
          p: TabelaLinhaProduto;
          isStart: boolean;
          span: number;
          grouped: boolean;
        }> = [];

        for (let r = 0; r < chunk.length; r++) {
          const prod = chunk[r];
          const grouped = isMarcaAgrupada(prod.marcaLinha);

          if (!grouped) {
            rowsWithSpan.push({ p: prod, isStart: true, span: 1, grouped: false });
            continue;
          }

          const prev = r > 0 ? chunk[r - 1] : null;
          if (!prev || prev.marcaLinha !== prod.marcaLinha || !isMarcaAgrupada(prev.marcaLinha)) {
            let spanCount = 1;
            for (let next = r + 1; next < chunk.length; next++) {
              if (chunk[next].marcaLinha === prod.marcaLinha) {
                spanCount++;
              } else {
                break;
              }
            }
            rowsWithSpan.push({ p: prod, isStart: true, span: spanCount, grouped: true });
          } else {
            rowsWithSpan.push({ p: prod, isStart: false, span: 0, grouped: true });
          }
        }

        // Renderiza página limpa
        const pageEl = document.createElement('div');
        pageEl.style.width = '1200px';
        pageEl.style.height = '850px';
        pageEl.style.backgroundColor = '#ffffff';
        pageEl.style.padding = '32px';
        pageEl.style.display = 'flex';
        pageEl.style.flexDirection = 'column';
        pageEl.style.justifyContent = 'space-between';
        pageEl.style.fontFamily = 'Inter, sans-serif';
        pageEl.style.color = '#0f172a';

        // Cabeçalho da página
        let rowsHtml = '';
        rowsWithSpan.forEach(({ p, isStart, span, grouped }, idx) => {
          const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          const precoFormatado = p.preco.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          const marcaEstilo = config.estiloMarca || { fontSize: 12, color: '#ffffff', bold: true, align: 'center' };
          const descEstilo = config.estiloDescricao || { fontSize: config.fontSizeDescricao || 12, color: '#0f172a', bold: false, align: 'left' };
          const precoEstilo = config.estiloPreco || { fontSize: config.fontSizePreco || 13, color: '#002b66', bold: true, align: 'right' };
          const unidEstilo = config.estiloUnidade || { fontSize: 11, color: '#475569', bold: false, align: 'center' };

          const marcaCell = grouped
            ? isStart
              ? `<td rowspan="${span}" style="background-color: ${p.marcaCor || '#0284c7'}; color: ${marcaEstilo.color || p.marcaTextColor || '#ffffff'}; font-weight: ${marcaEstilo.bold !== false ? 800 : 400}; font-style: ${marcaEstilo.italic ? 'italic' : 'normal'}; font-size: ${marcaEstilo.fontSize || 11}px; text-align: ${marcaEstilo.align || 'center'}; vertical-align: middle; padding: 8px; border-right: 1px solid #cbd5e1; text-transform: uppercase;">${p.marcaLinha}</td>`
              : ''
            : `<td style="background-color: ${p.marcaCor || '#0284c7'}; color: ${marcaEstilo.color || p.marcaTextColor || '#ffffff'}; font-weight: ${marcaEstilo.bold !== false ? 800 : 400}; font-style: ${marcaEstilo.italic ? 'italic' : 'normal'}; font-size: ${marcaEstilo.fontSize || 11}px; text-align: ${marcaEstilo.align || 'center'}; vertical-align: middle; padding: 6px; border-right: 1px solid #e2e8f0; text-transform: uppercase;">${p.marcaLinha}</td>`;

          const promoBadge = p.promocao
            ? `<span style="background-color: #dc2626; color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-left: 6px;">${p.promocaoTexto || 'PROMOÇÃO'}</span>`
            : '';

          const subDesc = p.subDescricao
            ? `<div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px;">${p.subDescricao}</div>`
            : '';

          rowsHtml += `
            <tr style="background-color: ${bgRow}; height: ${config.alturaLinha || 38}px;">
              ${marcaCell}
              <td style="padding: 6px 14px; border-right: 1px solid #e2e8f0; vertical-align: middle; text-align: ${descEstilo.align || 'left'};">
                <div style="font-weight: ${descEstilo.bold ? 700 : 500}; font-style: ${descEstilo.italic ? 'italic' : 'normal'}; font-size: ${descEstilo.fontSize || 12}px; color: ${descEstilo.color || '#0f172a'}; display: flex; align-items: center;">
                  <span>${p.descricao}</span>
                  ${promoBadge}
                </div>
                ${subDesc}
              </td>
              <td style="padding: 6px 12px; text-align: ${precoEstilo.align || 'right'}; font-weight: ${precoEstilo.bold !== false ? 800 : 500}; font-style: ${precoEstilo.italic ? 'italic' : 'normal'}; font-size: ${precoEstilo.fontSize || 13}px; color: ${precoEstilo.color || '#0f172a'}; border-right: 1px solid #e2e8f0; vertical-align: middle; white-space: nowrap;">
                <span style="font-size: 10px; color: #64748b; margin-right: 2px;">R$</span> ${precoFormatado}
              </td>
              <td style="padding: 6px 8px; text-align: ${unidEstilo.align || 'center'}; font-weight: ${unidEstilo.bold ? 700 : 500}; font-style: ${unidEstilo.italic ? 'italic' : 'normal'}; font-size: ${unidEstilo.fontSize || 11}px; color: ${unidEstilo.color || '#475569'}; vertical-align: middle;">
                ${p.unidade}
              </td>
            </tr>
          `;
        });

        pageEl.innerHTML = `
          <!-- CABEÇALHO LIMPO -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 2px solid #0f172a;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${config.logoUrl || FENIX_OFFICIAL_LOGO_BASE64}" alt="Logo" style="height: 36px; object-fit: contain;" />
            </div>
            <h2 style="font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; text-align: center;">
              ${pageTitleDisplay}
            </h2>
            <div style="background-color: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; border: 1px solid #bae6fd;">
              ${config.mes} ${config.ano}
            </div>
          </div>

          <!-- TABELA LIMPA SEM BOTOES -->
          <div style="flex: 1; margin: 12px 0; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
              <thead>
                <tr style="background-color: ${config.tabelaHeaderBg || '#0b192e'}; color: ${config.tabelaHeaderColor || '#ffffff'}; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                  <th style="width: ${config.colunaMarcaWidth || 220}px; padding: 10px 12px; text-align: center; border-right: 1px solid #334155;">
                    MARCA / LINHA
                  </th>
                  <th style="padding: 10px 14px; border-right: 1px solid #334155;">
                    DESCRIÇÃO
                  </th>
                  <th style="width: ${config.colunaPrecoWidth || 120}px; padding: 10px 12px; text-align: right; border-right: 1px solid #334155;">
                    PREÇO
                  </th>
                  <th style="width: 65px; padding: 10px 8px; text-align: center;">
                    UN.
                  </th>
                </tr>
              </thead>
              <tbody style="border-top: 1px solid #e2e8f0;">
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- RODAPÉ LIMPO -->
          <div style="padding-top: 8px; border-top: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b;">
            <p style="margin: 0; font-size: 10px; font-weight: 500; max-width: 900px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${config.observacaoRodape || 'OS PREÇOS PODEM MUDAR SEM PRÉVIO AVISO. ANTES DE FECHAR SUAS NEGOCIAÇÕES ENTRE EM CONTATO.'}
            </p>
            <p style="margin: 0; font-weight: 700; color: #334155;">
              Página ${currentPdfPageNumber}
            </p>
          </div>
        `;

        container.appendChild(pageEl);
        const dataUrl = await toPng(pageEl, { quality: 0.95, pixelRatio: 2 });
        container.removeChild(pageEl);

        if (!isFirstPdfPage) {
          pdf.addPage([1200, 850], 'landscape');
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1200, 850);
        isFirstPdfPage = false;
        currentPdfPageNumber++;
      }
    }

    const safeName = (config.nome || 'Tabela de Revenda').replace(/[^\w\s-]/gi, '');
    pdf.save(`${safeName} - ${config.mes} ${config.ano}.pdf`);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF da Tabela Comercial:', err);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
