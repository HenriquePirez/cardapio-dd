import { describe, expect, it } from 'vitest';

import type { D1Like } from './db';
import { LIMITE_TENTATIVAS, limparTentativas, registrarTentativaFalha, verificarBloqueio } from './login-guard';

type Linha = { tentativas: number; bloqueado_ate: string | null };

/**
 * D1 fake em memória. Modela o UPSERT atômico usado pelo guard:
 * `tentativas = tentativas + 1` resolvido no próprio statement (como no D1),
 * não em JavaScript.
 */
function dbFake() {
  const linhas = new Map<string, Linha>();
  const db: D1Like = {
    prepare(sql: string) {
      let params: unknown[] = [];
      const stmt = {
        bind(...values: unknown[]) {
          params = values;
          return stmt;
        },
        async first<T>() {
          const chave = String(params[0]);
          if (sql.startsWith('INSERT')) {
            // ON CONFLICT ... tentativas = tentativas + 1 ... RETURNING
            const limite = Number(params[1]);
            const ate = String(params[2]);
            const existente = linhas.get(chave);
            const row: Linha = existente ?? { tentativas: 0, bloqueado_ate: null };
            row.tentativas += 1;
            if (row.tentativas >= limite) row.bloqueado_ate = ate;
            linhas.set(chave, row);
            return { tentativas: row.tentativas, bloqueado_ate: row.bloqueado_ate } as T;
          }
          const row = linhas.get(chave);
          if (!row) return null;
          return row as T;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
        async run() {
          const chave = String(params[0]);
          if (sql.startsWith('DELETE')) {
            linhas.delete(chave);
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };
  return { db, linhas };
}

const FUTURO = 60 * 60; // 1h à frente, em segundos
const IP = '203.0.113.7';

function isoEm(segundos: number): string {
  return new Date((Math.floor(Date.now() / 1000) + segundos) * 1000).toISOString();
}

/** Chave interna do guard: e-mail normalizado + IP. */
function chaveDe(email = 'dona@exemplo.com', ip = IP): string {
  return `${email}|${ip}`;
}

describe('login-guard', () => {
  it('sem registro, libera com todas as tentativas restantes', async () => {
    const { db } = dbFake();
    const estado = await verificarBloqueio(db, 'dona@exemplo.com', IP);
    expect(estado).toEqual({ bloqueado: false, restantes: LIMITE_TENTATIVAS, bloqueadoAte: null });
  });

  it('conta tentativas falhas e bloqueia na quinta', async () => {
    const { db } = dbFake();
    for (let i = 1; i < LIMITE_TENTATIVAS; i++) {
      const e = await registrarTentativaFalha(db, 'dona@exemplo.com', IP);
      expect(e.bloqueado).toBe(false);
    }
    const quinta = await registrarTentativaFalha(db, 'dona@exemplo.com', IP);
    expect(quinta.bloqueado).toBe(true);
    expect(quinta.restantes).toBe(0);
  });

  it('incrementa de forma atômica (sem perder contagem em paralelo)', async () => {
    const { db, linhas } = dbFake();
    await Promise.all([
      registrarTentativaFalha(db, 'dona@exemplo.com', IP),
      registrarTentativaFalha(db, 'dona@exemplo.com', IP),
      registrarTentativaFalha(db, 'dona@exemplo.com', IP),
    ]);
    expect(linhas.get(chaveDe())?.tentativas).toBe(3);
  });

  it('bloqueio é por e-mail + IP: outro IP não herda o bloqueio', async () => {
    const { db } = dbFake();
    for (let i = 0; i < LIMITE_TENTATIVAS; i++) {
      await registrarTentativaFalha(db, 'dona@exemplo.com', IP);
    }
    expect((await verificarBloqueio(db, 'dona@exemplo.com', IP)).bloqueado).toBe(true);
    expect((await verificarBloqueio(db, 'dona@exemplo.com', '198.51.100.1')).bloqueado).toBe(false);
  });

  it('mantém o bloqueio entre requisições enquanto o prazo não vence', async () => {
    const { db, linhas } = dbFake();
    for (let i = 0; i < LIMITE_TENTATIVAS; i++) {
      await registrarTentativaFalha(db, 'dona@exemplo.com', IP);
    }
    expect(linhas.get(chaveDe())?.bloqueado_ate).toBeTruthy();

    // Nova requisição: o bloqueio gravado no D1 deve valer.
    const estado = await verificarBloqueio(db, 'dona@exemplo.com', IP);
    expect(estado.bloqueado).toBe(true);
    expect(estado.restantes).toBe(0);
  });

  it('libera e zera quando o bloqueio expirou', async () => {
    const { db, linhas } = dbFake();
    linhas.set(chaveDe(), { tentativas: LIMITE_TENTATIVAS, bloqueado_ate: isoEm(-FUTURO) });
    const estado = await verificarBloqueio(db, 'dona@exemplo.com', IP);
    expect(estado.bloqueado).toBe(false);
    expect(estado.restantes).toBe(LIMITE_TENTATIVAS);
    expect(linhas.has(chaveDe())).toBe(false);
  });

  it('normaliza o e-mail (caixa e espaços)', async () => {
    const { db, linhas } = dbFake();
    await registrarTentativaFalha(db, '  Dona@Exemplo.com ', IP);
    await registrarTentativaFalha(db, 'dona@exemplo.com', IP);
    expect(linhas.get(chaveDe())?.tentativas).toBe(2);
  });

  it('limparTentativas remove o registro após login bem-sucedido', async () => {
    const { db, linhas } = dbFake();
    await registrarTentativaFalha(db, 'dona@exemplo.com', IP);
    await limparTentativas(db, 'dona@exemplo.com', IP);
    expect(linhas.has(chaveDe())).toBe(false);
  });
});
