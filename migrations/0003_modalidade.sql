-- Modalidade de atendimento do produto.
-- 'local'    -> pedido feito no totem do estabelecimento
-- 'retirada' -> pedido pelo link do app, retirado no balcão
-- 'ambos'    -> o cliente escolhe ao tocar em "Comprar"
ALTER TABLE produtos ADD COLUMN modalidade TEXT NOT NULL DEFAULT 'ambos';
