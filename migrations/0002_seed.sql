-- Seed com os dados de exemplo que já existiam no projeto.
-- Aplicar DEPOIS da migration 0001:
--   npx wrangler d1 execute cardapio-dd --file=./migrations/0002_seed.sql
-- Use --local para testar sem tocar no banco de produção.

-- Categorias ------------------------------------------------
INSERT OR REPLACE INTO categorias (id, nome, ordem, icone, descricao) VALUES
  ('lanches', 'Lanches', 1, '🍔', 'Hambúrgueres artesanais e sanduíches'),
  ('bebidas', 'Bebidas', 2, '🥤', 'Refrigerantes, sucos e sobremesas geladas'),
  ('porcoes', 'Porções', 3, '🍟', 'Batatas, frango e petiscos para compartilhar');

-- Produtos --------------------------------------------------
INSERT OR REPLACE INTO produtos
  (id, nome, preco, categoria_id, descricao, destaque, ordem, comprar_url, disponivel)
VALUES
  ('x-burger-classico', 'X-Burger Clássico', 28.9, 'lanches',
   'Pão brioche, blend 180g, queijo prato, alface, tomate e nosso molho especial.',
   1, 1, 'https://app.exemplo.com/comprar?produto=x-burger-classico', 1),
  ('x-bacon-duplo', 'X-Bacon Duplo', 36.9, 'lanches',
   'Dois blends de 180g, cheddar cremoso, bacon crocante e cebola caramelizada.',
   1, 2, 'https://app.exemplo.com/comprar?produto=x-bacon-duplo', 1),
  ('milkshake-ovomaltine', 'Milkshake Ovomaltine', 19.9, 'bebidas',
   'Milkshake cremoso de Ovomaltine com chantilly e raspas.',
   1, 1, 'https://app.exemplo.com/comprar?produto=milkshake-ovomaltine', 1),
  ('batata-frita-grande', 'Batata Frita Grande', 22.9, 'porcoes',
   'Batata rústica crocante com sal e alecrim. Serve 2 pessoas.',
   0, 1, 'https://app.exemplo.com/comprar?produto=batata-frita-grande', 1);

-- Mídia -----------------------------------------------------
-- Os arquivos em /public/media são PLACEHOLDERS de dev.
-- Em produção aponte para os arquivos no R2 (via MEDIA_PUBLIC_BASE).
DELETE FROM produto_midia;

INSERT INTO produto_midia (produto_id, tipo, url, full, poster, alt, ordem) VALUES
  ('x-burger-classico', 'imagem', 'x-burger-1.webp', 'x-burger-1-full.jpg', NULL, 'X-Burger Clássico de frente', 1),
  ('x-burger-classico', 'imagem', 'x-burger-2.webp', 'x-burger-2-full.jpg', NULL, 'X-Burger Clássico cortado ao meio', 2),
  ('x-burger-classico', 'imagem', 'x-burger-3.webp', 'x-burger-3-full.jpg', NULL, 'X-Burger Clássico com batata', 3),
  ('x-burger-classico', 'video',  'x-burger.mp4',    NULL,               'x-burger-poster.webp', 'Vídeo do X-Burger Clássico', 4),
  ('x-bacon-duplo', 'imagem', 'x-bacon-1.webp', 'x-bacon-1-full.jpg', NULL, 'X-Bacon Duplo', 1),
  ('x-bacon-duplo', 'imagem', 'x-bacon-2.webp', 'x-bacon-2-full.jpg', NULL, 'X-Bacon Duplo visto de cima', 2),
  ('x-bacon-duplo', 'video',  'x-bacon.mp4',    NULL,                'x-bacon-poster.webp', 'Vídeo do X-Bacon Duplo', 3),
  ('milkshake-ovomaltine', 'imagem', 'milkshake-1.webp', 'milkshake-1-full.jpg', NULL, 'Milkshake Ovomaltine', 1),
  ('milkshake-ovomaltine', 'imagem', 'milkshake-2.webp', 'milkshake-2-full.jpg', NULL, 'Milkshake Ovomaltine de perto', 2),
  ('batata-frita-grande', 'imagem', 'batata-1.webp', 'batata-1-full.jpg', NULL, 'Porção de batata frita', 1),
  ('batata-frita-grande', 'imagem', 'batata-2.webp', 'batata-2-full.jpg', NULL, 'Batata frita de perto', 2);
