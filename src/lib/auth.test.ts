import { describe, expect, it } from 'vitest';

import { conferirSenha, hashDummy, hashSenha, hashComPepper, lerIteracoes, validarSenha } from './auth';

describe('validarSenha', () => {
  it('recusa senha com menos de 10 caracteres', () => {
    expect(validarSenha('curta1234')).not.toBeNull();
  });

  it('aceita senha com exatamente 10 caracteres', () => {
    expect(validarSenha('1234567890')).toBeNull();
  });
});

describe('lerIteracoes', () => {
  it('lê as iterações de um hash bem formado', () => {
    expect(lerIteracoes('pbkdf2p$40000$c2FsdA==$aGFzaA==')).toBe(40000);
  });

  it('devolve null quando o campo de iterações não é número válido', () => {
    expect(lerIteracoes('pbkdf2p$abc$c$d')).toBeNull();
    expect(lerIteracoes('pbkdf2p$40000$so-três')).toBeNull();
    expect(lerIteracoes('pbkdf2p$0$c2FsdA==$aGFzaA==')).toBeNull();
    // A tag do algoritmo NÃO é checada aqui (só o formato); conferirSenha valida a tag.
    expect(lerIteracoes('qualquercoisa$10$a$b')).toBe(10);
  });
});

describe('hashComPepper', () => {
  it('detecta a tag correta', () => {
    expect(hashComPepper('pbkdf2p$40000$a$b')).toBe(true);
    expect(hashComPepper('pbkdf2$40000$a$b')).toBe(false);
  });
});

describe('hashDummy', () => {
  it('gera formato válido e com a tag esperada', () => {
    expect(hashComPepper(hashDummy('pepper'))).toBe(true);
    expect(hashComPepper(hashDummy())).toBe(false);
  });
});

describe('hashSenha + conferirSenha', () => {
  it('verifica a senha correta e rejeita a errada (com pepper)', async () => {
    const hash = await hashSenha('senha super segura', 'pepper-teste');
    expect(await conferirSenha('senha super segura', hash, 'pepper-teste')).toBe(true);
    expect(await conferirSenha('senha errada!!', hash, 'pepper-teste')).toBe(false);
  });

  it('hash sem pepper verifica sem passar pepper', async () => {
    const hash = await hashSenha('senha sem pepper');
    expect(hash.startsWith('pbkdf2$')).toBe(true);
    expect(await conferirSenha('senha sem pepper', hash)).toBe(true);
  });

  it('hash legado (sem pepper) confere mesmo com pepper passado — por design', async () => {
    // O pepper só entra se a TAG do hash diz que ele foi usado; hash legado
    // verifica e é reforçado no login (ver login.ts).
    const hash = await hashSenha('senha legada');
    expect(await conferirSenha('senha legada', hash, 'pepper-novo')).toBe(true);
  });

  it('lança configuração quando o hash exige pepper e ele falta', async () => {
    const hash = await hashSenha('senha super segura', 'pepper-teste');
    await expect(conferirSenha('senha super segura', hash)).rejects.toThrow(/AUTH_PEPPER/);
  });

  it('devolve false para hash malformado', async () => {
    expect(await conferirSenha('qualquer', 'não-é-hash$b$c$d')).toBe(false);
  });
});
