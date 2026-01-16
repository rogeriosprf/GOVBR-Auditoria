from app.core.settings import settings
from app.infrastructure.data_engine import DataEngine
import json

def read_schema():
    try:
        engine = DataEngine(settings.database_url)
        
        # Get all tables
        tables_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'audit_bi'
        ORDER BY table_name;
        """
        tables = engine._execute_query(tables_query)
        
        print("=" * 80)
        print("SCHEMA audit_bi - ESTRUTURA COMPLETA")
        print("=" * 80)
        
        for table_info in tables:
            table_name = table_info['table_name']
            print(f"\n{'='*80}")
            print(f"TABELA: {table_name}")
            print(f"{'='*80}")
            
            # Get columns
            cols_query = f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'audit_bi' AND table_name = '{table_name}'
            ORDER BY ordinal_position;
            """
            cols = engine._execute_query(cols_query)
            
            print("\nCOLUNAS:")
            for col in cols:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                print(f"  - {col['column_name']:<30} {col['data_type']:<20} {nullable}")
            
            # Get sample data
            sample_query = f"SELECT * FROM audit_bi.{table_name} LIMIT 3;"
            samples = engine._execute_query(sample_query)
            
            print(f"\nAMOSTRA DE DADOS ({len(samples)} registros):")
            if samples:
                for i, row in enumerate(samples, 1):
                    print(f"\n  Registro {i}:")
                    for key, value in row.items():
                        print(f"    {key}: {value}")
            else:
                print("  (tabela vazia)")
        
        # Get functions
        print(f"\n{'='*80}")
        print("FUNÇÕES DISPONÍVEIS")
        print(f"{'='*80}")
        
        funcs_query = """
        SELECT routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'audit_bi'
        ORDER BY routine_name;
        """
        funcs = engine._execute_query(funcs_query)
        
        for func in funcs:
            print(f"  - {func['routine_name']} ({func['routine_type']})")
        
        print(f"\n{'='*80}\n")
        
    except Exception as e:
        print(f"ERRO: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    read_schema()
