/**
 * POST /admin/api/loja/logo
 * Envia/substitui a logo da loja ativa no KV e remove a anterior.
 * O arquivo é gravado como veio (o painel aceita até 2 MB).
 */
import type { APIRoute } from 'astro';
import { db, kvMidia } from '../../../../lib/env';
import { salvarLogoLoja } from '../../../../lib/db';
import { lerUsuario } from '../../../../lib/session';
import { mesmaOrigem } from '../../../../lib/http';
import { invalidarCardapio } from '../../../../lib/cache';

const LIMITE_LOGO = 2 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const usuario = await lerUsuario(ctx);
  const loja = ctx.locals.loja;
  if (!usuario || !loja) return ctx.redirect('/admin/login', 303);

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const kv = kvMidia();
  const d1 = db();
  const anterior = loja.logo_chave;

  async function apagarAnterior(): Promise<void> {
    if (!anterior?.startsWith('lojas/')) return;
    try {
      await kv.delete(anterior);
    } catch {
      /* objeto órfão é inofensivo */
    }
  }

  if (String(form.get('remover') ?? '') === '1') {
    await salvarLogoLoja(d1, usuario.id, loja.id, null);
    await apagarAnterior();
    await invalidarCardapio(ctx.request, loja.slug);
    return ctx.redirect('/admin/loja?ok=logo', 303);
  }

  const arquivo = form.get('logo');
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return ctx.redirect('/admin/loja?erro=arquivo', 303);
  }
  if (arquivo.size > LIMITE_LOGO) return ctx.redirect('/admin/loja?erro=tamanho', 303);

  const ext = EXT[arquivo.type];
  if (!ext) return ctx.redirect('/admin/loja?erro=formato', 303);

  const chave = `lojas/${loja.id}/logo-${Date.now()}.${ext}`;
  await kv.put(chave, await arquivo.arrayBuffer(), {
    httpMetadata: { contentType: arquivo.type },
  });
  await salvarLogoLoja(d1, usuario.id, loja.id, chave);
  await apagarAnterior();
  await invalidarCardapio(ctx.request, loja.slug);

  return ctx.redirect('/admin/loja?ok=logo', 303);
};
