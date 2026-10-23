/**
 * POST /admin/api/produtos/salvar
 * Cria ou atualiza um produto e sincroniza a galeria de mídias.
 *
 * A galeria chega como JSON (galeria_json). Mídias com id numérico já
 * existem no banco; id "novo-*" significa que a imagem/vídeo foi enviada
 * nesta sessão e o registro ainda precisa ser criado.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import {
  salvarProduto,
  obterProduto,
  listarMidiasPorProdutos,
  adicionarMidia,
  atualizarMidia,
  excluirMidia,
} from '../../../../lib/db';
import { apagarObjetos, caminhosDaMidia } from '../../../../lib/midia';
import { invalidarCardapio } from '../../../../lib/cache';

const SLUG = /^[a-z0-9-]+$/;

interface ItemGaleria {
  id: number | string;
  tipo: 'imagem' | 'video';
  url: string;
  full?: string;
  poster?: string;
  alt?: string;
  ordem?: number;
}

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

function mesmaOrigem(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const idNovo = String(form.get('id') ?? '').trim().toLowerCase();
  const idOriginal = String(form.get('id') ?? '').trim().toLowerCase();
  const nome = String(form.get('nome') ?? '').trim();
  const precoRaw = String(form.get('preco') ?? '').replace(',', '.');
  const preco = Number(precoRaw);
  const categoria = String(form.get('categoria') ?? '').trim();
  const descricao = String(form.get('descricao') ?? '').trim();
  const comprarUrl = String(form.get('comprar_url') ?? '').trim();
  const ordem = Number(form.get('ordem') ?? 0);
  const destaque = form.get('destaque') ? 1 : 0;
  const disponivel = form.get('disponivel') ? 1 : 0;

  const voltarEdicao = `/admin/produtos/${idOriginal}`;

  if (!SLUG.test(idNovo)) return voltar(voltarEdicao + '?msg=erro-slug');
  if (!nome) return voltar(voltarEdicao + '?msg=erro-nome');
  if (!Number.isFinite(preco) || preco < 0) return voltar(voltarEdicao + '?msg=erro-preco');
  if (!categoria) return voltar(voltarEdicao + '?msg=erro-categoria');
  if (!/^https?:\/\//i.test(comprarUrl)) return voltar(voltarEdicao + '?msg=erro-link');

  const d1 = db();

  // Valida categoria
  const cat = await d1
    .prepare('SELECT id FROM categorias WHERE id = ?')
    .bind(categoria)
    .first();
  if (!cat) return voltar(voltarEdicao + '?msg=erro-categoria');

  // Slug duplicado em produto diferente?
  const existente = await obterProduto(d1, idNovo);
  if (existente && existente.id !== idOriginal) {
    return voltar(voltarEdicao + '?msg=erro-slug-duplicado');
  }

  await salvarProduto(d1, {
    id: idNovo,
    nome,
    preco,
    categoria_id: categoria,
    descricao: descricao || null,
    destaque,
    ordem: Number.isFinite(ordem) ? ordem : 0,
    comprar_url: comprarUrl,
    disponivel,
  });

  // ---- Sincroniza a galeria -------------------------------------------
  let galeria: ItemGaleria[] = [];
  try {
    const bruto = String(form.get('galeria_json') ?? '[]');
    galeria = JSON.parse(bruto) as ItemGaleria[];
    if (!Array.isArray(galeria)) galeria = [];
  } catch {
    galeria = [];
  }

  const atuais = await listarMidiasPorProdutos(d1, [idNovo]);
  const idsAtuais = new Set(atuais.map((m) => m.id));

  // 1) Itens que permanecem (id numérico): atualiza ordem/conteúdo
  const mantidos = new Set<number>();
  let ordemContador = 0;
  for (const item of galeria) {
    const numId = Number(item.id);
    const jaExiste = Number.isFinite(numId) && idsAtuais.has(numId);
    if (jaExiste) {
      mantidos.add(numId);
      const registro = atuais.find((m) => m.id === numId)!;
      await atualizarMidia(d1, numId, {
        url: item.url || registro.url,
        full: (item.full ?? registro.full) || null,
        poster: (item.poster ?? registro.poster) || null,
        alt: item.alt ?? registro.alt,
        ordem: ordemContador++,
      });
    } else if (item.url) {
      // 2) Item novo (já enviado nesta sessão): cria o registro
      await adicionarMidia(d1, {
        produto_id: idNovo,
        tipo: item.tipo === 'video' ? 'video' : 'imagem',
        url: item.url,
        full: item.full || null,
        poster: item.poster || null,
        alt: item.alt || null,
        ordem: ordemContador++,
      });
    }
  }

  // 3) Remove da galeria os que saíram
  const removidos: typeof atuais = [];
  for (const m of atuais) {
    if (!mantidos.has(m.id)) {
      await excluirMidia(d1, m.id);
      removidos.push(m);
    }
  }

  // Apaga os objetos no KV (o plano free só tem 1 GB — não pode sobrar órfão).
  if (removidos.length) {
    await apagarObjetos(removidos.flatMap(caminhosDaMidia));
  }

  // O cardápio público ("/") é cacheado na edge: purga para a edição aparecer na hora.
  await invalidarCardapio(ctx.request);

  return voltar('/admin/produtos?msg=ok');
};
