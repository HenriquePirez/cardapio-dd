import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Site full-stack no Cloudflare Workers.
// - "/"           -> cardápio público (SSR + cache na edge)
// - "/admin/*"    -> gerenciamento (login + CRUD), protegido por middleware
export default defineConfig({
  // Troque pelo domínio real no deploy (ex: https://cardapio.seudominio.com)
  site: 'https://cardapio.exemplo.com',
  output: 'server',
  adapter: cloudflare({
    // Otimização de imagem acontece no build (Sharp). As imagens do cardápio
    // vêm do R2 como arquivo pronto, então usamos passthrough no runtime.
    imageService: 'compile',
  }),
  server: {
    host: true, // acessa de outros aparelhos na rede (teste no celular)
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
