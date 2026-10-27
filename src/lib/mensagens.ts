/**
 * Textos dos códigos `?msg=` / `?erro=` devolvidos pelas APIs do painel.
 * Toda validação que redireciona precisa de uma entrada aqui — senão o
 * usuário volta para a tela sem saber que nada foi salvo.
 */
export const AVISOS_PRODUTO: Record<string, string> = {
  ok: 'Produto salvo.',
  excluido: 'Produto excluído.',
  'nao-encontrado': 'Produto não encontrado.',
  'erro-slug': 'Identificador inválido: use letras minúsculas, números e hífen.',
  'erro-nome': 'Informe o nome do produto.',
  'erro-preco': 'Preço inválido. Use um número, por exemplo 28.90.',
  'erro-ordem': 'Ordem inválida: informe um número inteiro maior ou igual a zero.',
  'erro-categoria': 'Escolha uma categoria válida.',
  'erro-link': 'Link de compra inválido: use um endereço começando com http:// ou https://.',
  'erro-slug-duplicado': 'Já existe outro produto com esse identificador.',
  'erro-galeria': 'A galeria chegou incompleta e nada foi salvo. Recarregue a página e tente de novo.',
};

export const AVISOS_CATEGORIA: Record<string, string> = {
  ok: 'Alterações salvas.',
  excluida: 'Categoria excluída.',
  'erro-slug': 'Identificador inválido: use letras minúsculas, números e hífen.',
  'erro-nome': 'Informe o nome da categoria.',
  'erro-ordem': 'Ordem inválida: informe um número inteiro maior ou igual a zero.',
  'erro-slug-em-uso': 'Já existe uma categoria com esse identificador.',
};

/** Código de sucesso (banner verde) x falha (banner vermelho). */
export function ehSucesso(msg: string | null): boolean {
  return msg === 'ok' || msg === 'excluido' || msg === 'excluida';
}
