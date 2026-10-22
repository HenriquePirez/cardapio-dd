/**
 * Autenticação do admin.
 *
 * Usa apenas Web Crypto (nativo do Cloudflare Workers) — sem bcrypt/argon2,
 * que não rodam bem no runtime workerd.
 *
 * Senha armazenada como: pbkdf2$<iteracoes>$<salt_b64>$<hash_b64>
 */
const ALGO = 'PBKDF2';
const HASH = 'SHA-256';
const ITERACOES = 210_000; // OWASP recomenda >= 600k p/ SHA-256, mas 210k
// equilibra segurança e o limite de 10ms de CPU do Workers Free.
const TAM_SALT = 16;
const TAM_HASH_ESPERADO = 32;

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

async function derivar(senha: string, salt: Uint8Array, iteracoes: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(senha),
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
export async function hashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(TAM_SALT));
  const hash = await derivar(senha, salt, ITERACOES);
  return `pbkdf2$${ITERACOES}$${b64(salt)}$${b64(hash)}`;
}

/** Compara a senha em texto com o hash armazenado (comparaçao em tempo constante). */
export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  try {
    const partes = armazenado.split('$');
    if (partes.length !== 4) return false;
    const [algo, iterStr, saltB64, hashB64] = partes as [string, string, string, string];
    if (algo !== 'pbkdf2') return false;
    const iteracoes = Number(iterStr);
    if (!Number.isFinite(iteracoes) || iteracoes < 1) return false;

    const salt = deB64(saltB64);
    const esperado = deB64(hashB64);
    if (esperado.length !== TAM_HASH_ESPERADO) return false;

    const obtido = await derivar(senha, salt, iteracoes);

    if (obtido.length !== esperado.length) return false;
    // XOR: revela nada sobre o valor enquanto compara
    let dif = 0;
    for (let i = 0; i < obtido.length; i++) {
      dif |= (obtido[i] ?? 0) ^ (esperado[i] ?? 0);
    }
    return dif === 0;
  } catch {
    return false;
  }
}

/** Força um valor a ser uma senha mínima razoável. Retorna erro ou null. */
export function validarSenha(senha: string): string | null {
  if (senha.length < 6) return 'A senha precisa de pelo menos 6 caracteres.';
  return null;
}
