from flask import Flask, jsonify
from neo4j import GraphDatabase
from flask_cors import CORS
import os
from dotenv import load_dotenv
from location_extractor import extract_location_from_text

load_dotenv()

app = Flask(__name__, static_folder='../', static_url_path='/')
CORS(app)

# Neo4j Configuration
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password"))
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(URI, auth=AUTH)

def get_news_from_db(date_filter=None, topic_filter=None):
    # Build where clauses for f (date)
    f_clauses = ["toInteger(f.anio) >= 2023"]
    if date_filter:
        f_clauses.append(f"f.fecha = '{date_filter}'")
    f_where = " AND ".join(f_clauses)
    
    # When filtering by topic, use MATCH instead of OPTIONAL MATCH
    if topic_filter:
        query = f"""
        MATCH (a:Articulo)-[:TRATA_SOBRE]->(t:Topic)
        MATCH (a)-[:PUBLICADO_EL]->(f:Fecha)
        WHERE {f_where} AND t.nombre = '{topic_filter}'
        OPTIONAL MATCH (a)-[:PUBLICADO_EN]->(p:Periodico)
        WITH a, t, collect(DISTINCT f.fecha) as dates, collect(DISTINCT p.nombre) as sources
        RETURN a.titulo AS title, 
               a.contenido AS summary, 
               a.url AS url,
               sources[0] AS source,
               dates[0] AS date,
               t.nombre AS topic
        ORDER BY date DESC
        LIMIT 50
        """
    else:
        query = f"""
        MATCH (a:Articulo)-[:PUBLICADO_EL]->(f:Fecha)
        WHERE {f_where}
        OPTIONAL MATCH (a)-[:PUBLICADO_EN]->(p:Periodico)
        OPTIONAL MATCH (a)-[:TRATA_SOBRE]->(t:Topic)
        WITH a, collect(DISTINCT f.fecha) as dates, collect(DISTINCT p.nombre) as sources, collect(DISTINCT t.nombre) as topics
        RETURN a.titulo AS title, 
               a.contenido AS summary, 
               a.url AS url,
               sources[0] AS source,
               dates[0] AS date,
               topics[0] AS topic
        ORDER BY date DESC
        LIMIT 50
        """
    print(f"DEBUG: Executing query:\n{query}")
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query)
            news_list = []
            
            # Default coordinates for Spanish news (Madrid) when extraction fails
            default_coords = {"city": "Madrid", "lat": 40.4168, "lng": -3.7038}
            
            for record in result:
                # Extract location from article title and content
                location = extract_location_from_text(
                    record["title"] or "",
                    record["summary"] or ""
                )
                
                # Use extracted location or default to Madrid
                if location:
                    coords = location
                else:
                    coords = default_coords
                
                news_item = {
                    "city": coords["city"],
                    "lat": coords["lat"],
                    "lng": coords["lng"],
                    "title": record["title"] or "Sin título",
                    "summary": (record["summary"][:500] + "...") if record["summary"] and len(record["summary"]) > 500 else (record["summary"] or "Sin resumen"),
                    "source": record["source"] or "Desconocido",
                    "url": record["url"] or "#",
                    "date": record["date"]
                }
                news_list.append(news_item)
            
            return news_list
    except Exception as e:
        print(f"Error querying Neo4j: {e}")
        import traceback
        traceback.print_exc()
        return []

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/news', methods=['GET'])
def get_news():
    from flask import request
    date_filter = request.args.get('date')
    topic_filter = request.args.get('topic')
    
    news = get_news_from_db(date_filter=date_filter, topic_filter=topic_filter)
    return jsonify(news)

@app.route('/api/dates', methods=['GET'])
def get_dates():
    """Get all available dates with article counts"""
    query = """
    MATCH (f:Fecha)<-[:PUBLICADO_EL]-(a:Articulo)
    WHERE toInteger(f.anio) >= 2023
    RETURN f.fecha AS date, f.dia_semana AS day, count(a) AS count
    ORDER BY f.fecha DESC
    """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query)
            dates = [{"date": record["date"], "day": record["day"], "count": record["count"]} 
                    for record in result]
            return jsonify(dates)
    except Exception as e:
        print(f"Error getting dates: {e}")
        return jsonify([])

@app.route('/api/topics', methods=['GET'])
def get_topics():
    """Get all topics with article counts"""
    query = """
    MATCH (t:Topic)<-[:TRATA_SOBRE]-(a:Articulo)
    RETURN t.nombre AS topic, count(a) AS count
    ORDER BY count DESC
    LIMIT 50
    """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query)
            topics = [{"topic": record["topic"], "count": record["count"]} 
                     for record in result]
            return jsonify(topics)
    except Exception as e:
        print(f"Error getting topics: {e}")
        return jsonify([])

if __name__ == '__main__':
    print(f"Connecting to Neo4j at {URI}")
    app.run(port=5000, debug=True)
