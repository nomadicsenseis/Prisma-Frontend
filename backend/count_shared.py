from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
AUTH = (os.getenv('NEO4J_USER', 'neo4j'), os.getenv('NEO4J_PASSWORD', 'password'))
DATABASE = os.getenv('NEO4J_DATABASE', 'neo4j')

driver = GraphDatabase.driver(URI, auth=AUTH)

with driver.session(database=DATABASE) as session:
    # Count hechos with articles from BOTH newspapers
    result = session.run("""
        MATCH (h:Hecho)<-[:REF_HECHO]-(a:Articulo)-[:PUBLICADO_EN]->(p:Periodico)
        WITH h, collect(DISTINCT p.nombre) as newspapers
        WHERE 'El País' IN newspapers AND 'El Mundo' IN newspapers
        RETURN count(h) as shared_count
    """)
    shared = result.single()['shared_count']
    
    # Count total hechos
    result2 = session.run('MATCH (h:Hecho) RETURN count(h) as total')
    total = result2.single()['total']
    
    # Count hechos per newspaper
    result3 = session.run("""
        MATCH (h:Hecho)<-[:REF_HECHO]-(a:Articulo)-[:PUBLICADO_EN]->(p:Periodico)
        RETURN p.nombre as periodico, count(DISTINCT h) as hechos
    """)
    
    print(f'=== Estadísticas de Hechos ===')
    print(f'Total de Hechos: {total}')
    print(f'Hechos compartidos (ambos periódicos): {shared}')
    print(f'')
    print(f'Hechos por periódico:')
    for record in result3:
        print(f"  - {record['periodico']}: {record['hechos']}")

driver.close()
