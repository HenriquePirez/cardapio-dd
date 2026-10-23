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
