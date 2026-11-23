-- 0008: papel de administrador do sistema e ativo/inativo por usuário.
-- O código já consulta usuarios.master e usuarios.ativo; sem estas colunas
-- o middleware e o painel master quebram em bancos criados só pelas migrations.
ALTER TABLE usuarios ADD COLUMN master INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1;

-- Instalações existentes tinham uma conta única: ela vira a master.
UPDATE usuarios
   SET master = 1
 WHERE id = (SELECT id FROM usuarios ORDER BY criado_em ASC LIMIT 1);
