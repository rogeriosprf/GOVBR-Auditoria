-- Migration: 0001_add_justificativa.sql
-- Adiciona coluna `justificativa` na tabela audit_sistema.casos_auditoria

BEGIN;

ALTER TABLE IF EXISTS audit_sistema.casos_auditoria
  ADD COLUMN IF NOT EXISTS justificativa text;

COMMIT;

-- Rollback (se necessário):
-- ALTER TABLE audit_sistema.casos_auditoria DROP COLUMN IF EXISTS justificativa;