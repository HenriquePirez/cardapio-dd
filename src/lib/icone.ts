/**
 * Limite de emojis do ícone de categoria.
 *
 * O ícone é exibido numa miniatura quadrada de 52px, então só cabem 2
 * emojis. Cortamos por *graphema* (não por code unit): um mesmo emoji pode
 * ocupar vários code points UTF-16 (ZWJ, bandeiras, skin tones) e contar
 * por caractere separaria a sequência no meio.
 */

/** Máximo de emojis por categoria. */
export const MAX_ICONE = 2;

/**
 * Nomes de ícone curados do Uicons (Flaticon, estilo bold rounded),
 * verificados no pacote `@flaticon/flaticon-uicons` — só nomes desta
 * lista viram classe CSS; qualquer outro valor é texto (emoji legado).
 */
export const ICONES_CATEGORIA = [
  'pizza-slice',
  'burger-alt',
  'bowl-chopsticks-noodles',
  'cake-birthday',
  'cake-slice',
  'beer',
  'leaf',
  'pot',
  'mushroom',
  'bread-slice',
  'store-alt',
  'tags',
  'camera',
] as const;

/** Resultado da resolução: classe CSS do ícone ou texto legado. */
export type IconeCategoria = { classe: string } | { texto: string };

/**
 * Decide como um valor de `icone` é exibido: nome da lista vira classe
 * `fi-br-*`; vazio some; qualquer outro valor (emoji antigo) vira texto.
 */
export function resolverIcone(valor: string | null | undefined): IconeCategoria | null {
  const v = (valor ?? '').trim();
  if (!v) return null;
  if ((ICONES_CATEGORIA as readonly string[]).includes(v)) return { classe: `fi-br-${v}` };
  return { texto: v };
}

/**
 * Normaliza o valor vindo do formulário antes de salvar: nome da lista
 * passa intacto; senão aplica o corte legado de emojis (descarta texto).
 */
export function normalizarIcone(valor: string): string {
  const v = valor.trim();
  if ((ICONES_CATEGORIA as readonly string[]).includes(v)) return v;
  return limitarEmojis(v);
}

/**
 * Corta `texto` para no máximo `max` emojis (graphemas que contenham emoji).
 * Graphemas sem emoji (espaços, texto) são descartados — o campo é só de ícone.
 */
export function limitarEmojis(texto: string, max = MAX_ICONE): string {
  const graphemas = segmentar(texto);
  const emojis = graphemas.filter((g) => contemEmoji(g));
  return emojis.slice(0, max).join('');
}

/** Conta quantos emojis (graphemas) o texto tem. */
export function contarEmojis(texto: string): number {
  return segmentar(texto).filter((g) => contemEmoji(g)).length;
}

function segmentar(texto: string): string[] {
  // Intl.Segmenter separa por grapheme cluster (suporta ZWJ/flag sequences).
  const SegmenterCtor = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (SegmenterCtor) {
    const seg = new SegmenterCtor('pt-BR', { granularity: 'grapheme' });
    return [...seg.segment(texto)].map((s) => s.segment);
  }
  // Fallback: espalha por code point (melhor que por code unit UTF-16).
  return [...texto];
}

function contemEmoji(graphema: string): boolean {
  // Extended_Pictographic cobre emoji modernos; o fallback cobre os antigos.
  return /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(graphema);
}
