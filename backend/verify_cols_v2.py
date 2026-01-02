import pymysql
import os

def check():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='_5Cr]92@',
            database='vital_signs_db'
        )
        with conn.cursor() as cursor:
            for table in ['users', 'measurements']:
                print(f"\n--- {table} ---")
                cursor.execute(f"DESCRIBE {table}")
                rows = cursor.fetchall()
                for row in rows:
                    print(f"{row[0]}: {row[1]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
