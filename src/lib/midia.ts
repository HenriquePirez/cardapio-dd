/**
 * Limpeza de objetos de mídia no KV.
 *
 * O plano free do KV guarda 1 GB no total, então não dá para deixar
 * arquivos órfãos: quando o usuário tira um item da galeria ou apaga um
 * produto, apagamos também os objetos correspondentes.
 *
 * As operações são "best effort": uma falha aqui nunca deve impedir a
 * gravação no banco (o registro já foi removido).
 */
import { kvMidia, chaveValida } from './env';

/** Chaves geradas pelo painel sempre levam o id da loja no primeiro segmento. */
export function chavePertenceALoja(chave: string, lojaId: string): boolean {
  return ['fotos/', 'videos/', 'lojas/'].some((prefixo) =>
    chave.startsWith(`${prefixo}${lojaId}/`),
  );
}

/**
 * Valida as chaves enviadas no formulário do produto antes de gravar/apagar.
 * Chaves antigas são planas (`fotos/<arquivo>`) e só valem se já estiverem no D1
 * da loja. URLs externas não são chaves do KV e seguem permitidas.
 */
export function chavesMidiaPermitidas(
  chaves: Array<string | null | undefined>,
  lojaId: string,
  conhecidas: ReadonlySet<string>,
): boolean {
  const legada = /^(fotos|videos)\/[^/]+$/;
  for (const chave of chaves) {
    if (!chave || !chaveValida(chave)) continue;
    if (chavePertenceALoja(chave, lojaId)) continue;
    if (legada.test(chave) && conhecidas.has(chave)) continue;
    return false;
  }
  return true;
}

/** Falha no D1: descarta a chave nova. Sucesso: descarta a antiga. */
export function chaveLogoParaApagar(
  gravouNoBanco: boolean,
  chaveNova: string,
  chaveAnterior: string | null,
): string | null {
  if (!gravouNoBanco) return chaveNova;
  return chaveAnterior?.startsWith('lojas/') ? chaveAnterior : null;
}

/**
 * Apaga do KV todos os caminhos de mídia informados.
 * Ignora URLs absolutas (conteúdo hospedado fora daqui) e chaves inválidas.
 */
export async function apagarObjetos(caminhos: Array<string | null | undefined>): Promise<void> {
  const kv = kvMidia();
  const unicos = new Set<string>();

  for (const c of caminhos) {
    if (!c) continue;
    // Só apagamos o que é nossa chave (fotos/... ou videos/...).
    if (!chaveValida(c)) continue;
    unicos.add(c);
  }

  await Promise.allSettled([...unicos].map((k) => kv.delete(k)));
}

/** Coleta os caminhos de objetos de uma mídia (thumb, full, full WebP e poster). */
export function caminhosDaMidia(m: {
  url?: string | null;
  full?: string | null;
  fullWebp?: string | null;
  poster?: string | null;
}): Array<string | null | undefined> {
  return [m.url, m.full, m.fullWebp, m.poster];
}
