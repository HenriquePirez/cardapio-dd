/**
 * POST /admin/api/loja/salvar
 * Branding da loja ativa: nome, textos, duas cores livres e padrões.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import { salvarLoja } from '../../../../lib/db';
import { ACENTO_PADRAO, MARCA_PADRAO, normalizarHex } from '../../../../lib/cores';
import { mesmaOrigem } from '../../../../lib/http';
import { invalidarCardapio } from '../../../../lib/cache';
import { lerUsuario } from '../../../../lib/session';

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

  const nome = String(form.get('nome') ?? '').trim();
  if (!nome) return ctx.redirect('/admin/loja?erro=nome', 303);

  const tema = String(form.get('tema_padrao') ?? 'claro');
  const idioma = String(form.get('idioma_padrao') ?? 'pt');
  const ok = await salvarLoja(db(), usuario.id, loja.id, {
    nome: nome.slice(0, 80),
    slogan: String(form.get('slogan') ?? '').trim().slice(0, 120) || null,
    descricao: String(form.get('descricao') ?? '').trim().slice(0, 300) || null,
    corMarca: normalizarHex(String(form.get('cor_marca') ?? ''), MARCA_PADRAO),
    corAcento: normalizarHex(String(form.get('cor_acento') ?? ''), ACENTO_PADRAO),
    temaPadrao: tema === 'escuro' ? 'escuro' : 'claro',
    idiomaPadrao: idioma === 'en' ? 'en' : 'pt',
  });

  await invalidarCardapio(ctx.request, loja.slug);
  return ctx.redirect(ok ? '/admin/loja?ok=salvo' : '/admin/loja?erro=permissao', 303);
};
