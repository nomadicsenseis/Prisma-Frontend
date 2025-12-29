# Prisma Aletheia

Una aplicación de visualización de noticias españolas con un globo 3D interactivo y línea de tiempo comparativa.

## Descripción

Prisma Aletheia permite explorar y comparar cómo diferentes periódicos españoles (El País, El Mundo) cubren los mismos eventos. La aplicación ofrece:

- **Vista de Globo 3D**: Visualización geográfica de noticias con puntos interactivos
- **Línea de Tiempo**: Cronología de eventos macro y hechos específicos
- **Panel Comparativo**: Comparación lado a lado de artículos de diferentes medios
- **Filtros**: Por fecha y tema/tópico

## Estructura del Proyecto

```
Frontend/
├── index.html          # Página principal
├── script.js           # Lógica del frontend
├── styles.css          # Estilos CSS
├── backend/
│   ├── app.py          # API Flask (servidor)
│   ├── location_extractor.py  # Extracción de ubicaciones
│   ├── requirements.txt       # Dependencias Python
│   └── .env            # Variables de entorno
├── img/                # Texturas y logos
└── vendor/             # Librerías JS (Three.js, Globe.gl, Lucide)
```

## Requisitos

- Python 3.8+
- Neo4j (base de datos de grafos)
- Navegador moderno con WebGL

## Instalación

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configuración

Crea o edita el archivo `backend/.env`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=tu_password
NEO4J_DATABASE=neo4j
```

## Ejecución

### Iniciar el Backend

```bash
cd backend
python app.py
```

El servidor se ejecutará en `http://localhost:5000`.

### Abrir el Frontend

Abre `index.html` en tu navegador, o usa un servidor local:

```bash
# Opción con Python
python -m http.server 8080
```

Luego visita `http://localhost:8080`.

## API Endpoints

| Endpoint | Descripción |
|:---------|:------------|
| `GET /api/news` | Obtener noticias (acepta `date` y `topic` como query params) |
| `GET /api/dates` | Fechas disponibles con conteo de artículos |
| `GET /api/topics` | Temas/tópicos disponibles |
| `GET /api/timeline/macros` | Eventos macro para la línea de tiempo |
| `GET /api/timeline/<macro>` | Hechos de un evento macro específico |
| `GET /api/hecho/<id>/articles` | Artículos asociados a un hecho |

## Esquema de Datos (Neo4j)

Ver [narrative_graph_spec.md](./narrative_graph_spec.md) para detalles del grafo de conocimiento.

## Tecnologías

- **Frontend**: HTML, CSS, JavaScript vanilla
- **3D**: Three.js, Globe.gl
- **Backend**: Flask, Python
- **Base de Datos**: Neo4j
- **Iconos**: Lucide
