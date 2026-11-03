/**
 * Cores por loja: valida o hexadecimal e deriva os tons que a interface usa
 * (hover, texto legível, título no tema escuro) a partir de duas cores livres.
 */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Aceita apenas hexadecimal; devolve o padrão quando vier algo inválido. */
export function normalizarHex(valor: string | null | undefined, padrao: string): string {
  const v = (valor ?? '').trim();
  if (!HEX.test(v)) return padrao;
  return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase() : v.toLowerCase();
}

function canais(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function paraHex(r: number, g: number, b: number): string {
  const p = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

/** Mistura `peso` da cor `alvo` na cor `base` (0..1). */
export function misturar(base: string, alvo: string, peso: number): string {
  const [r1, g1, b1] = canais(base);
  const [r2, g2, b2] = canais(alvo);
  return paraHex(r1 + (r2 - r1) * peso, g1 + (g2 - g1) * peso, b1 + (b2 - b1) * peso);
}

export function escurecer(hex: string, peso: number): string {
  return misturar(hex, '#000000', peso);
}

export function clarear(hex: string, peso: number): string {
  return misturar(hex, '#ffffff', peso);
}

/** Luminância relativa (WCAG 2.x). */
export function luminancia(hex: string): number {
  const [r, g, b] = canais(hex).map((n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  const claro = Math.max(l1, l2);
  const escuro = Math.min(l1, l2);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Escurece em passos até atingir o contraste pedido contra o fundo. */
function legivelSobre(hex: string, fundo: string, minimo = 4.5): string {
  let atual = hex;
  for (let passo = 1; passo <= 20 && contraste(atual, fundo) < minimo; passo++) {
    atual = escurecer(hex, passo * 0.04);
  }
  return atual;
}

/** Clareia em passos até atingir o contraste pedido contra o fundo. */
function legivelSobreEscuro(hex: string, fundo: string, minimo = 4.5): string {
  let atual = hex;
  for (let passo = 1; passo <= 20 && contraste(atual, fundo) < minimo; passo++) {
    atual = clarear(hex, passo * 0.04);
  }
  return atual;
}

export interface PaletaLoja {
  marca: string;
  marcaEscura: string;
  acento: string;
  acentoEscuro: string;
  /** Acento com contraste AA sobre branco (texto e botão). */
  acentoAcessivel: string;
  acentoAcessivelHover: string;
  /** Título de seção no tema escuro, legível sobre #11150f. */
  tituloEscuro: string;
  /** Preço no tema escuro. */
  precoEscuro: string;
}

export const MARCA_PADRAO = '#14532d';
export const ACENTO_PADRAO = '#f97316';

export function paletaLoja(marcaBruta: string, acentoBruto: string): PaletaLoja {
  const marca = normalizarHex(marcaBruta, MARCA_PADRAO);
  const acento = normalizarHex(acentoBruto, ACENTO_PADRAO);
  const acentoAcessivel = legivelSobre(acento, '#ffffff');

  return {
    marca,
    marcaEscura: escurecer(marca, 0.18),
    acento,
    acentoEscuro: escurecer(acento, 0.15),
    acentoAcessivel,
    acentoAcessivelHover: escurecer(acentoAcessivel, 0.12),
    tituloEscuro: legivelSobreEscuro(marca, '#11150f'),
    precoEscuro: legivelSobreEscuro(acento, '#11150f', 4.5),
  };
}

/** CSS das variáveis da loja, aplicado no <head> antes da pintura. */
export function cssPaleta(p: PaletaLoja): string {
  return (
    `:root{--verde:${p.marca};--verde-escuro:${p.marcaEscura};` +
    `--laranja:${p.acento};--laranja-escuro:${p.acentoEscuro};` +
    `--laranja-aa:${p.acentoAcessivel};--laranja-aa-hover:${p.acentoAcessivelHover};}` +
    `:root[data-tema='escuro']{--cor-titulo:${p.tituloEscuro};--cor-preco:${p.precoEscuro};}`
  );
}
