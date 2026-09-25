import { DocumentoItem, DocumentoPagina, DocumentoElemento, DocumentoCampoModelo } from '../types';

/**
 * Interface dos Produtos do Termo de Autorização
 */
export interface TermoProdutoItem {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

/**
 * Interface dos Dados Preenchidos do Termo de Autorização
 */
export interface TermoAutorizacaoFormData {
  clienteNome: string;
  clienteCpf: string;
  titularNome: string;
  titularCpf: string;
  titularMesmoCliente: boolean;
  cartaoUltimos4: string;
  cartaoBandeira: string;
  produtos: TermoProdutoItem[];
  frete: number;
  valorTotalAutorizado: number;
  formaPagamento: 'Crédito' | 'Débito';
  parcelas: number;
  dataAutorizacao: string;
  observacoes?: string;
}

export const INITIAL_TERMO_PRODUTOS: TermoProdutoItem[] = [
  {
    id: 'prod_1',
    descricao: 'Piso Vinílico Flexfloor 3mm Colado - Linha Premium',
    quantidade: 35,
    valorUnitario: 89.9,
    valorTotal: 3146.5,
  },
  {
    id: 'prod_2',
    descricao: 'Adesivo Acrílico de Contato Premium (Balde 14kg)',
    quantidade: 2,
    valorUnitario: 185.0,
    valorTotal: 370.0,
  },
];

export const INITIAL_TERMO_DATA: TermoAutorizacaoFormData = {
  clienteNome: 'Construtora e Incorporadora Splendor Ltda',
  clienteCpf: '12.345.678/0001-90',
  titularNome: 'Carlos Eduardo Silveira',
  titularCpf: '123.456.789-00',
  titularMesmoCliente: false,
  cartaoUltimos4: '4892',
  cartaoBandeira: 'Mastercard',
  produtos: INITIAL_TERMO_PRODUTOS,
  frete: 120.0,
  valorTotalAutorizado: 3636.5,
  formaPagamento: 'Crédito',
  parcelas: 3,
  dataAutorizacao: new Date().toLocaleDateString('pt-BR'),
  observacoes: 'Material para entrega imediata na obra Central Park.',
};

/**
 * Gera a página do modelo padrão "Termo de Autorização de Pagamento por Link".
 * Todos os textos e elementos visuais são elementos editáveis de primeira classe.
 */
export function buildTermoAutorizacaoPaginas(data: TermoAutorizacaoFormData = INITIAL_TERMO_DATA): DocumentoPagina[] {
  const elementos: DocumentoElemento[] = [
    // 1. Cabeçalho Corporativo Fênix World Distribuidora
    {
      id: 'el_termo_bg_top',
      tipo: 'forma',
      x: 0,
      y: 0,
      width: 794,
      height: 90,
      corFundo: '#0052cc',
    },
    {
      id: 'el_termo_brand_name',
      tipo: 'texto',
      conteudo: 'FÊNIX WORLD DISTRIBUIDORA',
      x: 36,
      y: 22,
      width: 480,
      height: 28,
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    },
    {
      id: 'el_termo_brand_sub',
      tipo: 'texto',
      conteudo: 'Pisos Vinílicos, Laminados, Rodapés & Soluções Corporativas',
      x: 36,
      y: 52,
      width: 480,
      height: 20,
      fontSize: 11,
      color: '#bfdbfe',
      fontFamily: 'Inter, sans-serif',
    },
    {
      id: 'el_termo_brand_cnpj',
      tipo: 'texto',
      conteudo: 'CNPJ: 14.285.926/0001-30 • comercial@fenixworld.com.br',
      x: 430,
      y: 52,
      width: 328,
      height: 20,
      fontSize: 10,
      textAlign: 'right',
      color: '#e0e7ff',
      fontFamily: 'Inter, sans-serif',
    },

    // 2. Título Oficial do Documento
    {
      id: 'el_termo_titulo_doc',
      tipo: 'cabecalho',
      conteudo: 'TERMO DE AUTORIZAÇÃO DE PAGAMENTO POR LINK',
      textoSecundario: 'Autorização Formal para Débito/Crédito em Cartão à Distância',
      x: 36,
      y: 106,
      width: 722,
      height: 48,
      fontSize: 16,
      fontWeight: 'bold',
      color: '#0f172a',
      textAlign: 'center',
    },

    // 3. Preâmbulo Legal
    {
      id: 'el_termo_preambulo',
      tipo: 'texto',
      conteudo:
        'Pelo presente instrumento particular, o(a) titular do cartão de pagamento abaixo qualificado(a) autoriza de forma expressa, consciente e irrevogável a empresa FÊNIX WORLD DISTRIBUIDORA LTDA a processar a transação financeira discriminada a seguir, reconhecendo a legitimidade da compra e a respectiva autorização de cobrança.',
      x: 36,
      y: 162,
      width: 722,
      height: 45,
      fontSize: 10.5,
      color: '#334155',
      textAlign: 'justify',
      fontFamily: 'Inter, sans-serif',
    },

    // 4. Seção 1: Identificação do Cliente e do Titular
    {
      id: 'el_termo_sec1_box',
      tipo: 'forma',
      x: 36,
      y: 216,
      width: 722,
      height: 98,
      corFundo: '#f8fafc',
    },
    {
      id: 'el_termo_sec1_title',
      tipo: 'texto',
      conteudo: '1. DADOS DO CLIENTE E DO TITULAR DO CARTÃO',
      x: 48,
      y: 224,
      width: 698,
      height: 18,
      fontSize: 11,
      fontWeight: 'bold',
      color: '#0052cc',
    },
    {
      id: 'el_termo_lbl_cli',
      tipo: 'texto',
      conteudo: `Nome Completo do Cliente: ${data.clienteNome || '________________________________________'}`,
      x: 48,
      y: 246,
      width: 440,
      height: 18,
      fontSize: 10.5,
      color: '#1e293b',
    },
    {
      id: 'el_termo_lbl_cli_cpf',
      tipo: 'texto',
      conteudo: `CPF/CNPJ Cliente: ${data.clienteCpf || '____________________'}`,
      x: 500,
      y: 246,
      width: 246,
      height: 18,
      fontSize: 10.5,
      color: '#1e293b',
    },
    {
      id: 'el_termo_lbl_titular',
      tipo: 'texto',
      conteudo: `Nome do Titular do Cartão: ${data.titularNome || '________________________________________'}`,
      x: 48,
      y: 268,
      width: 440,
      height: 18,
      fontSize: 10.5,
      color: '#1e293b',
    },
    {
      id: 'el_termo_lbl_titular_cpf',
      tipo: 'texto',
      conteudo: `CPF do Titular: ${data.titularCpf || '____________________'}`,
      x: 500,
      y: 268,
      width: 246,
      height: 18,
      fontSize: 10.5,
      color: '#1e293b',
    },
    {
      id: 'el_termo_lbl_cartao_info',
      tipo: 'texto',
      conteudo: `Cartão: Final •••• ${data.cartaoUltimos4 || '____'}   |   Bandeira: ${data.cartaoBandeira || 'Visa / Mastercard / Elo'}`,
      x: 48,
      y: 290,
      width: 698,
      height: 18,
      fontSize: 10.5,
      fontWeight: 'bold',
      color: '#0f172a',
    },

    // 5. Seção 2: Discriminação dos Produtos e Valores
    {
      id: 'el_termo_sec2_title',
      tipo: 'texto',
      conteudo: '2. DISCRIMINAÇÃO DOS PRODUTOS / SERVIÇOS E VALORES',
      x: 36,
      y: 326,
      width: 722,
      height: 18,
      fontSize: 11,
      fontWeight: 'bold',
      color: '#0052cc',
    },

    // Cabeçalho da Tabela de Produtos
    {
      id: 'el_termo_tbl_header_bg',
      tipo: 'forma',
      x: 36,
      y: 348,
      width: 722,
      height: 24,
      corFundo: '#e2e8f0',
    },
    {
      id: 'el_termo_th_item',
      tipo: 'texto',
      conteudo: 'Item / Descrição do Produto',
      x: 46,
      y: 353,
      width: 380,
      height: 16,
      fontSize: 9.5,
      fontWeight: 'bold',
      color: '#334155',
    },
    {
      id: 'el_termo_th_qtd',
      tipo: 'texto',
      conteudo: 'Qtd.',
      x: 440,
      y: 353,
      width: 60,
      height: 16,
      fontSize: 9.5,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#334155',
    },
    {
      id: 'el_termo_th_unit',
      tipo: 'texto',
      conteudo: 'Valor Unitário',
      x: 510,
      y: 353,
      width: 110,
      height: 16,
      fontSize: 9.5,
      fontWeight: 'bold',
      textAlign: 'right',
      color: '#334155',
    },
    {
      id: 'el_termo_th_total',
      tipo: 'texto',
      conteudo: 'Valor Total',
      x: 630,
      y: 353,
      width: 118,
      height: 16,
      fontSize: 9.5,
      fontWeight: 'bold',
      textAlign: 'right',
      color: '#334155',
    },
  ];

  // Adiciona as linhas dinâmicas de produtos (até 5 itens visuais formatados na folha A4)
  let currentY = 376;
  const produtosExibicao = data.produtos && data.produtos.length > 0 ? data.produtos : INITIAL_TERMO_PRODUTOS;

  produtosExibicao.slice(0, 5).forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    if (!isEven) {
      elementos.push({
        id: `el_termo_row_bg_${idx}`,
        tipo: 'forma',
        x: 36,
        y: currentY - 2,
        width: 722,
        height: 22,
        corFundo: '#f8fafc',
      });
    }

    elementos.push(
      {
        id: `el_termo_row_desc_${idx}`,
        tipo: 'texto',
        conteudo: `${idx + 1}. ${p.descricao || 'Produto/Item sem descrição'}`,
        x: 46,
        y: currentY + 1,
        width: 380,
        height: 16,
        fontSize: 9.5,
        color: '#1e293b',
      },
      {
        id: `el_termo_row_qtd_${idx}`,
        tipo: 'texto',
        conteudo: String(p.quantidade || 1),
        x: 440,
        y: currentY + 1,
        width: 60,
        height: 16,
        fontSize: 9.5,
        textAlign: 'center',
        color: '#1e293b',
      },
      {
        id: `el_termo_row_unit_${idx}`,
        tipo: 'texto',
        conteudo: (p.valorUnitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        x: 510,
        y: currentY + 1,
        width: 110,
        height: 16,
        fontSize: 9.5,
        textAlign: 'right',
        color: '#1e293b',
      },
      {
        id: `el_termo_row_tot_${idx}`,
        tipo: 'texto',
        conteudo: (p.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        x: 630,
        y: currentY + 1,
        width: 118,
        height: 16,
        fontSize: 9.5,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#0f172a',
      }
    );

    currentY += 22;
  });

  // Linhas de Frete e Total Autorizado
  const freteFormatted = (data.frete || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalAutorizadoFormatted = (data.valorTotalAutorizado || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  elementos.push(
    // Linha do Frete
    {
      id: 'el_termo_frete_lbl',
      tipo: 'texto',
      conteudo: 'Frete e Logística de Entrega:',
      x: 430,
      y: currentY + 4,
      width: 190,
      height: 18,
      fontSize: 10,
      textAlign: 'right',
      color: '#475569',
    },
    {
      id: 'el_termo_frete_val',
      tipo: 'texto',
      conteudo: freteFormatted,
      x: 630,
      y: currentY + 4,
      width: 118,
      height: 18,
      fontSize: 10,
      fontWeight: 'bold',
      textAlign: 'right',
      color: '#334155',
    },

    // Box do Total Autorizado em Destaque
    {
      id: 'el_termo_total_box',
      tipo: 'forma',
      x: 36,
      y: currentY + 28,
      width: 722,
      height: 38,
      corFundo: '#eff6ff',
    },
    {
      id: 'el_termo_total_lbl',
      tipo: 'texto',
      conteudo: 'VALOR TOTAL AUTORIZADO:',
      x: 50,
      y: currentY + 38,
      width: 320,
      height: 20,
      fontSize: 13,
      fontWeight: 'bold',
      color: '#0052cc',
    },
    {
      id: 'el_termo_total_val',
      tipo: 'texto',
      conteudo: totalAutorizadoFormatted,
      x: 420,
      y: currentY + 36,
      width: 328,
      height: 22,
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'right',
      color: '#0052cc',
    }
  );

  const condicoesY = currentY + 80;

  // 6. Seção 3: Condições de Pagamento e Parcelas
  const parcelasDesc =
    data.formaPagamento === 'Crédito'
      ? `${data.parcelas || 1}x de ${(
          (data.valorTotalAutorizado || 0) / (data.parcelas || 1)
        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros`
      : 'À vista no débito';

  elementos.push(
    {
      id: 'el_termo_sec3_box',
      tipo: 'forma',
      x: 36,
      y: condicoesY,
      width: 722,
      height: 58,
      corFundo: '#f8fafc',
    },
    {
      id: 'el_termo_sec3_title',
      tipo: 'texto',
      conteudo: '3. FORMA DE PAGAMENTO E PARCELAMENTO',
      x: 48,
      y: condicoesY + 8,
      width: 698,
      height: 18,
      fontSize: 11,
      fontWeight: 'bold',
      color: '#0052cc',
    },
    {
      id: 'el_termo_sec3_forma',
      tipo: 'texto',
      conteudo: `Forma Selecionada: Cartão de ${data.formaPagamento || 'Crédito'}`,
      x: 48,
      y: condicoesY + 30,
      width: 320,
      height: 18,
      fontSize: 10.5,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    {
      id: 'el_termo_sec3_parcelas',
      tipo: 'texto',
      conteudo: `Condição de Pagamento: ${parcelasDesc}`,
      x: 380,
      y: condicoesY + 30,
      width: 366,
      height: 18,
      fontSize: 10.5,
      fontWeight: 'bold',
      color: '#1e293b',
    }
  );

  const declY = condicoesY + 70;

  // 7. Seção 4: Declaração de Ciência e Renúncia a Chargeback
  elementos.push(
    {
      id: 'el_termo_sec4_title',
      tipo: 'texto',
      conteudo: '4. DECLARAÇÃO DE RECONHECIMENTO E VALIDADE DA OPERAÇÃO',
      x: 36,
      y: declY,
      width: 722,
      height: 18,
      fontSize: 10.5,
      fontWeight: 'bold',
      color: '#0f172a',
    },
    {
      id: 'el_termo_sec4_texto',
      tipo: 'texto',
      conteudo:
        'Declaro para todos os fins de direito que recebi o link oficial de pagamento correspondente a este pedido, conferi as especificações, metragens e valores discriminados, autorizando a efetivação da cobrança junto à emissora do cartão. Renuncio expressamente a qualquer alegação de desconhecimento ou estorno indevido (chargeback), atestando a plena legitimidade desta transação comercial.',
      x: 36,
      y: declY + 22,
      width: 722,
      height: 48,
      fontSize: 9.5,
      color: '#475569',
      textAlign: 'justify',
      fontFamily: 'Inter, sans-serif',
    }
  );

  const sigY = declY + 85;

  // 8. Seção 5: Local, Data e Assinatura do Titular
  elementos.push(
    {
      id: 'el_termo_data_local',
      tipo: 'texto',
      conteudo: `São Paulo - SP, ${data.dataAutorizacao || new Date().toLocaleDateString('pt-BR')}`,
      x: 36,
      y: sigY,
      width: 722,
      height: 18,
      fontSize: 10.5,
      textAlign: 'center',
      color: '#334155',
    },
    // Linha de Assinatura
    {
      id: 'el_termo_sig_line',
      tipo: 'forma',
      x: 216,
      y: sigY + 68,
      width: 362,
      height: 1,
      corFundo: '#94a3b8',
    },
    {
      id: 'el_termo_sig_name',
      tipo: 'texto',
      conteudo: data.titularNome || 'Assinatura do(a) Titular do Cartão',
      x: 180,
      y: sigY + 74,
      width: 434,
      height: 18,
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#0f172a',
    },
    {
      id: 'el_termo_sig_cpf',
      tipo: 'texto',
      conteudo: data.titularCpf ? `CPF: ${data.titularCpf}` : 'CPF do Titular',
      x: 180,
      y: sigY + 92,
      width: 434,
      height: 16,
      fontSize: 9.5,
      textAlign: 'center',
      color: '#64748b',
    },
    // Rodapé de segurança
    {
      id: 'el_termo_footer_sec',
      tipo: 'texto',
      conteudo:
        'Documento registrado e validado via Fênix World Cloud • Sistema de Gestão Comercial e Conformidade de Pagamentos',
      x: 36,
      y: 1080,
      width: 722,
      height: 18,
      fontSize: 8.5,
      textAlign: 'center',
      color: '#94a3b8',
    }
  );

  return [
    {
      id: 'page_termo_pagamento_1',
      numero: 1,
      titulo: 'Termo de Autorização de Pagamento por Link',
      width: 794,
      height: 1123,
      orientation: 'portrait',
      backgroundColor: '#ffffff',
      elementos,
    },
  ];
}

/**
 * Cria a lista de campos do modelo para o Termo de Autorização.
 */
export function getTermoAutorizacaoCamposModelo(): DocumentoCampoModelo[] {
  return [
    {
      id: 'cliente_nome',
      nome: 'Nome do Cliente',
      tipo: 'texto',
      obrigatorio: true,
      paginaNumero: 1,
      x: 48,
      y: 246,
      width: 440,
      height: 18,
      placeholder: 'Nome completo ou Razão Social do cliente',
      vinculoCrm: 'cliente_nome',
    },
    {
      id: 'cliente_cpf',
      nome: 'CPF do Cliente',
      tipo: 'cpf_cnpj',
      obrigatorio: true,
      paginaNumero: 1,
      x: 500,
      y: 246,
      width: 246,
      height: 18,
      placeholder: '000.000.000-00',
      vinculoCrm: 'cliente_documento',
    },
    {
      id: 'titular_nome',
      nome: 'Nome do Titular do Cartão',
      tipo: 'texto',
      obrigatorio: true,
      paginaNumero: 1,
      x: 48,
      y: 268,
      width: 440,
      height: 18,
      placeholder: 'Nome impresso no cartão',
    },
    {
      id: 'titular_cpf',
      nome: 'CPF do Titular',
      tipo: 'cpf_cnpj',
      obrigatorio: true,
      paginaNumero: 1,
      x: 500,
      y: 268,
      width: 246,
      height: 18,
      placeholder: '000.000.000-00',
    },
    {
      id: 'cartao_ultimos4',
      nome: 'Últimos 4 Dígitos do Cartão',
      tipo: 'numero',
      obrigatorio: true,
      paginaNumero: 1,
      x: 140,
      y: 290,
      width: 80,
      height: 18,
      placeholder: '1234',
    },
    {
      id: 'cartao_bandeira',
      nome: 'Bandeira do Cartão',
      tipo: 'selecao',
      obrigatorio: true,
      paginaNumero: 1,
      x: 320,
      y: 290,
      width: 140,
      height: 18,
      opcoes: ['Mastercard', 'Visa', 'Elo', 'Hipercard', 'American Express', 'Diners Club'],
    },
    {
      id: 'frete',
      nome: 'Frete',
      tipo: 'moeda',
      obrigatorio: false,
      paginaNumero: 1,
      x: 630,
      y: 490,
      width: 118,
      height: 18,
      placeholder: 'R$ 0,00',
    },
    {
      id: 'valor_total_autorizado',
      nome: 'Valor Total Autorizado',
      tipo: 'moeda',
      obrigatorio: true,
      paginaNumero: 1,
      x: 420,
      y: 520,
      width: 328,
      height: 22,
      placeholder: 'R$ 0,00',
    },
    {
      id: 'forma_pagamento',
      nome: 'Forma de Pagamento',
      tipo: 'selecao',
      obrigatorio: true,
      paginaNumero: 1,
      x: 180,
      y: 574,
      width: 140,
      height: 18,
      opcoes: ['Crédito', 'Débito'],
    },
    {
      id: 'parcelas',
      nome: 'Parcelas (quando Crédito)',
      tipo: 'selecao',
      obrigatorio: false,
      paginaNumero: 1,
      x: 520,
      y: 574,
      width: 220,
      height: 18,
      opcoes: [
        '1x à vista',
        '2x sem juros',
        '3x sem juros',
        '4x sem juros',
        '5x sem juros',
        '6x sem juros',
        '7x sem juros',
        '8x sem juros',
        '9x sem juros',
        '10x sem juros',
        '11x sem juros',
        '12x sem juros',
      ],
    },
    {
      id: 'assinatura_titular',
      nome: 'Assinatura do Titular do Cartão',
      tipo: 'assinatura_normal',
      obrigatorio: true,
      paginaNumero: 1,
      x: 216,
      y: 810,
      width: 362,
      height: 80,
    },
  ];
}

/**
 * Cria a instância oficial do Documento Modelo "Termo de Autorização de Pagamento por Link".
 */
export function getInitialTermoAutorizacaoPagamentoDoc(): DocumentoItem {
  const now = new Date().toISOString();
  const paginas = buildTermoAutorizacaoPaginas(INITIAL_TERMO_DATA);
  const camposModelo = getTermoAutorizacaoCamposModelo();

  return {
    id: 'termo_autorizacao_pagamento_link',
    titulo: 'Termo de Autorização de Pagamento por Link',
    categoriaId: 'cat_termos_juridicos',
    categoriaNome: 'Termos e Contratos',
    descricao:
      'Modelo oficial para autorização de cobrança em cartão de crédito/débito à distância com tabela dinâmica de produtos, cálculo automático de totais e prevenção a chargeback.',
    isModelo: true,
    nomeArquivoOriginal: 'TERMO_AUTORIZACAO_PAGAMENTO_LINK.pdf',
    totalPaginas: 1,
    tipoArquivo: 'application/pdf',
    tamanhoArquivo: '240 KB',
    paginas,
    camposModelo,
    createdAt: now,
    updatedAt: now,
    criadoPor: 'Diretoria Financeira Fênix World',
  };
}
