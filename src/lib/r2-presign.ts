/**
 * URLs pré-assinadas (presigned) para envio DIRETO de vídeo ao R2.
 *
 * Por quê: arquivos grandes não devem passar pelo Worker (limite de 100 MB
 * no corpo da requisição e limite de CPU). O navegador envia direto ao R2
 * com uma URL assinada que só permite PUT naquele objeto específico.
 *
 * Requer credenciais S3 do R2 como secrets (ver README):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *
 * Se não houver credenciais, `presignDisponivel()` retorna false e o
 * cliente usa o upload pelo Worker como alternativa.
 */
import { env } from 'cloudflare:workers';

interface Creds {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function credenciais(): Creds | null {
  const e = env as unknown as Record<string, string | undefined>;
  const accountId = e.R2_ACCOUNT_ID;
  const accessKeyId = e.R2_ACCESS_KEY_ID;
  const secretAccessKey = e.R2_SECRET_ACCESS_KEY;
  const bucket = e.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function presignDisponivel(): boolean {
  return credenciais() !== null;
}

const REGIAO = 'auto';
const ALGORITMO = 'AWS4-HMAC-SHA256';
const SERVICO = 's3';
const EXPIRA_SEG = 600; // 10 minutos

async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : (key as unknown as BufferSource),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function uriEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function dataAmz(d: Date): string {
  return d.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/**
 * Gera uma URL que permite PUT (upload) de um único objeto no R2.
 * @param chave caminho do objeto no bucket, ex: "videos/x-bacon.mp4"
 * @param contentType tipo MIME do arquivo que será enviado
 */
export async function gerarUrlPresigned(
  chave: string,
  contentType: string,
): Promise<string> {
  const c = credenciais();
  if (!c) throw new Error('Credenciais S3 do R2 ausentes (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME).');
  // O contentType é validado, mas não entra na assinatura (assina só o host),
  // permitindo que o navegador envie o arquivo com o MIME correto.
  if (contentType && !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType)) {
    throw new Error(`Content-Type inválido: ${contentType}`);
  }

  const host = `${c.accountId}.r2.cloudflarestorage.com`;
  const caminho = `/${c.bucket}/${chave.replace(/^\/+/, '')}`;

  const agora = new Date();
  const dateStamp = dataAmz(agora);
  const amzDate = dateStamp; // YYYYMMDDTHHMMSSZ
  const scope = `${dateStamp.slice(0, 8)}/${REGIAO}/${SERVICO}/aws4_request`;

  const params: Record<string, string> = {
    'X-Amz-Algorithm': ALGORITMO,
    'X-Amz-Credential': `${c.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(EXPIRA_SEG),
    'X-Amz-SignedHeaders': 'host',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
  };

  // Canonical query string precisa estar ordenado
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(params[k] ?? '')}`)
    .join('&');

  const canonicalRequest = [
    'PUT',
    uriEncode(caminho),
    canonicalQuery,
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hashReq = hex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest))),
  );

  const stringToSign = [ALGORITMO, amzDate, scope, hashReq].join('\n');

  const kDate = await hmac('AWS4' + c.secretAccessKey, dateStamp);
  const kRegion = await hmac(kDate, REGIAO);
  const kService = await hmac(kRegion, SERVICO);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = hex(await hmac(kSigning, stringToSign));

  return `https://${host}${caminho}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
