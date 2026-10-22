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

/** Coleta os caminhos de objetos de uma mídia (thumb, full e poster). */
export function caminhosDaMidia(m: {
  url?: string | null;
  full?: string | null;
  poster?: string | null;
}): Array<string | null | undefined> {
  return [m.url, m.full, m.poster];
}
