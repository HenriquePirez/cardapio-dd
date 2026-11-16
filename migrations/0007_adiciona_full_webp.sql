-- 0007: URL da versão WebP do full de cada mídia de imagem.
-- Entrega automática via <picture> no front: navegadores que suportam WebP
-- recebem este arquivo; os demais ficam no `full` (JPEG/PNG).
ALTER TABLE produto_midia ADD COLUMN full_webp TEXT;
