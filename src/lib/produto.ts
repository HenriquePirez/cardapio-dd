/** Na edição, o identificador do produto é imutável: trocar criaria duplicata. */
export function idEdicaoValido(idNovo: string, idOriginal: string): boolean {
  return !idOriginal || idNovo === idOriginal;
}
