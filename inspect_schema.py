from app.core.settings import settings
from app.infrastructure.data_engine import DataEngine
import json
from pathlib import Path


def list_tables(engine: DataEngine, schema: str):
    query = f"""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '{schema}'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
    """
    rows = engine._execute_query(query)
    return [r["table_name"] if isinstance(r, dict) else r[0] for r in rows]


def list_columns(engine: DataEngine, schema: str, table: str):
    query = f"""
    SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
    FROM information_schema.columns
    WHERE table_schema = '{schema}'
      AND table_name = '{table}'
    ORDER BY ordinal_position;
    """
    return engine._execute_query(query)


def inspect_schema(schema: str = "audit_search"):
    try:
        engine = DataEngine(settings.database_url)

        tables = list_tables(engine, schema)

        out = {
            "schema": schema,
            "tables": {}
        }

        for t in tables:
            cols = list_columns(engine, schema, t)
            out["tables"][t] = cols

        # Caminho da raiz do app
        output_path = Path("schema_inspect.txt")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(out, ensure_ascii=False, indent=2))

        print(f"Arquivo gerado em: {output_path.resolve()}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_schema("audit_search")
