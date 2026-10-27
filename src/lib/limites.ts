/**
 * Limites de upload compartilhados entre cliente e servidor.
 * Módulo sem dependências: pode ser importado no script do formulário
 * (browser) e nas rotas (Worker).
 */
export const LIMITE_VIDEO_BYTES = 12 * 1024 * 1024;
export const LIMITE_FOTO_BYTES = 15 * 1024 * 1024;
