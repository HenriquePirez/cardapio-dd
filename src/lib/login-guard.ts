/**
 * Proteção contra força bruta para o login do admin.
 *
 * Guarda o contador no D1 (sobrevive a restarts do Worker).
 * Regra: 5 tentativas erradas em seguida -> bloqueia 10 minutos.
 *
 * A chave é e-mail + IP de origem: bloquear só por e-mail permitiria que um
 * anônimo trancasse a conta do dono com 5 palpites. O incremento é feito no
 * próprio UPSERT (`tentativas = tentativas + 1`), atômico no D1 — um burst de
 * requisições paralelas não escapa mais do limite.
 */
import type { D1Like } from './db';

const MAX_TENTATIVAS = 5;
const JANELA_BLOQUEIO_SEG = 10 * 60; // 10 minutos

function agoraSeg(): number {
  return Math.floor(Date.now() / 1000);
}

function chave(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}|${ip}`;
}

export interface EstadoLogin {
  bloqueado: boolean;
  restantes: number; // tentativas restantes antes do bloqueio
  bloqueadoAte: number | null; // epoch seconds
}

/** Converte o ISO gravado no D1 em epoch seconds (aceita com e sem fuso). */
function epochDe(valor: string): number {
  // O D1 grava o ISO com 'Z'; Date.parse('...ZZ') devolve NaN e anulava o
  // bloqueio na requisição seguinte. Só acrescentamos 'Z' quando falta fuso.
  const comFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor) ? valor : `${valor}Z`;
  return Date.parse(comFuso) / 1000;
}

export async function verificarBloqueio(
  db: D1Like,
  email: string,
  ip = 'local',
): Promise<EstadoLogin> {
  const k = chave(email, ip);
  const row = await db
    .prepare('SELECT tentativas, bloqueado_ate FROM login_tentativas WHERE email = ?')
    .bind(k)
    .first<{ tentativas: number; bloqueado_ate: string | null }>();

  if (!row) return { bloqueado: false, restantes: MAX_TENTATIVAS, bloqueadoAte: null };

  if (row.bloqueado_ate) {
    const ate = epochDe(row.bloqueado_ate);
    if (Number.isFinite(ate) && ate > agoraSeg()) {
      return { bloqueado: true, restantes: 0, bloqueadoAte: ate };
    }
    // bloqueio expirou -> zera
    await db.prepare('DELETE FROM login_tentativas WHERE email = ?').bind(k).run();
    return { bloqueado: false, restantes: MAX_TENTATIVAS, bloqueadoAte: null };
  }

  const restantes = Math.max(0, MAX_TENTATIVAS - (row.tentativas ?? 0));
  return { bloqueado: false, restantes, bloqueadoAte: null };
}

/** Registra uma tentativa falha. Aplica bloqueio quando atinge o limite. */
export async function registrarTentativaFalha(
  db: D1Like,
  email: string,
  ip = 'local',
): Promise<EstadoLogin> {
  const k = chave(email, ip);
  const ate = new Date((agoraSeg() + JANELA_BLOQUEIO_SEG) * 1000).toISOString();

  const row = await db
    .prepare(
      `INSERT INTO login_tentativas (email, tentativas, bloqueado_ate) VALUES (?, 1, NULL)
       ON CONFLICT(email) DO UPDATE SET
         tentativas = tentativas + 1,
         bloqueado_ate = CASE
           WHEN tentativas + 1 >= ? THEN ?
           ELSE bloqueado_ate
         END
       RETURNING tentativas, bloqueado_ate`,
    )
    .bind(k, MAX_TENTATIVAS, ate)
    .first<{ tentativas: number; bloqueado_ate: string | null }>();

  const tentativas = row?.tentativas ?? MAX_TENTATIVAS;
  if (tentativas >= MAX_TENTATIVAS) {
    const bloqueadoAte = row?.bloqueado_ate ? epochDe(row.bloqueado_ate) : Date.parse(ate) / 1000;
    return { bloqueado: true, restantes: 0, bloqueadoAte };
  }
  return { bloqueado: false, restantes: Math.max(0, MAX_TENTATIVAS - tentativas), bloqueadoAte: null };
}

/** Limpa o contador após login bem-sucedido. */
export async function limparTentativas(db: D1Like, email: string, ip = 'local'): Promise<void> {
  await db.prepare('DELETE FROM login_tentativas WHERE email = ?').bind(chave(email, ip)).run();
}

export const LIMITE_TENTATIVAS = MAX_TENTATIVAS;
