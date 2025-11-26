from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
import json

load_dotenv()

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password"))
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(URI, auth=AUTH)

def inspect():
    output = []
    with driver.session(database=DATABASE) as session:
        # Get all distinct labels
        output.append("=== DATABASE SCHEMA ===\n")
        result = session.run("CALL db.labels()")
        labels = [record[0] for record in result]
        output.append(f"Labels found: {labels}\n")
        
        # For each label, show a sample
        for label in labels:
            output.append(f"\n--- Sample '{label}' node ---")
            result = session.run(f"MATCH (n:{label}) RETURN n LIMIT 1")
            for record in result:
                node = record['n']
                props = dict(node)
                output.append(json.dumps(props, indent=2, ensure_ascii=False))
            
            # Count
            result = session.run(f"MATCH (n:{label}) RETURN count(n) as count")
            for record in result:
                output.append(f"Total {label} nodes: {record['count']}")
    
    # Write to file
    with open('schema_output.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    
    print("Schema written to schema_output.txt")

if __name__ == "__main__":
    try:
        inspect()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        driver.close()
