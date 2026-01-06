"""Aplica migrations SQL encontradas na pasta migrations/ ao banco configurado em .env
Uso: python3 scripts/apply_migrations.py
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv('.env')
DB = os.environ.get('DATABASE_URL')

if not DB:
    raise SystemExit('DATABASE_URL não configurado no .env')

def apply_sql(path):
    with open(path, 'r') as f:
        sql = f.read()
    conn = psycopg2.connect(DB + '?sslmode=require')
    cur = conn.cursor()
    try:
        cur.execute(sql)
        conn.commit()
        print(f'Applied: {path}')
    except Exception as e:
        conn.rollback()
        print(f'ERROR applying {path}:', e)
        raise
    finally:
        cur.close(); conn.close()

if __name__ == '__main__':
    migrations = sorted([p for p in os.listdir('migrations') if p.endswith('.sql')])
    for m in migrations:
        apply_sql(os.path.join('migrations', m))
    print('All migrations applied.')