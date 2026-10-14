BEGIN;
-- Plano único do MVP: o limite não pode ser reduzido sem migração específica.
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_limite_plano_mvp"
CHECK ("limite_usuarios_ativos" = 2);

CREATE OR REPLACE FUNCTION "verificar_limite_usuarios"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE limite integer;
BEGIN
  IF NEW."ativo" THEN
    -- Atualização cria nova versão MVCC: snapshots antigos falham com 40001
    -- em REPEATABLE READ/SERIALIZABLE em vez de aceitar contagem desatualizada.
    UPDATE "empresa" SET "data_atualizacao" = "data_atualizacao"
    WHERE "id_empresa" = NEW."id_empresa";
    SELECT "limite_usuarios_ativos" INTO limite FROM "assinatura" WHERE "id_empresa" = NEW."id_empresa";
    limite := COALESCE(limite, 2);
    IF (SELECT count(*) FROM "usuario" WHERE "id_empresa" = NEW."id_empresa"
        AND "ativo" AND "id_usuario" <> NEW."id_usuario") >= limite THEN
      RAISE EXCEPTION 'Limite de usuários ativos da empresa atingido.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
