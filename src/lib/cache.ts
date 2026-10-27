/**
 * Invalidação do cache da edge para o cardápio público ("/").
 *
 * O middleware (src/middleware.ts) guarda a página "/" na Cache API por
 * CACHE_SEGUNDOS para caber no limite de 10 ms de CPU do Workers Free.
 * Sem purgar aqui, uma edição feita no painel demoraria até 30s para
 * aparecer — e no dev local (miniflare) o `cache.match()` não respeita o
 * TTL, então a mudança só apareceria reiniciando o `wrangler dev`.
 *
 * A chave precisa bater com a usada no middleware: a URL absoluta de "/",
 * sem query (ver `chaveCardapio`).
 */
export function chaveCardapio(url: string | URL): Request {
  return new Request(new URL('/', url).toString(), { method: 'GET' });
}

export async function invalidarCardapio(request: Request): Promise<void> {
  try {
    // O tipo DOM de `CacheStorage` não expõe `.default`, por isso o cast.
    const cache = (caches as unknown as { default?: Cache }).default;
    if (!cache) return;
    await cache.delete(chaveCardapio(request.url));
  } catch {
    /* cache é otimização, não crítico — nunca derruba a escrita */
  }
}
