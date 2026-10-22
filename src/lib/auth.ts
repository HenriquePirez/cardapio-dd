/**
 * Autenticação do admin.
 *
 * Usa apenas Web Crypto (nativo do Cloudflare Workers) — sem bcrypt/argon2,
 * que não rodam bem no runtime workerd.
 *
 * Dois limites do runtime definem os parâmetros:
 *  1. `workerd` limita PBKDF2 a **100.000** iterações (teto rígido da API —
 *     acima disso lança `NotSupportedError: iteration counts above 100000`);
 *  2. Workers Free tem **10ms de CPU** por requisição. Medido em 2026-10
 *     (OpenSSL local, mesma ordem de grandeza do BoringSSL do workerd):
 *     100k ≈ 10.7ms (estoura), 60k ≈ 6.7ms, 40k ≈ 4.4ms.
 *
 * OWASP recomenda 600k para SHA-256 — inalcançável aqui. Compensamos com:
 *  - **pepper** (segredo `AUTH_PEPPER`, fora do banco): se o D1 vazar, o
 *    atacante não tem o material pra derivar;
 *  - senha mínima de 10 caracteres;
 *  - rate-limit de 5 tentativas (ver `login-guard.ts`).
 *
 * Formato armazenado:
 *   pbkdf2p$<iteracoes>$<salt_b64>$<hash_b64>   (com pepper)
 *   pbkdf2$<iteracoes>$<salt_b64>$<hash_b64>    (sem pepper — legado)
 *
 * A tag e a iteração ficam dentro do próprio valor, então dá pra subir os
 * parâmetros depois: o login verifica com o que está gravado e regrava com
 * os atuais (ver `login.ts`).
 */
const ALGO = 'PBKDF2';
const HASH = 'SHA-256';

/** Iterações usadas em hashes NOVOS. Ver nota de CPU no topo do arquivo. */
export const ITERACOES = 40_000;

const TAM_SALT = 16;
const TAM_HASH_ESPERADO = 32;

const TAG_COM_PEPPER = 'pbkdf2p';
const TAG_SEM_PEPPER = 'pbkdf2';

function b64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function deB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Material que entra no PBKDF2: senha + pepper separados por NUL.
 * O NUL não ocorre em senha normal, então não há ambiguidade entre
 * "senha A com pepper B" e outra combinação de valores.
 */
function material(senha: string, pepper?: string): string {
  return pepper ? senha + '\u0000' + pepper : senha;
}

async function derivar(mat: string, salt: Uint8Array, iteracoes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(mat),
    ALGO,
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: ALGO,
      salt: salt as unknown as BufferSource,
      iterations: iteracoes,
      hash: HASH,
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Gera o hash completo da senha (com salt aleatório). */
export async function hashSenha(senha: string, pepper?: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(TAM_SALT));
  const hash = await derivar(material(senha, pepper), salt, ITERACOES);
  return `${pepper ? TAG_COM_PEPPER : TAG_SEM_PEPPER}$${ITERACOES}$${b64(salt)}$${b64(hash)}`;
}

/**
 * Hash "carambola" com a MESMA dificuldade de um hash real, usado quando o
 * e-mail não existe — senão o tempo de resposta denunciaria a conta
 * (enumeração de usuários).
 */
export function hashDummy(pepper?: string): string {
  return `${pepper ? TAG_COM_PEPPER : TAG_SEM_PEPPER}$${ITERACOES}$${b64(
    new Uint8Array(TAM_SALT),
  )}$${b64(new Uint8Array(TAM_HASH_ESPERADO))}`;
}

/** Iterações registradas num hash, ou null se o formato não for reconhecido. */
export function lerIteracoes(armazenado: string): number | null {
  const partes = armazenado.split('$');
  if (partes.length !== 4) return null;
  const n = Number(partes[1]);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** true se o hash foi gravado com pepper. */
export function hashComPepper(armazenado: string): boolean {
  return armazenado.startsWith(`${TAG_COM_PEPPER}$`);
}

/**
 * Compara a senha em texto com o hash armazenado (comparação em tempo constante).
 *
 * Erro de configuração (ex.: pepper ausente) LANÇA em vez de devolver `false`
 * — senão apareceria como "senha incorreta" e esconderia o problema real.
 */
export async function conferirSenha(
  senha: string,
  armazenado: string,
  pepper?: string,
): Promise<boolean> {
  const partes = armazenado.split('$');
  if (partes.length !== 4) return false;

  const algo = partes[0] ?? '';
  if (algo !== TAG_COM_PEPPER && algo !== TAG_SEM_PEPPER) return false;

  const iteracoes = lerIteracoes(armazenado);
  if (iteracoes === null) return false;

  if (algo === TAG_COM_PEPPER && !pepper) {
    throw new Error(
      'Hash da conta exige o segredo AUTH_PEPPER, mas ele não está configurado. ' +
        'Sem ele o login é impossível — ver README, seção "Recuperação".',
    );
  }

  try {
    // O pepper só entra se o HASH diz que ele foi usado. Aplicar o segredo a um
    // hash gravado sem ele mudaria o material e tornaria a senha incorreta —
    // o caso exato de um hash legado que o login deve verificar e depois
    // reforçar (ver `login.ts`).
    const comPepper = algo === TAG_COM_PEPPER ? pepper : undefined;

    const salt = deB64(partes[2] ?? '');
    const esperado = deB64(partes[3] ?? '');
    if (esperado.length !== TAM_HASH_ESPERADO) return false;

    const obtido = await derivar(material(senha, comPepper), salt, iteracoes);
    if (obtido.length !== esperado.length) return false;

    // XOR: não revela em qual byte as strings divergem
    let dif = 0;
    for (let i = 0; i < obtido.length; i++) {
      dif |= (obtido[i] ?? 0) ^ (esperado[i] ?? 0);
    }
    return dif === 0;
  } catch (erro) {
    // Falha de decoding/derivação é problema real, não senha errada.
    // Loga pro `wrangler tail` mostrar — devolver false esconderia isso.
    console.error('[auth] falha ao verificar senha:', erro);
    throw erro;
  }
}

/** Exige uma senha razoável. Retorna a mensagem de erro ou null se válida. */
export function validarSenha(senha: string): string | null {
  if (senha.length < 10) {
    return 'A senha precisa de pelo menos 10 caracteres (o hash é limitado pelo Cloudflare, então a senha tem que compensar).';
  }
  return null;
}
