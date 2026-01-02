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
                cursor.execute(f"DESCRIBE {table}")
                cols = [row[0] for row in cursor.fetchall()]
                print(f"{table}: {', '.join(cols)}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
