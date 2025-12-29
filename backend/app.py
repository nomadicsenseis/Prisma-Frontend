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
    # Base date extraction - handle timestamps by taking first 10 chars
    date_extract = "substring(COALESCE(f.fecha, a.fecha), 0, 10)"
    
    # If no date filter, find the latest date first to avoid "scattered" view
    actual_date = date_filter
    if not actual_date:
        try:
            with driver.session(database=DATABASE) as session:
                latest_res = session.run(f"MATCH (a:Articulo) OPTIONAL MATCH (a)-[:PUBLICADO_EL]->(f:Fecha) WITH {date_extract} as d WHERE d IS NOT NULL RETURN max(d)")
                actual_date = latest_res.single()[0]
        except Exception as e:
            print(f"Error finding latest date: {e}")
            actual_date = None

    date_where = ""
    if actual_date:
        date_where = f"WHERE {date_extract} = '{actual_date}'"
    
    if topic_filter:
        query = f"""
        MATCH (a:Articulo)-[:TRATA_SOBRE]->(t:Topic {{nombre: '{topic_filter}'}})
        OPTIONAL MATCH (a)-[:PUBLICADO_EL]->(f:Fecha)
        WITH a, t, {date_extract} as fechaVal
        {date_where}
        OPTIONAL MATCH (a)-[:PUBLICADO_EN]->(p:Periodico)
        WITH a, t, fechaVal, collect(DISTINCT p.nombre) as sources
        RETURN a.titulo AS title, 
               a.contenido AS summary, 
               a.url AS url,
               sources[0] AS source,
               fechaVal AS date,
               t.nombre AS topic
        ORDER BY date DESC
        LIMIT 1000
        """
    else:
        query = f"""
        MATCH (a:Articulo)
        OPTIONAL MATCH (a)-[:PUBLICADO_EL]->(f:Fecha)
        WITH a, {date_extract} as fechaVal
        {date_where}
        OPTIONAL MATCH (a)-[:TRATA_SOBRE]->(t:Topic)
        OPTIONAL MATCH (a)-[:PUBLICADO_EN]->(p:Periodico)
        WITH a, fechaVal, collect(DISTINCT t.nombre) as topics, collect(DISTINCT p.nombre) as sources
        WHERE fechaVal IS NOT NULL
        RETURN a.titulo AS title, 
               a.contenido AS summary, 
               a.url AS url,
               sources[0] AS source,
               fechaVal AS date,
               topics[0] AS topic
        ORDER BY date DESC
        LIMIT 1000
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
            
            print(f"DEBUG: Found {len(news_list)} news items for date {actual_date}")
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

@app.route('/api/macros/timeline', methods=['GET'])
def get_macros_timeline():
    """Get the main EventoMacro (Israel-Hamas) with its first Hecho date"""
    query = """
    MATCH (m:EventoMacro {nombre: 'Guerra Israel-Hamas 2023'})<-[:PARTE_DE]-(h:Hecho)
    WITH m, min(h.fecha) as startDate
    RETURN m.nombre as nombre, m.descripcion as descripcion, startDate
    """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query)
            macros = [{"nombre": record["nombre"], "descripcion": record["descripcion"], "date": record["startDate"]} for record in result]
            return jsonify(macros)
    except Exception as e:
        print(f"Error getting macro timeline: {e}")
        return jsonify([])

@app.route('/api/hechos/recent', methods=['GET'])
def get_recent_hechos():
    """Get recent hechos with their articles - for Prisma view, ordered by latest date. 
       Now resilient to articles without separate Fecha nodes (Dec 2025 data)."""
    query = """
    MATCH (h:Hecho)<-[:REF_HECHO]-(a:Articulo)-[:PUBLICADO_EN]->(p:Periodico)
    OPTIONAL MATCH (a)-[:PUBLICADO_EL]->(f:Fecha)
    WITH h, 
         collect(DISTINCT p.nombre) as newspapers, 
         max(COALESCE(f.fecha, a.fecha)) as latestDate
    OPTIONAL MATCH (h)-[:PARTE_DE]->(m:EventoMacro)
    RETURN h.nombre as id, 
           COALESCE(h.fecha, latestDate) as date, 
           h.descripcion as text, 
           m.nombre as macroevento,
           newspapers
    ORDER BY latestDate DESC
    LIMIT 40
    """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query)
            hechos = [{
                "id": record["id"], 
                "date": record["date"], 
                "text": record["text"],
                "macroevento": record["macroevento"] or "Sin clasificar",
                "newspapers": record["newspapers"]
            } for record in result]
            return jsonify(hechos)
    except Exception as e:
        print(f"Error getting recent hechos: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([])

@app.route('/api/hechos/by-date/<date>', methods=['GET'])
def get_hechos_by_date(date):
    """Get all hechos for a specific date to provide scrolling context"""
    query = """
    MATCH (h:Hecho)
    OPTIONAL MATCH (h)<-[:REF_HECHO]-(a:Articulo)-[:PUBLICADO_EN]->(p:Periodico)
    OPTIONAL MATCH (a)-[:PUBLICADO_EL]->(f:Fecha)
    WITH h, 
         collect(DISTINCT p.nombre) as newspapers, 
         COALESCE(h.fecha, max(f.fecha), max(a.fecha)) as hDate
    WHERE hDate <= $date
    OPTIONAL MATCH (h)-[:PARTE_DE]->(m:EventoMacro)
    RETURN h.nombre as id, 
           hDate as date, 
           h.descripcion as text, 
           m.nombre as macroevento,
           newspapers
    ORDER BY hDate DESC
    LIMIT 50
    """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query, date=date)
            hechos = [{
                "id": record["id"], 
                "date": record["date"], 
                "text": record["text"],
                "macroevento": record["macroevento"] or "Sin clasificar",
                "newspapers": record["newspapers"]
            } for record in result]
            return jsonify(hechos)
    except Exception as e:
        print(f"Error getting hechos by date: {e}")
        return jsonify([])

@app.route('/api/dates', methods=['GET'])
def get_dates():
    """Get all available dates with article counts, optionally filtered by topic."""
    from flask import request
    topic_filter = request.args.get('topic')
    
    date_extract = "substring(COALESCE(f.fecha, a.fecha), 0, 10)"
    
    if topic_filter:
        query = f"""
        MATCH (a:Articulo)-[:TRATA_SOBRE]->(t:Topic {{nombre: $topic}})
        OPTIONAL MATCH (a)-[:PUBLICADO_EL]->(f:Fecha)
        WITH {date_extract} as fechaVal, a
        WHERE fechaVal IS NOT NULL
        RETURN fechaVal AS date, count(a) AS count
        ORDER BY date DESC
        """
    else:
        query = f"""
        MATCH (a:Articulo)
        OPTIONAL MATCH (a)-[:PUBLICADO_EL]->(f:Fecha)
        WITH {date_extract} as fechaVal, a
        WHERE fechaVal IS NOT NULL
        RETURN fechaVal AS date, count(a) AS count
        ORDER BY date DESC
        """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query, topic=topic_filter)
            dates = [{"date": record["date"], "count": record["count"]} 
                    for record in result]
            return jsonify(dates)
    except Exception as e:
        print(f"Error getting dates: {e}")
        return jsonify([])

@app.route('/api/macros', methods=['GET'])

@app.route('/api/timeline/<macro_name>', methods=['GET'])
def get_timeline(macro_name):
    """Get Hecho nodes for a macroevento ordered by date DESC (most recent first)"""
    query = """
    MATCH (m:EventoMacro {nombre: $macro_name})<-[:PARTE_DE]-(h:Hecho)
    OPTIONAL MATCH (h)<-[:REF_HECHO]-(a:Articulo)-[:PUBLICADO_EL]->(f:Fecha)
    WITH h, COALESCE(h.fecha, min(f.fecha)) as eventDate
    RETURN h.nombre as id, eventDate as date, h.descripcion as text
    ORDER BY eventDate DESC
    """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query, macro_name=macro_name)
            timeline = [{"id": record["id"], "date": record["date"], "text": record["text"]} for record in result]
            return jsonify(timeline)
    except Exception as e:
        print(f"Error getting timeline: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([])

@app.route('/api/hecho/<hecho_id>/articles', methods=['GET'])
def get_hecho_articles(hecho_id):
    """Get articles associated with a specific fact, grouped by newspaper"""
    query = """
    MATCH (h:Hecho {nombre: $hecho_id})<-[:REF_HECHO]-(a:Articulo)-[:PUBLICADO_EN]->(p:Periodico)
    RETURN p.nombre as medio, a.titulo as titulo, a.url as link, a.contenido as summary
    """
    try:
        with driver.session(database=DATABASE) as session:
            result = session.run(query, hecho_id=hecho_id)
            articles = []
            for record in result:
                articles.append({
                    "medio": record["medio"],
                    "titulo": record["titulo"],
                    "link": record["link"],
                    "summary": (record["summary"][:500] + "...") if record["summary"] and len(record["summary"]) > 500 else (record["summary"] or "Sin resumen")
                })
            return jsonify(articles)
    except Exception as e:
        print(f"Error getting hecho articles: {e}")
        return jsonify([])

if __name__ == '__main__':
    print(f"Connecting to Neo4j at {URI}")
    app.run(port=5000, debug=True)
