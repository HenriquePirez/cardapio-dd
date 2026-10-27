/**
 * Leitura da galeria serializada pelo formulário de produto.
 *
 * O campo `galeria_json` chega como JSON. Campo ausente ou inválido NÃO pode
 * virar lista vazia: o salvar trataria isso como "usuário removeu tudo" e
 * apagaria as mídias do D1 e do KV.
 */
export interface ItemGaleriaBruto {
  id: number | string;
  tipo: 'imagem' | 'video';
  url: string;
  full?: string | undefined;
  poster?: string | undefined;
  alt?: string | undefined;
  ordem?: number | undefined;
}

/** Retorna os itens ou `null` quando o valor é ausente/malformado. */
export function lerGaleriaJson(bruto: FormDataEntryValue | null | undefined): ItemGaleriaBruto[] | null {
  if (typeof bruto !== 'string' || !bruto.trim()) return null;

  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return null;
  }
  if (!Array.isArray(dados)) return null;

  const itens: ItemGaleriaBruto[] = [];
  for (const item of dados) {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'number' && typeof o.id !== 'string') return null;
    if (o.tipo !== 'imagem' && o.tipo !== 'video') return null;
    if (typeof o.url !== 'string') return null;

    itens.push({
      id: o.id,
      tipo: o.tipo,
      url: o.url,
      full: typeof o.full === 'string' ? o.full : undefined,
      poster: typeof o.poster === 'string' ? o.poster : undefined,
      alt: typeof o.alt === 'string' ? o.alt : undefined,
      ordem: typeof o.ordem === 'number' ? o.ordem : undefined,
    });
  }
  return itens;
}
