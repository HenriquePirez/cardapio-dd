/**
 * Proteção contra força bruta para o login do admin.
 *
 * Guarda o contador no D1 (sobrevive a restarts do Worker).
 * Regra: 5 tentativas erradas em seguida -> bloqueia 10 minutos.
 */
import type { D1Like } from './db';

const MAX_TENTATIVAS = 5;
const JANELA_BLOQUEIO_SEG = 10 * 60; // 10 minutos

function agoraSeg(): number {
  return Math.floor(Date.now() / 1000);
}

function chave(email: string): string {
  return email.trim().toLowerCase();
}

export interface EstadoLogin {
  bloqueado: boolean;
  restantes: number; // tentativas restantes antes do bloqueio
  bloqueadoAte: number | null; // epoch seconds
}

export async function verificarBloqueio(db: D1Like, email: string): Promise<EstadoLogin> {
  const row = await db
    .prepare('SELECT tentativas, bloqueado_ate FROM login_tentativas WHERE email = ?')
    .bind(chave(email))
    .first<{ tentativas: number; bloqueado_ate: string | null }>();

  if (!row) return { bloqueado: false, restantes: MAX_TENTATIVAS, bloqueadoAte: null };

  if (row.bloqueado_ate) {
    // O D1 grava o ISO com 'Z'; Date.parse('...ZZ') devolve NaN e anulava o
    // bloqueio na requisição seguinte. Só acrescentamos 'Z' quando falta fuso.
    const bruto = row.bloqueado_ate;
    const comFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(bruto) ? bruto : `${bruto}Z`;
    const ate = Date.parse(comFuso) / 1000;
    if (Number.isFinite(ate) && ate > agoraSeg()) {
      return { bloqueado: true, restantes: 0, bloqueadoAte: ate };
    }
    // bloqueio expirou -> zera
    await db.prepare('DELETE FROM login_tentativas WHERE email = ?').bind(chave(email)).run();
    return { bloqueado: false, restantes: MAX_TENTATIVAS, bloqueadoAte: null };
  }

  const restantes = Math.max(0, MAX_TENTATIVAS - (row.tentativas ?? 0));
  return { bloqueado: false, restantes, bloqueadoAte: null };
}

/** Registra uma tentativa falha. Aplica bloqueio quando atinge o limite. */
export async function registrarTentativaFalha(db: D1Like, email: string): Promise<EstadoLogin> {
  const e = chave(email);
  const row = await db
    .prepare('SELECT tentativas FROM login_tentativas WHERE email = ?')
    .bind(e)
    .first<{ tentativas: number }>();

  const novas = (row?.tentativas ?? 0) + 1;

  if (novas >= MAX_TENTATIVAS) {
    const ate = new Date((agoraSeg() + JANELA_BLOQUEIO_SEG) * 1000).toISOString();
    await db
      .prepare(
        `INSERT INTO login_tentativas (email, tentativas, bloqueado_ate) VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET tentativas = excluded.tentativas,
           bloqueado_ate = excluded.bloqueado_ate`,
      )
      .bind(e, novas, ate)
      .run();
    return { bloqueado: true, restantes: 0, bloqueadoAte: Date.parse(ate) / 1000 };
  }

  await db
    .prepare(
      `INSERT INTO login_tentativas (email, tentativas, bloqueado_ate) VALUES (?, ?, NULL)
       ON CONFLICT(email) DO UPDATE SET tentativas = excluded.tentativas`,
    )
    .bind(e, novas)
    .run();

  return { bloqueado: false, restantes: Math.max(0, MAX_TENTATIVAS - novas), bloqueadoAte: null };
}

/** Limpa o contador após login bem-sucedido. */
export async function limparTentativas(db: D1Like, email: string): Promise<void> {
  await db.prepare('DELETE FROM login_tentativas WHERE email = ?').bind(chave(email)).run();
}

export const LIMITE_TENTATIVAS = MAX_TENTATIVAS;
