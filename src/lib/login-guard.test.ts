import { describe, expect, it } from 'vitest';

import type { D1Like } from './db';
import { LIMITE_TENTATIVAS, limparTentativas, registrarTentativaFalha, verificarBloqueio } from './login-guard';

type Linha = { tentativas: number; bloqueado_ate: string | null };

/** D1 fake em memória: atende só os prepared statements usados por login-guard. */
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
          const row = linhas.get(String(params[0]));
          if (!row) return null;
          if (sql.includes('bloqueado_ate')) return row as T;
          return { tentativas: row.tentativas } as T;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
        async run() {
          const email = String(params[0]);
          if (sql.startsWith('DELETE')) {
            linhas.delete(email);
          } else if (sql.startsWith('INSERT')) {
            linhas.set(email, {
              tentativas: Number(params[1]),
              bloqueado_ate: (params[2] as string | null) ?? null,
            });
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

function isoEm(segundos: number): string {
  return new Date((Math.floor(Date.now() / 1000) + segundos) * 1000).toISOString();
}

describe('login-guard', () => {
  it('sem registro, libera com todas as tentativas restantes', async () => {
    const { db } = dbFake();
    const estado = await verificarBloqueio(db, 'dona@exemplo.com');
    expect(estado).toEqual({ bloqueado: false, restantes: LIMITE_TENTATIVAS, bloqueadoAte: null });
  });

  it('conta tentativas falhas e bloqueia na quinta', async () => {
    const { db } = dbFake();
    for (let i = 1; i < LIMITE_TENTATIVAS; i++) {
      const e = await registrarTentativaFalha(db, 'dona@exemplo.com');
      expect(e.bloqueado).toBe(false);
    }
    const quinta = await registrarTentativaFalha(db, 'dona@exemplo.com');
    expect(quinta.bloqueado).toBe(true);
    expect(quinta.restantes).toBe(0);
  });

  it('mantém o bloqueio entre requisições enquanto o prazo não vence', async () => {
    const { db, linhas } = dbFake();
    for (let i = 0; i < LIMITE_TENTATIVAS; i++) {
      await registrarTentativaFalha(db, 'dona@exemplo.com');
    }
    expect(linhas.get('dona@exemplo.com')?.bloqueado_ate).toBeTruthy();

    // Nova requisição: o bloqueio gravado no D1 deve valer.
    const estado = await verificarBloqueio(db, 'dona@exemplo.com');
    expect(estado.bloqueado).toBe(true);
    expect(estado.restantes).toBe(0);
  });

  it('libera e zera quando o bloqueio expirou', async () => {
    const { db, linhas } = dbFake();
    linhas.set('dona@exemplo.com', { tentativas: LIMITE_TENTATIVAS, bloqueado_ate: isoEm(-FUTURO) });
    const estado = await verificarBloqueio(db, 'dona@exemplo.com');
    expect(estado.bloqueado).toBe(false);
    expect(estado.restantes).toBe(LIMITE_TENTATIVAS);
    expect(linhas.has('dona@exemplo.com')).toBe(false);
  });

  it('normaliza o e-mail (caixa e espaços)', async () => {
    const { db, linhas } = dbFake();
    await registrarTentativaFalha(db, '  Dona@Exemplo.com ');
    await registrarTentativaFalha(db, 'dona@exemplo.com');
    expect(linhas.get('dona@exemplo.com')?.tentativas).toBe(2);
  });

  it('limparTentativas remove o registro após login bem-sucedido', async () => {
    const { db, linhas } = dbFake();
    await registrarTentativaFalha(db, 'dona@exemplo.com');
    await limparTentativas(db, 'dona@exemplo.com');
    expect(linhas.has('dona@exemplo.com')).toBe(false);
  });
});
