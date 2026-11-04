-- 0005: registro do aceite dos termos e da política de privacidade.
-- Guarda a data do último aceite e a versão do documento aceito.
ALTER TABLE usuarios ADD COLUMN aceite_em TEXT;
ALTER TABLE usuarios ADD COLUMN aceite_versao TEXT;
