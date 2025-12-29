from neo4j import GraphDatabase
import os

URI = "neo4j://127.0.0.1:7687"
AUTH = ("neo4j", "HGLQwM2Z")
DATABASE = "aletheiapoc"

def get_latest_date():
    driver = GraphDatabase.driver(URI, auth=AUTH)
    with driver.session(database=DATABASE) as session:
        # Check Articulo nodes directly, some might not have Fecha nodes
        query = """
        MATCH (a:Articulo)
        RETURN a.fecha as date, count(a) as count
        ORDER BY a.fecha DESC
        LIMIT 10
        """
        result = session.run(query)
        print("LATEST ARTICLES IN DB:")
        for record in result:
            print(f"Date: {record['date']}, Count: {record['count']}")
            
        # Also check nodes with specific years in properties
        query_years = "MATCH (f:Fecha) WHERE f.anio IN ['2024', '2025'] RETURN f.fecha as date LIMIT 5"
        result_years = session.run(query_years)
        print("\nSAMPLE 2024/2025 FECHA NODES:")
        for record in result_years:
            print(f"Date: {record['date']}")
    driver.close()

if __name__ == "__main__":
    get_latest_date()
