/**
 * Configuração central do cardápio.
 * Troque os valores abaixo quando for para produção.
 */
/** Responsável pelo tratamento de dados e contato exibido nas páginas legais. */
export const EMPRESA = {
  nome: 'Henrique Pires',
  telefone: '31995242304',
  telefoneExibicao: '(31) 99524-2304',
  telefoneLink: '+5531995242304',
  email: 'hpnogueira1@gmail.com',
} as const;

/** Versão dos documentos legais; registrada no aceite do painel. */
export const LEGAL = {
  versao: '2026-11-03',
  atualizadoEm: '03/11/2026',
} as const;

export const SITE = {
  nome: 'Dona Dôra',
  descricao: 'Pizzas artesanais, massas e lasanhas — veja as fotos e faça seu pedido.',
  // A base de mídia externa não fica aqui: configure a variável
  // MEDIA_PUBLIC_BASE no wrangler.jsonc (ou via `wrangler secret put`).
  // URLs de mídia: ver src/lib/env.ts (urlMidia).
  // Link do app de compra usado quando o produto não define comprarUrl (reserva)
  linkPadraoComprar: '',
  // Idioma/telefone etc. conforme necessário
  idioma: 'pt-BR',
} as const;

/** Formata um número como moeda BRL (ex: 28.9 -> "R$ 28,90"). */
export function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}
