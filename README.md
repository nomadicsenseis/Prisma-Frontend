# Prisma Aletheia 🌍

**Plataforma de visualización interactiva de noticias con un enfoque en análisis comparativo de medios y representación geográfica global.**

![Status](https://img.shields.io/badge/Status-En%20Desarrollo-blue)
![Python](https://img.shields.io/badge/Backend-Flask%20%2B%20Neo4j-green)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20Globe.gl-orange)

---

## 📋 Descripción General

Prisma Aletheia es una aplicación web que permite explorar y analizar noticias de diferentes medios españoles (El País, El Mundo) de forma visual e interactiva. La plataforma conecta con una base de datos Neo4j que contiene artículos clasificados por temas, fechas y ubicaciones geográficas.

### Características Principales

- **🌐 Globo Interactivo**: Visualización de noticias sobre un globo 3D con marcadores geolocalizados
- **📅 Timeline Horizontal**: Línea de tiempo de macro-eventos y hechos históricos
- **📱 Vista Prisma**: Simulador móvil con navegación entre caras que muestra comparativas de medios, eventos del día y línea temporal vertical
- **🔍 Filtros Avanzados**: Filtrado por fecha, temas y macro-eventos
- **💬 Chatbot Integrado**: Interfaz de asistente IA para consultas (placeholder)

---

## 🏗️ Arquitectura del Proyecto

```
Frontend/
├── backend/
│   ├── app.py                  # Servidor Flask - API REST principal
│   ├── location_extractor.py   # Extractor de ubicaciones geográficas
│   ├── count_shared.py         # Utilidad de conteo
│   ├── requirements.txt        # Dependencias Python
│   └── .env                    # Variables de entorno (Neo4j config)
├── img/
│   ├── earth-*.jpg/png         # Texturas del globo 3D
│   ├── el_pais_icon.jpg        # Logo El País
│   └── el_mundo_icon.png       # Logo El Mundo
├── vendor/
│   ├── three.min.js            # Three.js para renderizado 3D
│   ├── globe.gl.min.js         # Globe.gl para visualización del globo
│   └── lucide.min.js           # Iconos Lucide
├── index.html                  # Página principal
├── script.js                   # Lógica del frontend (~1450 líneas)
├── styles.css                  # Estilos CSS (~2130 líneas)
└── narrative_graph_spec.md     # Especificación del grafo de conocimiento
```

---

## 📊 Modelo de Datos (Neo4j)

El sistema utiliza un grafo de conocimiento narrativo con la siguiente estructura:

```
(:EventoMacro) <-[:PARTE_DE]- (:Hecho)
       |                          |
       |                    [:REF_HECHO]
       |                          |
       |                    (:Articulo)
       |                          |
       |              [:PUBLICADO_EN] / [:PUBLICADO_EL]
       |                    /                \
               (:Periodico)              (:Fecha)
```

### Nodos Principales

| Nodo | Descripción |
|------|-------------|
| **EventoMacro** | Procesos de larga duración (ej: "Guerra Israel-Hamas 2023") |
| **Hecho** | Sucesos puntuales con fecha específica |
| **Articulo** | Noticia individual con título, contenido y URL |
| **Periodico** | Medio de comunicación (El País, El Mundo) |
| **Topic** | Categoría temática de los artículos |
| **Fecha** | Nodo de fecha para indexación temporal |

---

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Python 3.8+
- Neo4j Database (local o remoto)
- Navegador moderno con soporte WebGL

### Pasos de Instalación

1. **Clonar/acceder al repositorio**

2. **Configurar variables de entorno**
   
   Crear archivo `backend/.env`:
   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=tu_password
   NEO4J_DATABASE=neo4j
   ```

3. **Instalar dependencias Python**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Ejecutar el servidor**
   ```bash
   python app.py
   ```
   
   El servidor se iniciará en `http://localhost:5000`

5. **Acceder a la aplicación**
   
   Abrir navegador en `http://localhost:5000`

---

## 🔌 API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/news` | GET | Obtener noticias (params: `date`, `topic`) |
| `/api/topics` | GET | Listar temas con conteo de artículos |
| `/api/dates` | GET | Fechas disponibles (params: `topic`) |
| `/api/macros/timeline` | GET | Obtener macro-eventos para timeline |
| `/api/timeline/<macro_name>` | GET | Hechos de un macro-evento específico |
| `/api/hechos/recent` | GET | Hechos recientes para vista Prisma |
| `/api/hechos/by-date/<date>` | GET | Hechos filtrados por fecha |
| `/api/hecho/<hecho_id>/articles` | GET | Artículos asociados a un hecho |

---

## 🎨 Vistas de la Aplicación

### 1. Vista Globo (Principal)
- Globo 3D interactivo con texturas de la Tierra
- Marcadores pulsantes en ubicaciones con noticias
- Panel lateral con calendario, filtro de temas y titulares
- Panel de lectura de artículos

### 2. Vista Timeline
- Línea de tiempo horizontal a pantalla completa
- Selector de macro-eventos
- Control de zoom con slider y rueda del ratón
- Navegación hacia los eventos más recientes

### 3. Vista Prisma (Simulador Móvil)
- Cara 0: **Comparativa de Medios** - Artículos lado a lado por periódico
- Cara 1: **Eventos del Día** - Feed de hechos con mini-globo contextual
- Cara 2: **Línea Temporal** - Timeline vertical de macro-eventos

---

## 🌍 Extractor de Ubicaciones

El archivo `location_extractor.py` contiene un diccionario de ~115 ciudades/regiones con sus coordenadas geográficas:

- **Ciudades españolas**: Madrid, Barcelona, Valencia, Sevilla, etc.
- **Capitales europeas**: París, Londres, Berlín, Roma, etc.
- **Regiones de conflicto**: Gaza, Israel, Ucrania, Sudán, etc.
- **Ciudades internacionales**: Nueva York, Tokio, Buenos Aires, etc.

El sistema extrae ubicaciones del título y contenido de los artículos para posicionar los marcadores en el globo.

---

## 📈 Estado Actual del Proyecto

### ✅ Funcionalidades Implementadas
- [x] Visualización del globo 3D con Globe.gl
- [x] Conexión con base de datos Neo4j
- [x] Filtrado por fecha y tema
- [x] Vista Timeline con macro-eventos
- [x] Vista Prisma con simulador móvil
- [x] Comparación de artículos entre medios
- [x] Extracción automática de ubicaciones
- [x] Panel de lectura de artículos
- [x] Calendario interactivo con indicadores de artículos

### 🔄 En Progreso / Mejoras Pendientes
- [ ] Integración completa del chatbot con IA
- [ ] Relaciones SIGUE_A entre hechos (causalidad)
- [ ] Optimización para grandes volúmenes de datos
- [ ] Página "Sobre nosotros" y "Fuentes"
- [ ] Responsive design para dispositivos móviles

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnología |
|-----------|------------|
| **Backend** | Flask, Neo4j Driver, Python-dotenv, Flask-CORS |
| **Frontend** | Vanilla JavaScript, CSS3 |
| **Visualización 3D** | Three.js, Globe.gl |
| **Iconos** | Lucide Icons |
| **Base de Datos** | Neo4j Graph Database |

---

## 📝 Notas de Desarrollo

- El sistema tiene procesados aproximadamente **2,900+ artículos**
- Los datos incluyen cobertura de conflictos como Israel-Hamas, Ucrania-Rusia y Sudán
- Las fuentes principales son El País y El Mundo
- Los artículos se clasifican por temas usando procesamiento con LLM (externo al frontend)

---

## 📄 Licencia

Este proyecto es parte del desarrollo de Prisma Aletheia. Consultar con el propietario para términos de uso.

---

*Última actualización: Enero 2026*
