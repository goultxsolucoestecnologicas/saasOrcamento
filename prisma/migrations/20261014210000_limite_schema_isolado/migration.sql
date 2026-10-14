BEGIN;
-- Usa o schema da tabela acionadora mesmo quando o driver qualifica tabelas
-- sem alterar search_path. Também preserva a proteção MVCC concorrente.
CREATE OR REPLACE FUNCTION "verificar_limite_usuarios"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE limite integer;
DECLARE quantidade bigint;
BEGIN
  IF NEW."ativo" THEN
    EXECUTE format('UPDATE %I.empresa SET data_atualizacao=data_atualizacao WHERE id_empresa=$1', TG_TABLE_SCHEMA)
      USING NEW."id_empresa";
    EXECUTE format('SELECT limite_usuarios_ativos FROM %I.assinatura WHERE id_empresa=$1', TG_TABLE_SCHEMA)
      INTO limite USING NEW."id_empresa";
    limite := COALESCE(limite, 2);
    EXECUTE format('SELECT count(*) FROM %I.usuario WHERE id_empresa=$1 AND ativo AND id_usuario<>$2', TG_TABLE_SCHEMA)
      INTO quantidade USING NEW."id_empresa", NEW."id_usuario";
    IF quantidade >= limite THEN
      RAISE EXCEPTION 'Limite de usuários ativos da empresa atingido.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
