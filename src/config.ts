/**
 * Configuração central do cardápio.
 * Troque os valores abaixo quando for para produção.
 */
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
