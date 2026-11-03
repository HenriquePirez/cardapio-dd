/**
 * Textos da interface do cardápio. Só o que é do sistema é traduzido:
 * nomes e descrições cadastrados pelo dono continuam no idioma original.
 */
export const IDIOMAS = ['pt', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

const PT = {
  tagline: 'O sabor que começa pelos olhos',
  destaques: 'Destaques',
  cardapioVazio: 'Cardápio em construção. Volte em breve!',
  midias: '{n} mídias',
  ampliar: 'Ampliar',
  comprar: 'Comprar',
  verFotos: 'Ver fotos de {nome}',
  semFotos: '{nome} (sem fotos)',
  semFoto: 'Sem foto',
  video: 'Vídeo',
  galeriaProduto: 'Galeria do produto',
  navegacaoGaleria: 'Navegação da galeria',
  irParaItem: 'Ir para o item {n} de {total}',
  pergunta: 'O pedido é para comer no local ou para retirada?',
  comerLocal: 'Comer no local',
  retirada: 'Retirada',
  totemTitulo: 'Peça pelo totem',
  totemAlt: 'Totem de autoatendimento do estabelecimento',
  totemTexto: 'Pedidos para comer no local são feitos somente no totem local.',
  voltar: 'Voltar',
  entendi: 'Entendi',
  fechar: 'Fechar',
  cardapioDigital: 'Cardápio digital',
  iconesPor: 'Ícones por',
  temaEscuro: 'Ativar tema escuro',
  temaClaro: 'Ativar tema claro',
  idiomaIngles: 'Mudar para inglês',
  idiomaPortugues: 'Mudar para português',
} as const;

type Chave = keyof typeof PT;

const EN: Record<Chave, string> = {
  tagline: 'Flavor begins with your eyes',
  destaques: 'Highlights',
  cardapioVazio: 'Menu under construction. Check back soon!',
  midias: '{n} media',
  ampliar: 'Enlarge',
  comprar: 'Order',
  verFotos: 'View photos of {nome}',
  semFotos: '{nome} (no photos)',
  semFoto: 'No photo',
  video: 'Video',
  galeriaProduto: 'Product gallery',
  navegacaoGaleria: 'Gallery navigation',
  irParaItem: 'Go to item {n} of {total}',
  pergunta: 'Is this order to eat in or to pick up?',
  comerLocal: 'Eat in',
  retirada: 'Pickup',
  totemTitulo: 'Order at the kiosk',
  totemAlt: 'Self-service kiosk at the restaurant',
  totemTexto: 'Dine-in orders are placed only at the self-service kiosk.',
  voltar: 'Back',
  entendi: 'Got it',
  fechar: 'Close',
  cardapioDigital: 'Digital menu',
  iconesPor: 'Icons by',
  temaEscuro: 'Switch to dark theme',
  temaClaro: 'Switch to light theme',
  idiomaIngles: 'Switch to English',
  idiomaPortugues: 'Switch to Portuguese',
};

const TEXTOS: Record<Idioma, Record<Chave, string>> = { pt: PT, en: EN };

/** Texto traduzido; `{nome}`/`{n}` são substituídos pelos valores recebidos. */
export function traduzir(
  idioma: Idioma,
  chave: Chave,
  valores: Record<string, string | number> = {},
): string {
  return TEXTOS[idioma][chave].replace(/\{(\w+)\}/g, (original, nome: string) =>
    nome in valores ? String(valores[nome]) : original,
  );
}

export type { Chave as ChaveTexto };
