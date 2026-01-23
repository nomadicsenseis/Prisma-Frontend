// Global state
let newsData = [];
let world;
let availableDates = [];
let currentDateIndex = 0;
let selectedTopic = ""; // empty means all topics
let miniGlobeViz = null;

// Prisma state
// Prisma state
let prismaHechos = [];
let currentPrismaFace = 0;
let currentHechoIndex = 0;
let isPrismaNavigating = false;

// Expose to window for debugging and external access
window.prismaHechos = prismaHechos;
window.currentPrismaFace = currentPrismaFace;

// DOM elements for news reader
const readerPanel = document.getElementById('newsReader');
const readerSource = document.getElementById('readerSource');
const readerTitle = document.getElementById('readerTitle');
const readerContent = document.getElementById('readerContent');

function openReader(articles) {
    if (!articles || articles.length === 0) return;

    // Use the first article for location info (assuming all in group are same location)
    const first = articles[0];
    const isSingle = articles.length === 1;

    // Header title
    if (isSingle) {
        readerSource.textContent = `${first.source} • ${first.city}`;
        readerTitle.textContent = first.title;
    } else {
        readerSource.textContent = `${first.city}`;
        readerTitle.textContent = `${articles.length} Noticias Destacadas`;
    }

    // Connect content
    // We'll map each article to HTML
    const contentHTML = articles.map(data => `
        <div class="article-block" style="margin-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;">
            <div style="font-size: 0.9em; opacity: 0.7; margin-bottom: 5px;">${data.source} • ${data.date}</div>
            ${!isSingle ? `<h3 style="margin: 0 0 10px 0; font-size: 1.2em;">${data.title}</h3>` : ''}
            <p style="line-height: 1.6;">${data.summary}</p>
            <a href="${data.url}" target="_blank" class="read-more-btn" style="display: inline-block; margin-top: 10px;">
                Leer artículo original <i data-lucide="external-link" style="width:14px;vertical-align:middle;"></i>
            </a>
        </div>
    `).join('');

    readerContent.innerHTML = contentHTML;
    readerPanel.classList.add('open');
    lucide.createIcons();

    if (world) {
        // Focus on the location
        world.pointOfView({ lat: first.lat, lng: first.lng, altitude: 1.2 }, 2000);
        world.controls().autoRotate = false;
    }
}

function closeArticle() {
    readerPanel.classList.remove('open');
}

function updateNewsList() {
    console.log('updateNewsList called with', newsData.length, 'articles');
    const newsList = document.getElementById('topNews');
    newsList.innerHTML = '';
    newsData.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.title;
        li.title = item.summary;
        li.onclick = () => openReader([item]);
        newsList.appendChild(li);
    });
    console.log('News list updated, now has', newsList.children.length, 'items');
}

// Calendar UI
let calendarDate = new Date(); // The month currently being viewed
let selectedDate = null; // The specific date selected (YYYY-MM-DD)

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('currentMonthLabel');
    if (!grid || !monthLabel) return;

    grid.innerHTML = '';

    // Update header
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    monthLabel.textContent = `${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;

    // Calculate days
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Adjust for Monday start (0=Sun, 1=Mon... -> 0=Mon, 6=Sun)
    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;

    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = i;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Check if date has news
        const dateData = availableDates.find(d => d.date === dateStr);
        if (dateData) {
            div.classList.add('has-news');
            const countSpan = document.createElement('span');
            countSpan.className = 'article-count';
            countSpan.textContent = dateData.count;
            div.appendChild(countSpan);
        }

        // Check if selected
        if (selectedDate === dateStr) div.classList.add('active');

        div.onclick = () => {
            selectedDate = dateStr;
            renderCalendar(); // Re-render to update active state
            fetchNews(selectedDate, selectedTopic);
        };

        grid.appendChild(div);
    }
}

function changeMonth(offset) {
    calendarDate.setMonth(calendarDate.getMonth() + offset);
    renderCalendar();
}

async function fetchDates(topic = null) {
    try {
        let url = `/api/dates?t=${Date.now()}`;
        if (topic) url += `&topic=${encodeURIComponent(topic)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch dates');
        availableDates = await res.json();

        // Select the most recent date by default if nothing selected
        if (availableDates.length > 0 && !selectedDate) {
            availableDates.sort((a, b) => new Date(b.date) - new Date(a.date));
            selectedDate = availableDates[0].date;
            calendarDate = new Date(selectedDate);
        }
        renderCalendar();
    } catch (e) {
        console.error('Error fetching dates:', e);
    }
}

async function fetchTopics() {
    try {
        const res = await fetch(`/api/topics?t=${Date.now()}`);
        if (!res.ok) throw new Error('Failed to fetch topics');
        const topics = await res.json();

        const select = document.getElementById('topicSelect');
        if (!select) {
            console.error('topicSelect element not found');
            return;
        }

        // Preserve default option
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) select.appendChild(defaultOption);

        if (Array.isArray(topics)) {
            topics.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.topic;
                opt.textContent = `${t.topic} (${t.count})`;
                select.appendChild(opt);
            });
        } else {
            console.error('Topics data is not an array:', topics);
        }

        select.addEventListener('change', () => {
            selectedTopic = select.value;
            fetchNews(selectedDate, selectedTopic);
            fetchDates(selectedTopic); // Update calendar dots to match topic
            // Sync with timeline
            if (timelineSection.style.display === 'flex') {
                updateTimelineView();
            }
        });
    } catch (e) {
        console.error('Error fetching topics:', e);
    }
}

/* 
   Helper to group news by City (or Lat/Lng) 
   Returns an array of objects: { city, lat, lng, articles: [...] }
*/
function groupNewsByLocation(data) {
    const groups = {};
    data.forEach(item => {
        // Create a unique key based on coordinates to handle same-named cities in diff locations if ever needed
        // But city name is good for display.
        const key = `${item.city}_${item.lat}_${item.lng}`;
        if (!groups[key]) {
            groups[key] = {
                city: item.city,
                lat: item.lat,
                lng: item.lng,
                articles: []
            };
        }
        groups[key].articles.push(item);
    });
    return Object.values(groups);
}

// Loading & Empty State Helpers
function showLoading() {
    const loading = document.getElementById('loadingState');
    const empty = document.getElementById('emptyState');
    const list = document.getElementById('topNews');
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (list) list.style.display = 'none';
}

function hideLoading(isEmpty = false) {
    const loading = document.getElementById('loadingState');
    const empty = document.getElementById('emptyState');
    const list = document.getElementById('topNews');
    if (loading) loading.style.display = 'none';
    if (empty) empty.style.display = isEmpty ? 'flex' : 'none';
    if (list) list.style.display = isEmpty ? 'none' : 'block';
}

async function fetchNews(dateFilter = null, topicFilter = null) {
    console.log('✅ fetchNews called with date:', dateFilter, 'topic:', topicFilter);
    showLoading();
    try {
        let url = `/api/news?t=${Date.now()}`;
        if (dateFilter) url += `&date=${dateFilter}`;
        if (topicFilter) url += `&topic=${encodeURIComponent(topicFilter)}`;
        console.log('📡 Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        console.log('📥 Received', data.length, 'articles');
        newsData = data;

        // UI Feedback: Update results count
        const newsTitle = document.querySelector('.news-list h3');
        if (newsTitle) {
            newsTitle.innerHTML = `Noticias <span class="results-badge">${newsData.length} resultados</span>`;
        }

        if (world) {
            console.log('🌍 Updating globe with', newsData.length, 'markers');
            updateGlobeData();
        } else {
            console.log('🌍 Initializing globe');
            initializeGlobe();
        }
        updateNewsList();
        hideLoading(newsData.length === 0);
    } catch (e) {
        console.error('❌ Error fetching news:', e);
        hideLoading(false);
    }
}

// Update Globe Data needs to use grouping
function updateGlobeData() {
    if (world) {
        const grouped = groupNewsByLocation(newsData);
        world.htmlElementsData(grouped);
    }
}

function initializeGlobe() {
    if (!window.THREE || typeof Globe === 'undefined') {
        console.error('Missing dependencies');
        return;
    }
    const loader = new THREE.TextureLoader();
    const dayTex = loader.load('./img/earth-blue-marble.jpg');
    const nightTex = loader.load('./img/earth-night.jpg');
    const cloudTex = loader.load('./img/earth-clouds.png');
    const sunDir = new THREE.Vector3(-1, 0.5, 1.5).normalize();
    const earthMat = new THREE.ShaderMaterial({
        uniforms: {
            dayTexture: { value: dayTex },
            nightTexture: { value: nightTex },
            sunDirection: { value: sunDir }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            void main() {
                vUv = uv;
                vNormal = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D dayTexture;
            uniform sampler2D nightTexture;
            uniform vec3 sunDirection;
            varying vec2 vUv;
            varying vec3 vNormal;
            void main() {
                vec3 day = texture2D(dayTexture, vUv).rgb;
                vec3 night = texture2D(nightTexture, vUv).rgb;
                float intensity = dot(vNormal, sunDirection);
                float mixFactor = smoothstep(-0.1, 0.1, intensity);
                vec3 final = mix(night, day, mixFactor);
                gl_FragColor = vec4(final, 1.0);
            }
        `
    });

    // Prepare initial data
    const groupedData = groupNewsByLocation(newsData);

    world = Globe()(document.getElementById('globeViz'))
        .globeMaterial(earthMat)
        .backgroundImageUrl('./img/night-sky.png')
        .pointOfView({ lat: 40.4168, lng: -3.7038, altitude: 1.5 })
        .htmlElementsData(groupedData)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlElement(d => {
            const el = document.createElement('div');
            el.className = 'news-marker';

            // Marker Visuals
            // If multiple articles, maybe show count or different style?
            const count = d.articles.length;
            const isMulti = count > 1;

            // Generate sources summary for card: "El País (2), El Mundo (1)"
            const sources = {};
            d.articles.forEach(a => {
                sources[a.source] = (sources[a.source] || 0) + 1;
            });
            const sourceText = Object.entries(sources).map(([k, v]) => `${k} (${v})`).join(', ');

            el.innerHTML = `
                <div class="marker-dot" style="${isMulti ? 'background: #ffaa00; box-shadow: 0 0 10px #ffaa00;' : ''}"></div>
                <div class="marker-card">
                    <div class="marker-source">${d.city}</div>
                    <div class="marker-title">
                        ${isMulti ? `<strong>${count} Noticias</strong><br><span style='font-size:0.8em'>${sourceText}</span>` : d.articles[0].title}
                    </div>
                </div>
            `;
            el.onclick = e => { e.stopPropagation(); openReader(d.articles); };
            return el;
        })
        .showAtmosphere(true)
        .atmosphereColor('lightskyblue')
        .atmosphereAltitude(0.15)
        .onGlobeClick(() => closeArticle());

    // Clouds
    const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(world.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: cloudTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    world.scene().add(clouds);
    // Lighting
    const scene = world.scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.copy(sunDir);
    scene.add(sun);
    // Animate clouds
    (function animate() {
        clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
        requestAnimationFrame(animate);
    })();
    lucide.createIcons();
}

// Cloud constants
const CLOUDS_ALT = 0.004;
const CLOUDS_ROTATION_SPEED = 0.006;

// Chatbot UI
const chatbotClose = document.getElementById('chatbotClose');
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotWindow = document.getElementById('chatbotWindow');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMessages = document.getElementById('chatMessages');

function toggleChat() {
    chatbotWindow.classList.toggle('open');
}
chatbotToggle.addEventListener('click', toggleChat);
chatbotClose.addEventListener('click', toggleChat);

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleSend() {
    const txt = chatInput.value.trim();
    if (!txt) return;
    addMessage(txt, 'user');
    chatInput.value = '';
    setTimeout(() => {
        const responses = [
            'Entiendo. ¿Te gustaría saber más sobre esa noticia?',
            'Puedo buscar más información en los periódicos españoles.',
            'Ese es un tema interesante. Aquí tienes un resumen...',
            'Lo siento, solo soy una interfaz de demostración por ahora.'
        ];
        addMessage(responses[Math.floor(Math.random() * responses.length)], 'bot');
    }, 1000);
}
chatSend.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });

// View Switching Logic
const viewGlobeBtn = document.getElementById('viewGlobe');
const viewTimelineBtn = document.getElementById('viewTimeline');
const globeViz = document.getElementById('globeViz');
const leftPanel = document.querySelector('.left-panel');
const timelineSection = document.getElementById('timelineSection');
const calendarContainer = document.querySelector('.calendar-container');
const topicSelectContainer = document.querySelector('.topic-select');
const newsListContainer = document.querySelector('.news-list');

function switchToTimeline() {
    viewGlobeBtn.classList.remove('active');
    viewTimelineBtn.classList.add('active');

    // Show only the necessary parts of the left panel (topic selection)
    globeViz.style.display = 'none';
    calendarContainer.style.display = 'none';
    newsListContainer.style.display = 'none';
    leftPanel.style.display = 'flex'; // Keep shared filters visible

    // Show timeline section
    timelineSection.style.display = 'flex';

    fetchMacros();
    updateTimelineView();
}

function switchToGlobe() {
    viewTimelineBtn.classList.remove('active');
    viewGlobeBtn.classList.add('active');

    // Restore full left panel
    globeViz.style.display = 'block';
    leftPanel.style.display = 'flex';
    calendarContainer.style.display = 'block';
    newsListContainer.style.display = 'block';

    // Hide timeline section
    timelineSection.style.display = 'none';
}

// Add null checks for removed elements
if (viewTimelineBtn) viewTimelineBtn.addEventListener('click', switchToTimeline);
if (viewGlobeBtn) viewGlobeBtn.addEventListener('click', switchToGlobe);

// Timeline State Management
let currentMacro = null;
let timelineZoom = 300; // Default

function scrollToEnd() {
    const container = document.querySelector('.timeline-track-container');
    if (container) {
        // Use timeout to ensure DOM is rendered
        setTimeout(() => {
            container.scrollLeft = container.scrollWidth;
        }, 100);
    }
}

// Zoom Control
const zoomSlider = document.getElementById('timelineZoom');
const timelineTrack = document.querySelector('.timeline-track-container');

if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
        timelineZoom = parseInt(e.target.value);
        document.documentElement.style.setProperty('--timeline-item-width', `${timelineZoom}px`);
        updateTimelineView();
    });
}

// Wheel Zoom & Horizontal Scroll bridge
if (timelineTrack) {
    timelineTrack.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            // CTRL + Wheel = Zoom
            e.preventDefault();
            const delta = e.deltaY > 0 ? -50 : 50;
            const newVal = Math.min(600, Math.max(100, timelineZoom + delta));
            if (newVal !== timelineZoom) {
                timelineZoom = newVal;
                if (zoomSlider) zoomSlider.value = timelineZoom;
                document.documentElement.style.setProperty('--timeline-item-width', `${timelineZoom}px`);
                updateTimelineView();
            }
        } else {
            // Normal Wheel = Horizontal Scroll
            e.preventDefault();
            timelineTrack.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}

function updateTimelineView() {
    if (timelineZoom < 200) {
        renderMacroTimeline();
    } else {
        if (currentMacro) {
            renderHechoTimeline(currentMacro);
        } else {
            // If no macro selected and zooming in, show message or all macros still?
            // Better: keep showing macros but with a prompt
            renderMacroTimeline();
        }
    }
}

async function renderMacroTimeline() {
    const list = document.getElementById('timelineList');
    // Using a simple flag to avoid double fetching every time we move the slider,
    // but only if the list already has items.
    if (list.dataset.view === 'macros' && list.children.length > 0) return;

    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando procesos globales...</p></div>';
    list.dataset.view = 'macros';

    try {
        const url = selectedTopic
            ? `/api/macros/timeline?topic=${encodeURIComponent(selectedTopic)}`
            : '/api/macros/timeline';
        const res = await fetch(url);
        const macros = await res.json();

        list.innerHTML = '';
        macros.forEach((m, index) => {
            const item = document.createElement('div');
            item.className = 'timeline-item macro-item';
            item.innerHTML = `
                <div class="timeline-content">
                    <span class="timeline-tag">MACRO-PROCESO</span>
                    <div class="timeline-date">${m.date || 'Sin fecha registrada'}</div>
                    <div class="timeline-title">${m.nombre}</div>
                    <button class="macro-enter-btn">Entrar al detalle <i data-lucide="zoom-in"></i></button>
                </div>
            `;
            item.onclick = () => {
                currentMacro = m.nombre;
                const macroSelect = document.getElementById('macroSelect');
                macroSelect.value = m.nombre;
                // Auto zoom-in when clicking a macro
                zoomSlider.value = 350;
                timelineZoom = 350;
                document.documentElement.style.setProperty('--timeline-item-width', '350px');
                updateTimelineView();
            };
            list.appendChild(item);
        });
        if (window.lucide) lucide.createIcons();
        scrollToEnd();
    } catch (e) {
        console.error('Error fetching global timeline:', e);
    }
}

async function renderHechoTimeline(macroName) {
    const list = document.getElementById('timelineList');
    // Only fetch if view changed or macro changed
    if (list.dataset.view === 'hechos' && list.dataset.activeMacro === macroName) return;

    list.dataset.view = 'hechos';
    list.dataset.activeMacro = macroName;
    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando hitos del evento...</p></div>';

    try {
        const res = await fetch(`/api/timeline/${encodeURIComponent(macroName)}?t=${Date.now()}`);
        const hechos = await res.json();

        list.innerHTML = '';
        if (hechos.length === 0) {
            list.innerHTML = '<p class="empty-state">No hay hechos registrados para este evento.</p>';
            return;
        }

        hechos.forEach((h, index) => {
            const item = document.createElement('div');
            item.className = 'timeline-item hecho-item';
            item.innerHTML = `
                <div class="timeline-content">
                    <span class="timeline-tag">HITO #${index + 1}</span>
                    <div class="timeline-date">${h.date || 'Fecha pendiente'}</div>
                    <div class="timeline-title">${h.id}</div>
                </div>
            `;
            item.onclick = () => openComparison(h);
            list.appendChild(item);
        });
        scrollToEnd();
    } catch (e) {
        console.error('Error fetching hechos:', e);
    }
}

// Override old functions to use the new zoom-aware logic
async function fetchMacros() {
    const macroSelect = document.getElementById('macroSelect');
    if (macroSelect.options.length > 1) return; // Already fetched

    try {
        const res = await fetch(`/api/macros?t=${Date.now()}`);
        const macros = await res.json();
        macros.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.nombre;
            opt.textContent = m.nombre;
            macroSelect.appendChild(opt);
        });

        // Initial view
        updateTimelineView();
    } catch (e) {
        console.error('Error fetching macros:', e);
    }
}

document.getElementById('macroSelect').addEventListener('change', (e) => {
    currentMacro = e.target.value;
    if (currentMacro) {
        // Switch to hecho view manually if a macro is selected
        if (timelineZoom < 200) {
            zoomSlider.value = 350;
            timelineZoom = 350;
            document.documentElement.style.setProperty('--timeline-item-width', '350px');
        }
        updateTimelineView();
    } else {
        updateTimelineView();
    }
});

// Comparison Panel Logic
const comparisonPanel = document.getElementById('comparisonPanel');
const colElPais = document.querySelector('#colElPais .column-content');
const colElMundo = document.querySelector('#colElMundo .column-content');

async function openComparison(hecho) {
    document.getElementById('comparisonEventTitle').textContent = hecho.id;
    document.getElementById('comparisonEventDate').textContent = hecho.date;

    colElPais.innerHTML = '<div class="spinner"></div>';
    colElMundo.innerHTML = '<div class="spinner"></div>';
    comparisonPanel.classList.add('open');

    try {
        const res = await fetch(`/api/hecho/${encodeURIComponent(hecho.id)}/articles?t=${Date.now()}`);
        const articles = await res.json();

        colElPais.innerHTML = '';
        colElMundo.innerHTML = '';

        const paisArts = articles.filter(a => a.medio.toLowerCase().includes('país'));
        const mundoArts = articles.filter(a => a.medio.toLowerCase().includes('mundo'));

        const paisLogo = 'https://upload.wikimedia.org/wikipedia/commons/e/e0/El_Pa%C3%ADs_logo.svg';
        const mundoLogo = 'https://upload.wikimedia.org/wikipedia/commons/9/90/El_Mundo_logo.svg';

        if (paisArts.length === 0) {
            colElPais.innerHTML = '<p class="empty-state">No hay artículos de El País para este hecho.</p>';
        } else {
            const header = document.createElement('div');
            header.className = 'newspaper-header';
            header.innerHTML = `<img src="${paisLogo}" alt="El País">`;
            colElPais.appendChild(header);
            paisArts.forEach(a => colElPais.appendChild(createCompArticle(a)));
        }

        if (mundoArts.length === 0) {
            colElMundo.innerHTML = '<p class="empty-state">No hay artículos de El Mundo para este hecho.</p>';
        } else {
            const header = document.createElement('div');
            header.className = 'newspaper-header';
            header.innerHTML = `<img src="${mundoLogo}" alt="El Mundo">`;
            colElMundo.appendChild(header);
            mundoArts.forEach(a => colElMundo.appendChild(createCompArticle(a)));
        }

    } catch (e) {
        console.error('Error fetching comparison:', e);
    }
}

function createCompArticle(a) {
    const div = document.createElement('div');
    div.className = 'comp-article';
    div.innerHTML = `
        <h4>${a.titulo}</h4>
        <p>${a.summary}</p>
        <a href="${a.link}" target="_blank" class="read-more">Ver en el medio original <i data-lucide="external-link" style="width:14px;vertical-align:middle;"></i></a>
    `;
    return div;
}

function closeComparison() {
    comparisonPanel.classList.remove('open');
}

// =========================================
// PRISMA 3D LOGIC
// =========================================

// Prisma State - Defined globally at top of file
// (currentPrismaFace, prismaHechos, currentHechoIndex, isPrismaNavigating)

// DOM Elements
const prismaSection = document.getElementById('prismaSection');
const prisma3d = document.getElementById('prisma3d');
const viewPrismaBtn = document.getElementById('viewPrisma');
const prismaNavLeft = document.getElementById('prismaNavLeft');
const prismaNavRight = document.getElementById('prismaNavRight');

// Rotation angles - use cumulative rotation to avoid "long way around"
let prismaRotation = 0;  // Current cumulative rotation in degrees
let prismaRadius = 112; // Default, updated dynamically

function updatePrismaGeometry() {
    const container = document.querySelector('.prisma-container');
    if (!container) return;

    // Get actual width - on mobile this will be the phone screen width (~390px)
    const width = container.offsetWidth;

    // Calculate Apothem (distance from center to face) for equilateral triangle
    // r = width / (2 * tan(60)) = width / 3.464
    let r = Math.round(width / 3.464);

    // FAILSAFE: Ensure radius is never 0 or too small (default to ~90px for safe mobile 3D)
    // If r is too small, the faces will collapse onto each other.
    if (r < 90) r = 90;

    prismaRadius = r;

    // Apply to container as CSS variable for styles.css to use
    container.style.setProperty('--prisma-tz', `${r}px`);
    // Also set width variable for faces to match calculation
    container.style.setProperty('--prisma-width', `${Math.round(width)}px`);

    console.log(`📐 Prisma Geometry Updated: EffWidth=${width}px, Radius=${r}px`);
}

// Call on resize and init
window.addEventListener('resize', () => {
    setTimeout(updatePrismaGeometry, 100);
});

// Invalidate side faces to force reload on next rotation (Sync Logic)
function invalidatePrismaSideFaces() {
    // Only clear if we are in phone mode (Desktop handles its own sync)
    if (prismaMode !== 'phone') return;

    const colPais = document.querySelector('#prismaColPais .col-articles');
    const colMundo = document.querySelector('#prismaColMundo .col-articles');
    if (colPais) colPais.innerHTML = '<div class="spinner"></div>';
    if (colMundo) colMundo.innerHTML = '<div class="spinner"></div>';

    const timeline = document.getElementById('verticalTimeline');
    if (timeline) timeline.innerHTML = '<div class="spinner"></div>';
}

function rotatePrismaTo(faceIndex) {
    const prisma = document.querySelector('.prisma');
    if (!prisma) return;

    // Add rotating class for depth effect
    prisma.classList.add('rotating');

    // Ensure transition is ON (drag might have turned it off)
    prisma.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';

    currentPrismaFace = faceIndex;
    const targetAngle = -faceIndex * 120;

    // Smooth cumulative rotation (taking the shortest path)
    const currentAngle = prismaRotation;
    const diff = ((targetAngle - currentAngle) % 360 + 540) % 360 - 180;
    prismaRotation += diff;

    // Apply 3D rotation (Enabled for ALL devices now)
    // We translateZ(-radius) to push the axis back, so the active face (at +radius) is at Z=0 (screen plane)
    prisma.style.transform = `translateZ(-${prismaRadius}px) rotateY(${prismaRotation}deg)`;

    // Update active face class (for phone mode visibility/logic)
    const normalizedIndex = ((faceIndex % 3) + 3) % 3;
    document.querySelectorAll('.face-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === normalizedIndex);
    });

    // Remove legacy slide classes (cleaning up just in case)
    const faces = document.querySelectorAll('.prisma-face');
    faces.forEach((face, idx) => {
        face.classList.remove('active', 'slide-left', 'slide-right');
        if (idx === normalizedIndex) face.classList.add('active');
    });

    // Remove rotating class after transition
    setTimeout(() => {
        prisma.classList.remove('rotating');
    }, 600); // Match CSS transition duration

    // Load data for specific face if needed (AVOID RELOADING if already visible)
    // We check if the content is actually empty or if we switched faces
    const isComparisonFace = normalizedIndex === 0;
    const isTimelineFace = normalizedIndex === 2;

    // Simple check: Only load if the face container is empty or we explicitly switched context
    // Ideally we would track 'lastLoadedFace', but checking innerHTML emptiness is robust enough for now
    if (isComparisonFace) {
        const colPais = document.querySelector('#prismaColPais .col-articles');
        // Only load if empty or if we really need to refresh (which usually happens via other triggers)
        // For pure rotation snapping, we skip if already populated.
        if (colPais && (!colPais.children.length || colPais.querySelector('.spinner'))) {
            loadPrismaComparison(prismaHechos[currentHechoIndex]);
        }
    } else if (isTimelineFace) {
        const timeline = document.getElementById('verticalTimeline');
        if (timeline && (!timeline.children.length || timeline.querySelector('.spinner'))) {
            loadPrismaMacroTimeline();
        }
    }
}

function rotatePrismaLeft() {
    rotatePrismaTo(currentPrismaFace - 1);
}

function rotatePrismaRight() {
    rotatePrismaTo(currentPrismaFace + 1);
}



// Fetch recent hechos for prisma events face
async function fetchPrismaHechos() {
    console.log('🔸 fetchPrismaHechos called');
    try {
        const res = await fetch(`/api/hechos/recent?t=${Date.now()}`);
        console.log('🔸 API response status:', res.status);
        if (!res.ok) throw new Error('Failed to fetch hechos');
        prismaHechos = await res.json();
        console.log('🔸 prismaHechos loaded:', prismaHechos.length, 'items');

        if (prismaHechos.length > 0) {
            currentHechoIndex = 0;
            renderPrismaEvents(prismaHechos);
            updateMiniGlobePosition(0);

            // SYNC DESKTOP MODE - Critical for default Desktop view
            console.log('🔸 prismaMode is:', prismaMode);
            if (prismaMode === 'desktop') {
                console.log('🔸 Calling syncDesktopPanels...');
                syncDesktopPanels();
                focusDesktopPanel(desktopFocusIndex);
            } else if (prismaMode === 'phone') {
                // Force "Events" face (Face 1) active on load to avoid black screen
                setTimeout(() => rotatePrismaTo(1), 100);
            }

            // If we are already on a specific face, reload it now that we have data
            if (currentPrismaFace === 1) {
                // Face 1 is Events, which we just rendered via renderPrismaEvents called above
                // Ensure it is rotated to
                rotatePrismaTo(1);
            } else if (currentPrismaFace === 2) {
                loadPrismaMacroTimeline();
            } else if (currentPrismaFace === 0) {
                loadPrismaComparison(prismaHechos[0]);
            }
        } else {
            document.getElementById('eventsContainer').innerHTML =
                '<div class="event-card"><h3>No hay eventos disponibles</h3><p>No se encontraron hechos con cobertura de ambos medios.</p></div>';
        }
    } catch (e) {
        console.error('Error fetching prisma hechos:', e);
    }
}

function renderPrismaEvents(hechos) {
    const container = document.getElementById('eventsContainer');
    if (!container) return;

    container.innerHTML = hechos.map((h, index) => `
        <div class="event-card ${index === currentHechoIndex ? 'active' : ''}" data-index="${index}">
            <h3>${h.id}</h3>
            <p>${h.text}</p>
            <div class="event-date">${h.date || ''}</div>
        </div>
    `).join('');

    // Scroll detection - remove old to prevent duplicates
    container.removeEventListener('scroll', handlePrismaEventsScroll);
    container.addEventListener('scroll', handlePrismaEventsScroll);

    // Initial header
    updatePrismaEventHeader(0);
}

function handlePrismaEventsScroll() {
    if (isPrismaNavigating) return; // Don't trigger updates during purposeful navigation

    const container = document.getElementById('eventsContainer');
    if (!container) return;

    const cards = container.querySelectorAll('.event-card');
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;

        // Dynamic scaling/opacity based on distance to center
        const distanceFromCenter = Math.abs(containerCenter - cardCenter);
        const threshold = rect.height / 2;

        if (distanceFromCenter < threshold) {
            card.classList.add('active');
            if (currentHechoIndex !== index) {
                currentHechoIndex = index;
                updatePrismaEventHeader(index);
                updateTimelineActiveNode(prismaHechos[index]?.id);
                updateMiniGlobePosition(index);

                // CRITICAL: Invalidate other faces in Phone Mode
                invalidatePrismaSideFaces();
            }
        } else {
            card.classList.remove('active');
        }
    });
}

function updateMiniGlobePosition(index) {
    if (!miniGlobeViz || !prismaHechos[index]) return;

    const hecho = prismaHechos[index];
    const text = (hecho.text || '').toLowerCase();
    const macro = (hecho.macroevento || '').toLowerCase();
    const combined = text + ' ' + macro;

    // Determine location based on keywords in macroevento or text
    let lat = 40.4168, lng = -3.7038, locationName = "ESPAÑA";

    // Sudán
    if (combined.includes('sudán') || combined.includes('sudan') || combined.includes('jartum') || combined.includes('khartoum')) {
        lat = 15.8575; lng = 30.2176; locationName = "SUDÁN";
    }
    // Israel-Hamas / Gaza / Middle East
    else if (combined.includes('israel') || combined.includes('hamas') || combined.includes('gaza') || combined.includes('palestin')) {
        lat = 31.5; lng = 34.8; locationName = "ORIENTE MEDIO";
    }
    // DANA / Valencia / Este de España
    else if (combined.includes('dana') || combined.includes('valencia') || combined.includes('inundacion')) {
        lat = 39.4699; lng = -0.3763; locationName = "VALENCIA";
    }
    // Europa
    else if (combined.includes('europa') || combined.includes('bruselas') || combined.includes('paris') || combined.includes('berlin')) {
        lat = 48.8566; lng = 2.3522; locationName = "EUROPA";
    }
    // USA
    else if (combined.includes('trump') || combined.includes('biden') || combined.includes('eeuu') || combined.includes('estados unidos') || combined.includes('washington')) {
        lat = 38.9072; lng = -77.0369; locationName = "EEUU";
    }
    // Ucrania / Rusia
    else if (combined.includes('ucrania') || combined.includes('rusia') || combined.includes('putin') || combined.includes('zelensky')) {
        lat = 50.4501; lng = 30.5234; locationName = "UCRANIA";
    }

    // Update marker data
    miniGlobeViz.htmlElementsData([{ lat, lng, name: locationName }]);

    // Rotate to focus on location with smooth animation
    miniGlobeViz.pointOfView({ lat, lng, alt: 0.5 }, 1000);
}

function updateTimelineActiveNode(hechoId) {
    if (!hechoId) return;
    const nodes = document.querySelectorAll('.timeline-node');
    nodes.forEach(node => {
        const nodeTitle = node.querySelector('h4')?.textContent;
        node.classList.toggle('active', nodeTitle === hechoId);
    });
}



function updatePrismaEventHeader(index) {
    if (index < 0 || index >= prismaHechos.length) return;

    const h = prismaHechos[index];
    const titleEl = document.getElementById('currentEventTitle');
    const dateEl = document.getElementById('currentEventDate');

    // Show Macro Event name in the header title as requested
    if (titleEl) titleEl.textContent = h.macroevento || 'Evento';
    if (dateEl) dateEl.textContent = h.date || '';
}

// Load articles for comparison face
async function loadPrismaComparison(hecho) {
    if (!hecho) return;

    const titleEl = document.getElementById('comparisonTitle');
    if (titleEl) titleEl.textContent = hecho.id;

    const colPais = document.getElementById('prismaColPais');
    const colMundo = document.getElementById('prismaColMundo');
    const colPaisArticles = document.querySelector('#prismaColPais .col-articles');
    const colMundoArticles = document.querySelector('#prismaColMundo .col-articles');

    // Reset visibility
    if (colPais) colPais.style.display = 'flex';
    if (colMundo) colMundo.style.display = 'flex';

    if (colPaisArticles) colPaisArticles.innerHTML = '<div class="spinner"></div>';
    if (colMundoArticles) colMundoArticles.innerHTML = '<div class="spinner"></div>';

    try {
        const res = await fetch(`/api/hecho/${encodeURIComponent(hecho.id)}/articles?t=${Date.now()}`);
        const articles = await res.json();

        const paisArts = articles.filter(a => a.medio.toLowerCase().includes('país'));
        const mundoArts = articles.filter(a => a.medio.toLowerCase().includes('mundo'));

        const hasPais = paisArts.length > 0;
        const hasMundo = mundoArts.length > 0;

        // Show/hide columns based on availability
        if (colPais) colPais.style.display = hasPais ? 'flex' : 'none';
        if (colMundo) colMundo.style.display = hasMundo ? 'flex' : 'none';

        // Render El País articles
        if (colPaisArticles && hasPais) {
            colPaisArticles.innerHTML = '';
            paisArts.forEach(a => {
                const article = document.createElement('div');
                article.className = 'prisma-article';
                article.innerHTML = `
                    <h4>${a.titulo}</h4>
                    <p>${a.summary || ''}</p>
                `;
                article.onclick = () => window.open(a.link, '_blank');
                colPaisArticles.appendChild(article);
            });
        }

        // Render El Mundo articles
        if (colMundoArticles && hasMundo) {
            colMundoArticles.innerHTML = '';
            mundoArts.forEach(a => {
                const article = document.createElement('div');
                article.className = 'prisma-article';
                article.innerHTML = `
                    <h4>${a.titulo}</h4>
                    <p>${a.summary || ''}</p>
                `;
                article.onclick = () => window.open(a.link, '_blank');
                colMundoArticles.appendChild(article);
            });
        }

        // If neither has articles - should not happen but handle gracefully
        if (!hasPais && !hasMundo) {
            if (colPais) {
                colPais.style.display = 'flex';
                colPaisArticles.innerHTML = '<p style="text-align:center;opacity:0.5;padding:20px;">Sin artículos disponibles</p>';
            }
        }
    } catch (e) {
        console.error('Error loading comparison:', e);
    }
}

// Load macro timeline for timeline face
async function loadPrismaMacroTimeline() {
    // If no data yet, show loading state
    if (prismaHechos.length === 0) {
        const timeline = document.getElementById('verticalTimeline');
        if (timeline) {
            timeline.innerHTML = '<div class="spinner" style="margin:50px auto;"></div><p style="text-align:center;opacity:0.5;margin-top:10px;">Cargando datos...</p>';
        }
        return;
    }

    const currentHecho = prismaHechos[currentHechoIndex];
    const macroName = currentHecho?.macroevento;

    const titleEl = document.getElementById('timelineMacroTitle');
    if (titleEl) titleEl.textContent = macroName || 'Línea Temporal';

    const timeline = document.getElementById('verticalTimeline');
    if (!timeline) return;

    timeline.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';

    try {
        if (!macroName || macroName === 'Sin clasificar') {
            // Just show the current hechos as the timeline
            renderVerticalTimeline(prismaHechos, currentHechoIndex);
            return;
        }

        const res = await fetch(`/api/timeline/${encodeURIComponent(macroName)}?t=${Date.now()}`);
        const hechos = await res.json();

        // Find current hecho index in this list
        const currentIdxInTimeline = hechos.findIndex(h => h.id === currentHecho.id);
        renderVerticalTimeline(hechos, currentIdxInTimeline >= 0 ? currentIdxInTimeline : 0);
    } catch (e) {
        console.error('Error loading macro timeline:', e);
        timeline.innerHTML = '<p style="text-align:center;opacity:0.5;">Error cargando timeline</p>';
    }
}

function renderVerticalTimeline(hechos, activeIndex) {
    const timeline = document.getElementById('verticalTimeline');
    if (!timeline) return;

    timeline.innerHTML = '';

    // Backend now returns DESC order (most recent first)
    // No need to reverse anymore

    hechos.forEach((h, index) => {
        const node = document.createElement('div');
        node.className = 'timeline-node' + (index === activeIndex ? ' active' : '');
        node.innerHTML = `
            <div class="timeline-node-content">
                <h4>${h.id}</h4>
                <span>${h.date || ''}</span>
            </div>
        `;
        node.onclick = async (e) => {
            e.stopPropagation();

            // Highlight this node immediately
            document.querySelectorAll('.timeline-node').forEach(n => n.classList.remove('active'));
            node.classList.add('active');

            // Find current match
            let prismaMatchIndex = prismaHechos.findIndex(ph => ph.id === h.id);

            // FETCH CONTEXT: Get other events from the same date to allow scrolling context
            if (h.date) {
                try {
                    const res = await fetch(`/api/hechos/by-date/${h.date}?t=${Date.now()}`);
                    const contextHechos = await res.json();

                    // Merge context hechos avoiding duplicates
                    contextHechos.forEach(ch => {
                        if (!prismaHechos.some(ph => ph.id === ch.id)) {
                            prismaHechos.push(ch);
                        }
                    });

                    // Sort by date descending to maintain timeline order
                    prismaHechos.sort((a, b) => new Date(b.date) - new Date(a.date));

                    // Re-render feed so the context is physically there for scrolling
                    renderPrismaEvents(prismaHechos);

                    // Re-calculate index as it might have moved or been newly added
                    prismaMatchIndex = prismaHechos.findIndex(ph => ph.id === h.id);
                } catch (err) {
                    console.error('Error fetching contextual events:', err);
                }
            }


            // If not found, inject it dynamically to the current feed
            if (prismaMatchIndex < 0) {
                console.log('Event not in feed, injecting dynamically:', h.id);
                // We create a full hecho object from the timeline node data
                const newHecho = {
                    id: h.id,
                    date: h.date,
                    text: h.text || 'Descripción no disponible',
                    macroevento: document.getElementById('timelineMacroTitle')?.textContent || 'Evento',
                    newspapers: [] // Will be loaded dynamically if needed
                };
                prismaHechos.push(newHecho);
                renderPrismaEvents(prismaHechos); // Re-render feed to include new card
                prismaMatchIndex = prismaHechos.length - 1;
            }

            if (prismaMatchIndex >= 0) {
                isPrismaNavigating = true;
                currentHechoIndex = prismaMatchIndex;
                updatePrismaEventHeader(currentHechoIndex);

                // CRITICAL: Invalidate other faces when selecting from timeline
                invalidatePrismaSideFaces();

                // Rotate to events view (Face 1)
                rotatePrismaTo(1);

                // Scroll to target card in Face 1 (with enough delay for 3D transition)
                setTimeout(() => {
                    const container = document.getElementById('eventsContainer');
                    const cards = container?.querySelectorAll('.event-card');
                    const card = container?.querySelector(`[data-index="${currentHechoIndex}"]`);

                    if (card && container) {
                        // Clear all active first and set the target one
                        cards.forEach(c => c.classList.remove('active'));
                        card.classList.add('active');

                        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        console.log('Scrolled to card index:', currentHechoIndex);
                    }

                    // Reset flag after transition finishes
                    setTimeout(() => {
                        isPrismaNavigating = false;
                        console.log('Navigation lock released');
                    }, 1200);
                }, 700);
            }
        };
        timeline.appendChild(node);
    });

    // Scroll to active node
    setTimeout(() => {
        const activeNode = timeline.querySelector('.timeline-node.active');
        if (activeNode) {
            activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function initMiniGlobe() {
    const container = document.getElementById('miniGlobe');
    if (!container || miniGlobeViz) return;

    container.innerHTML = '';

    // Default marker location (Madrid/Spain)
    const defaultMarker = [{ lat: 40.4168, lng: -3.7038, name: "ESPAÑA" }];

    // Mobile-responsive globe size - uses container width for phone simulator
    const isPhoneSimulator = document.querySelector('.phone-screen');
    const isMobile = window.innerWidth <= 480;

    let globeSize;
    if (isPhoneSimulator) {
        // Use 92% of container width for immersive view
        const containerWidth = container.parentElement?.offsetWidth || 390;
        globeSize = Math.floor(containerWidth * 0.92);
    } else {
        globeSize = isMobile ? 120 : 320;
    }

    miniGlobeViz = Globe()
        (container)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('./img/earth-blue-marble.jpg')
        .bumpImageUrl('./img/earth-topology.png')
        .width(globeSize)
        .height(globeSize)
        .showAtmosphere(true)
        .atmosphereColor('lightskyblue')
        .atmosphereAltitude(0.15)
        // Pulsing markers
        .htmlElementsData(defaultMarker)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlElement(d => {
            const el = document.createElement('div');
            el.className = 'mini-globe-marker';
            el.innerHTML = `<div class="marker-dot pulse"></div>`;
            return el;
        });

    // Add clouds with delay
    setTimeout(() => {
        // Correct texture path: earth-clouds.png
        const cloudTexture = new THREE.TextureLoader().load(`./img/earth-clouds.png?t=${Date.now()}`);
        const radius = miniGlobeViz.getGlobeRadius() || 100;
        const cloudGeo = new THREE.SphereGeometry(radius * 1.01, 48, 48);
        const cloudMat = new THREE.MeshPhongMaterial({ map: cloudTexture, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
        const clouds = new THREE.Mesh(cloudGeo, cloudMat);
        miniGlobeViz.scene().add(clouds);

        miniGlobeViz.scene().add(new THREE.AmbientLight(0xffffff, 0.7));
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(1, 0.5, 1);
        miniGlobeViz.scene().add(sun);

        (function animateClouds() {
            clouds.rotation.y += 0.0003;
            requestAnimationFrame(animateClouds);
        })();
    }, 300);

    miniGlobeViz.controls().enableZoom = false;
    miniGlobeViz.controls().autoRotate = true;
    miniGlobeViz.controls().autoRotateSpeed = 0.3;
    // Increase sensitivity for "lighter" feel
    miniGlobeViz.controls().rotateSpeed = 3.5;
    miniGlobeViz.pointOfView({ lat: 40.4168, lng: -3.7038, alt: 0.5 });
}

// View Switching - Add Prisma
function switchToPrisma() {
    viewGlobeBtn.classList.remove('active');
    viewTimelineBtn.classList.remove('active');
    viewPrismaBtn.classList.add('active');

    // Hide other views
    globeViz.style.display = 'none';
    timelineSection.style.display = 'none';
    leftPanel.style.display = 'none';

    // Hide chatbot to prevent blocking right nav button
    const chatbotContainer = document.querySelector('.chatbot-container');
    if (chatbotContainer) chatbotContainer.style.display = 'none';

    // Show prisma
    prismaSection.style.display = 'block';

    // Initialize prisma data
    if (prismaHechos.length === 0) {
        fetchPrismaHechos();
    }

    // Initialize mini globe
    initMiniGlobe();

    // Reinitialize icons
    if (window.lucide) lucide.createIcons();
}

// Update switchToGlobe to handle Prisma
function switchToGlobeFromPrisma() {
    viewPrismaBtn.classList.remove('active');
    prismaSection.style.display = 'none';
    // Restore chatbot
    const chatbotContainer = document.querySelector('.chatbot-container');
    if (chatbotContainer) chatbotContainer.style.display = 'flex';
    switchToGlobe();
}

function switchToTimelineFromPrisma() {
    viewPrismaBtn.classList.remove('active');
    prismaSection.style.display = 'none';
    // Restore chatbot
    const chatbotContainer = document.querySelector('.chatbot-container');
    if (chatbotContainer) chatbotContainer.style.display = 'flex';
    switchToTimeline();
}

// Initialize Prisma event listeners
function initPrisma() {
    console.log('🔷 initPrisma called');
    console.log('  prismaNavLeft:', prismaNavLeft);
    console.log('  prismaNavRight:', prismaNavRight);

    // Navigation buttons
    if (prismaNavLeft) {
        prismaNavLeft.addEventListener('click', (e) => {
            console.log('⬅️ Left button clicked');
            e.stopPropagation();
            rotatePrismaLeft();
        });
    }
    if (prismaNavRight) {
        prismaNavRight.addEventListener('click', (e) => {
            console.log('➡️ Right button clicked');
            e.stopPropagation();
            rotatePrismaRight();
        });
    }

    // --- 1:1 DIRECT TOUCH MANIPULATION (AXIS-LOCKED V3.1) ---
    // Solves "Scroll vs Rotate" + "Globe Block" by using explicit state flags.
    const prismaContainer = document.querySelector('.prisma-container');
    const prisma = document.querySelector('.prisma');

    let touchStartX = 0;
    let touchStartY = 0;
    let currentRotationAtStart = 0;
    let startFaceIndex = 0;

    // State Flags
    let isDragging = false;
    let isScrolling = false; // Vertical scroll lock
    let isIgnoreInteraction = false; // Locked out (e.g. globe)

    if (prismaContainer && prisma) {
        prismaContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;

            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;

            // TRACKING START
            currentRotationAtStart = prismaRotation;
            startFaceIndex = currentPrismaFace;

            // RESET ALL FLAGS
            isDragging = false;
            isScrolling = false;
            isIgnoreInteraction = false;

            // ROBUST HIT TESTING (Raycast)
            // We use elementFromPoint to find exactly what is under the finger, 
            // bypassing potential event targeting issues on 3D elements.
            const actualTarget = document.elementFromPoint(touch.clientX, touch.clientY);

            let prefersScroll = false;
            if (actualTarget) {
                // HARD IGNORE GLOBE (Always native)
                if (actualTarget.closest('#miniGlobe') ||
                    actualTarget.closest('.mini-globe-wrapper') ||
                    actualTarget.tagName === 'CANVAS') {
                    isIgnoreInteraction = true;
                    return;
                }

                // PREFER SCROLL ON CONTENT (Be more lenient with verticality)
                if (actualTarget.closest('.prisma-face') ||
                    actualTarget.closest('.events-scroll-container') ||
                    actualTarget.closest('.vertical-timeline') ||
                    actualTarget.closest('.comparison-col')) {
                    prefersScroll = true;
                }
            }

            // Track state on start
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            currentRotationAtStart = prismaRotation;
            startFaceIndex = currentPrismaFace;
            prismaContainer.dataset.prefersScroll = prefersScroll;

            // Do NOT disable transition yet. Wait until we confirm horizontal drag.
        }, { passive: true });

        prismaContainer.addEventListener('touchmove', (e) => {
            // STRICT GATES
            if (isIgnoreInteraction) return; // Globe is active, do nothing
            if (isScrolling) return; // Vertical scroll is active, let browser handle it

            const touch = e.touches[0];
            const diffX = touch.clientX - touchStartX;
            const diffY = touch.clientY - touchStartY;

            const prefersScroll = prismaContainer.dataset.prefersScroll === 'true';

            // Axis Locking Logic (First Move Decision)
            if (!isDragging) {
                const absX = Math.abs(diffX);
                const absY = Math.abs(diffY);
                const totalDist = Math.sqrt(absX * absX + absY * absY);

                if (totalDist < 5) return;

                // Priority to Vertical Scroll
                // If touching content, we are extremely lenient (absY > absX * 0.5)
                const scrollBias = prefersScroll ? 0.5 : 1.0;
                if (absY > absX * scrollBias) {
                    isScrolling = true;
                    isIgnoreInteraction = true;
                    return;
                }

                // If moving horizontally (Must exceed threshold)
                // If touching content, we require a larger move to avoid accidental swipes
                const swipeThreshold = prefersScroll ? 30 : 10;
                if (absX > swipeThreshold) {
                    isDragging = true;
                    prisma.style.transition = 'none';
                }
            }

            // ACTUAL DRAG LOGIC
            if (isDragging) {
                // We are controlling rotation. Prevent browser navigation/scroll.
                if (e.cancelable) e.preventDefault();

                // VISUAL PHYSICS:
                // Swipe Left (diffX < 0) -> Content moves Left -> Rotation DECREASES (CW)
                // Swipe Right (diffX > 0) -> Content moves Right -> Rotation INCREASES (CCW)
                const rotationDelta = diffX * 0.4;
                const newRotation = currentRotationAtStart + rotationDelta;

                prisma.style.transform = `translateZ(-${prismaRadius}px) rotateY(${newRotation}deg)`;
            }
        }, { passive: false }); // passive: false needed for e.preventDefault()

        prismaContainer.addEventListener('touchend', (e) => {
            if (isIgnoreInteraction) {
                isIgnoreInteraction = false;
                return;
            }
            if (isScrolling) {
                isScrolling = false;
                return;
            }

            if (!isDragging) return;

            isDragging = false;

            const diffX = e.changedTouches[0].clientX - touchStartX;

            // Restore animation
            prisma.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';

            let targetIndex = startFaceIndex;

            // SNAP LOGIC
            // Swipe Left (diffX < -60) -> Next Face (index + 1)
            if (diffX < -60) {
                targetIndex = startFaceIndex + 1;
            }
            // Swipe Right (diffX > 60) -> Previous Face (index - 1)
            else if (diffX > 60) {
                targetIndex = startFaceIndex - 1;
            }
            // Else snap back to start

            // Sync global rotation to visual drift to prevent jumping
            prismaRotation = currentRotationAtStart + (diffX * 0.4);

            rotatePrismaTo(targetIndex);
        });

    }

    // Face indicator dot clicks
    document.querySelectorAll('.face-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const face = parseInt(dot.dataset.face);
            rotatePrismaTo(face);
        });
    });

    // View button
    if (viewPrismaBtn) {
        viewPrismaBtn.addEventListener('click', switchToPrisma);
    }

    // Update other view buttons to also hide prisma
    if (viewGlobeBtn) {
        viewGlobeBtn.addEventListener('click', () => {
            if (prismaSection.style.display !== 'none') {
                switchToGlobeFromPrisma();
            }
        });
    }
    if (viewTimelineBtn) {
        viewTimelineBtn.addEventListener('click', () => {
            if (prismaSection.style.display !== 'none') {
                switchToTimelineFromPrisma();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (prismaSection.style.display === 'none') return;

        if (e.key === 'ArrowLeft') rotatePrismaLeft();
        if (e.key === 'ArrowRight') rotatePrismaRight();
    });

    // Mouse wheel support for eventsContainer
    const eventsContainer = document.getElementById('eventsContainer');
    if (eventsContainer) {
        eventsContainer.addEventListener('wheel', (e) => {
            // If on events face, allow wheel to scroll
            if (currentPrismaFace === 0) {
                // Default behavior might be blocked by 3D transforms or parent listeners
                // We'll ensure it scrolls and snaps
                if (Math.abs(e.deltaY) > 10) {
                    const direction = e.deltaY > 0 ? 1 : -1;
                    eventsContainer.scrollBy({
                        top: direction * 400, // Reasonable scroll amount to trigger snap
                        behavior: 'smooth'
                    });
                    e.preventDefault();
                }
            }
        }, { passive: false });
    }
}


// Initialization on page load
window.addEventListener('load', async () => {
    await fetchDates();
    await fetchTopics();

    // Initial news fetch is handled inside fetchDates after setting selectedDate
    if (selectedDate) {
        await fetchNews(selectedDate, selectedTopic);
    } else {
        await fetchNews(null, selectedTopic);
    }

    // Wire calendar navigation buttons
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

    // Initialize Prisma
    initPrisma();

    // Calculate geometry immediately
    updatePrismaGeometry();

    // Set initial active face to 1 (Events/Center) WITHOUT animation for the first frame
    const prisma = document.querySelector('.prisma');
    if (prisma) {
        prisma.style.transition = 'none'; // pivot instantly
        rotatePrismaTo(1);

        // Force reflow
        void prisma.offsetWidth;

        // Restore transition and fade in
        setTimeout(() => {
            prisma.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            prisma.classList.add('loaded'); // Add class to trigger opacity fade-in
        }, 50);
    }

    // Initialize Desktop Mode listeners
    initDesktopMode();

    // Initialize Lucide icons
    if (window.lucide) lucide.createIcons();
});

// =========================================
// PRISMA DESKTOP MODE
// =========================================
// =========================================
// PRISMA DESKTOP MODE
// =========================================

let prismaMode = 'desktop'; // DEFAULT TO DESKTOP
let desktopFocusIndex = 1; // Start on Events (center)
let desktopMiniGlobeViz = null;

// Mode Toggle Elements
const btnViewPrisma = document.getElementById('viewPrisma');
const btnViewGlobe = document.getElementById('viewGlobe');
// Legacy phone/desktop buttons removed or reused?
const prismaModePhone = document.getElementById('prismaModePhone');
const prismaModeDesktop = document.getElementById('prismaModeDesktop');
const desktopNavLeft = document.getElementById('desktopNavLeft');
const desktopNavRight = document.getElementById('desktopNavRight');

function initDesktopMode() {
    // Navigation Sidebar
    if (btnViewPrisma) {
        btnViewPrisma.addEventListener('click', () => {
            document.getElementById('fullScreenGlobeContainer').style.display = 'none';
            document.getElementById('prismaSection').style.display = 'block';
            switchPrismaMode('desktop');
            setActiveNav(btnViewPrisma);
        });
    }

    if (btnViewGlobe) {
        btnViewGlobe.addEventListener('click', () => {
            // Open Globe Mode
            document.getElementById('prismaSection').style.display = 'none';
            const globeContainer = document.getElementById('fullScreenGlobeContainer');
            globeContainer.style.display = 'block';
            initFullScreenGlobe();
            setActiveNav(btnViewGlobe);
        });
    }

    // Mode toggle buttons (Phone/Desktop/Globe)
    const prismaModeGlobe = document.getElementById('prismaModeGlobe');

    // Helper to hide Globe view (original)
    function hideOriginalGlobeView() {
        const globeViz = document.getElementById('globeViz');
        const leftPanel = document.querySelector('.left-panel');
        if (globeViz) globeViz.style.display = 'none';
        if (leftPanel) leftPanel.style.display = 'none';
    }

    // SIMPLE Mode toggle buttons - use unified switchViewMode
    if (prismaModePhone) {
        prismaModePhone.addEventListener('click', () => switchViewMode('phone'));
    }
    if (prismaModeDesktop) {
        prismaModeDesktop.addEventListener('click', () => switchViewMode('desktop'));
    }
    if (prismaModeGlobe) {
        prismaModeGlobe.addEventListener('click', () => switchViewMode('globe'));
    }

    // Desktop navigation arrows
    if (desktopNavLeft) desktopNavLeft.addEventListener('click', () => focusDesktopPanel(desktopFocusIndex - 1));
    if (desktopNavRight) desktopNavRight.addEventListener('click', () => focusDesktopPanel(desktopFocusIndex + 1));

    // Panel click to focus
    document.querySelectorAll('.desktop-panel').forEach(panel => {
        panel.addEventListener('click', (e) => {
            // Ignore clicks on scrollable content, OR on mode toggle buttons
            if (e.target.closest('.events-scroll-container, .comparison-columns, .vertical-timeline, .prisma-mode-toggle, .mode-btn')) return;
            const panelIndex = parseInt(panel.dataset.panel);
            if (!isNaN(panelIndex)) focusDesktopPanel(panelIndex);
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (prismaMode === 'desktop' && document.getElementById('prismaSection').style.display !== 'none') {
            if (e.key === 'ArrowLeft') focusDesktopPanel(desktopFocusIndex - 1);
            if (e.key === 'ArrowRight') focusDesktopPanel(desktopFocusIndex + 1);
        }
    });

    // INIT MODE: Check screen size and choose appropriate mode
    if (window.innerWidth < 768) {
        // Mobile: Force phone mode immediately
        switchViewMode('phone');
    } else {
        // Desktop: Force desktop mode
        switchViewMode('desktop');
    }
}

function setActiveNav(activeBtn) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
}

// Update mode toggle button states (Phone/Desktop/Globe)
function updateModeToggle(mode) {
    const phone = document.getElementById('prismaModePhone');
    const desktop = document.getElementById('prismaModeDesktop');
    const globe = document.getElementById('prismaModeGlobe');

    if (phone) phone.classList.toggle('active', mode === 'phone');
    if (desktop) desktop.classList.toggle('active', mode === 'desktop');
    if (globe) globe.classList.toggle('active', mode === 'globe');
}

// =========================================
// UNIFIED VIEW MODE SWITCHING
// =========================================
let currentViewMode = 'desktop'; // Track current mode

function switchViewMode(mode) {
    console.log('🔀 Switching to mode:', mode);
    currentViewMode = mode;

    const prismaSection = document.getElementById('prismaSection');
    const globeViz = document.getElementById('globeViz');
    const leftPanel = document.querySelector('.left-panel');
    const calendarContainer = document.querySelector('.calendar-container');
    const newsListContainer = document.querySelector('.news-list');

    // STEP 1: Hide ALL views first
    if (prismaSection) {
        prismaSection.style.display = 'none';
        prismaSection.classList.remove('desktop-mode');
    }
    if (globeViz) globeViz.style.display = 'none';
    if (leftPanel) leftPanel.style.display = 'none';

    // STEP 2: Show the selected view
    if (mode === 'phone') {
        // Phone Mode: Prisma in phone simulator
        if (prismaSection) {
            prismaSection.style.display = 'block';
            prismaSection.classList.remove('desktop-mode');
        }
        prismaMode = 'phone';
        initMiniGlobe();
        // Force "Events" face (Face 1) to be active so it's not black/hidden
        setTimeout(() => rotatePrismaTo(1), 100);
        if (prismaHechos.length === 0) fetchPrismaHechos();

    } else if (mode === 'desktop') {
        // Desktop Mode: Prisma carousel
        if (prismaSection) {
            prismaSection.style.display = 'block';
            prismaSection.classList.add('desktop-mode');
        }
        prismaMode = 'desktop';
        fetchPrismaHechos(); // Will call syncDesktopPanels when done
        initDesktopMiniGlobe();
        focusDesktopPanel(desktopFocusIndex);

    } else if (mode === 'globe') {
        // Globe Mode: Original globe view with calendar
        if (globeViz) globeViz.style.display = 'block';
        if (leftPanel) leftPanel.style.display = 'flex';
        if (calendarContainer) calendarContainer.style.display = 'block';
        if (newsListContainer) newsListContainer.style.display = 'block';
        initializeGlobe();
    }

    // STEP 3: Update toggle buttons
    updateModeToggle(mode);

    // Re-initialize Lucide icons
    if (window.lucide) lucide.createIcons();
}

function switchPrismaMode(mode) {
    prismaMode = mode;
    const prismaSection = document.getElementById('prismaSection');

    // CRITICAL: Force display to override inline style="display:none"
    if (mode === 'desktop') {
        prismaSection.style.display = 'block';
    }

    // Toggle active states on legacy buttons
    if (prismaModePhone) prismaModePhone.classList.toggle('active', mode === 'phone');
    if (prismaModeDesktop) prismaModeDesktop.classList.toggle('active', mode === 'desktop');

    // Toggle mode class on container
    prismaSection.classList.toggle('desktop-mode', mode === 'desktop');

    // Re-initialize lucide icons for new mode
    if (window.lucide) lucide.createIcons();

    // Sync desktop content if switching to desktop
    if (mode === 'desktop') {
        // CRITICAL: Fetch data first, then sync panels
        fetchPrismaHechos(); // This will call syncDesktopPanels after data loads
        initDesktopMiniGlobe();
        focusDesktopPanel(desktopFocusIndex); // Ensure panel classes are applied
    }

    // Initialize Phone Mode with mini-globe
    if (mode === 'phone') {
        prismaSection.style.display = 'block';
        // Recalculate geometry for the phone container width
        setTimeout(updatePrismaGeometry, 50);

        initMiniGlobe(); // Initialize mini-globe for phone mode
        if (prismaHechos.length === 0) {
            fetchPrismaHechos();
        }
    }
}


// =========================================
// FULL SCREEN GLOBE
// =========================================
let fullScreenGlobeViz = null;

function initFullScreenGlobe() {
    const container = document.getElementById('fullScreenGlobe');
    if (!container) return;

    // If already initialized, just resize/update
    if (fullScreenGlobeViz) {
        // Force resize
        fullScreenGlobeViz.width(window.innerWidth);
        fullScreenGlobeViz.height(window.innerHeight);
        return;
    }

    container.innerHTML = '';
    const defaultMarker = [{ lat: 40.4168, lng: -3.7038, name: "ESPAÑA" }];

    fullScreenGlobeViz = Globe()
        (container)
        .backgroundColor('#000000') // Space black
        .globeImageUrl('./img/earth-blue-marble.jpg')
        .bumpImageUrl('./img/earth-topology.png')
        .width(window.innerWidth)
        .height(window.innerHeight)
        .showAtmosphere(true)
        .atmosphereColor('lightskyblue')
        .atmosphereAltitude(0.18)
        .htmlElementsData(defaultMarker)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlElement(d => {
            const el = document.createElement('div');
            el.className = 'mini-globe-marker'; // Reuse marker style
            el.innerHTML = '<div class="marker-dot pulse"></div>';
            return el;
        });

    // Add clouds layer
    const cloudTex = new THREE.TextureLoader().load('./img/earth-clouds.png');
    const CLOUDS_ALT = 0.004;
    const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(fullScreenGlobeViz.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: cloudTex, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    fullScreenGlobeViz.scene().add(clouds);

    // Animate clouds
    (function animateFullScreenClouds() {
        clouds.rotation.y += 0.0002;
        requestAnimationFrame(animateFullScreenClouds);
    })();

    fullScreenGlobeViz.controls().enableZoom = true; // Enable zoom for full screen
    fullScreenGlobeViz.controls().autoRotate = true;
    fullScreenGlobeViz.controls().autoRotateSpeed = 0.5;

    // Handle Window Resize
    window.addEventListener('resize', () => {
        if (fullScreenGlobeViz && document.getElementById('fullScreenGlobeContainer').style.display !== 'none') {
            fullScreenGlobeViz.width(window.innerWidth);
            fullScreenGlobeViz.height(window.innerHeight);
        }
    });
}


function focusDesktopPanel(index) {
    // Wrap around 0-2 (Comparison=0, Events=1, Timeline=2)
    desktopFocusIndex = ((index % 3) + 3) % 3;

    const panels = document.querySelectorAll('.desktop-panel');
    panels.forEach((panel) => {
        const i = parseInt(panel.dataset.panel);

        // Remove old classes
        panel.classList.remove('focused', 'left', 'right');

        if (i === desktopFocusIndex) {
            // ACTIVE PANEL -> CENTER (Order 2)
            panel.classList.add('focused');
            panel.style.order = 2;
        } else if (i === (desktopFocusIndex - 1 + 3) % 3) {
            // PREVIOUS PANEL -> LEFT (Order 1)
            panel.classList.add('left');
            panel.style.order = 1;
        } else {
            // NEXT PANEL -> RIGHT (Order 3)
            panel.classList.add('right');
            panel.style.order = 3;
        }
    });

    // Update content based on current state when focus changes
    syncDesktopPanels();
}

function syncDesktopPanels() {
    if (prismaHechos.length === 0) return;

    const currentHecho = prismaHechos[currentHechoIndex];
    if (!currentHecho) return;

    // Sync comparison panel
    syncDesktopComparison(currentHecho);

    // Sync events panel
    syncDesktopEvents();

    // Sync timeline panel
    syncDesktopTimeline(currentHecho);

    // Update headers
    const titleEl = document.getElementById('desktopEventTitle');
    const dateEl = document.getElementById('desktopEventDate');
    if (titleEl) titleEl.textContent = currentHecho.macroevento || 'Evento';
    if (dateEl) dateEl.textContent = currentHecho.date || '';
}

async function syncDesktopComparison(hecho) {
    if (!hecho) return;

    const titleEl = document.getElementById('desktopComparisonTitle');
    if (titleEl) titleEl.textContent = hecho.id;

    const colPaisArticles = document.querySelector('#desktopColPais .col-articles');
    const colMundoArticles = document.querySelector('#desktopColMundo .col-articles');

    if (colPaisArticles) colPaisArticles.innerHTML = '<div class="spinner"></div>';
    if (colMundoArticles) colMundoArticles.innerHTML = '<div class="spinner"></div>';

    try {
        const res = await fetch(`/api/hecho/${encodeURIComponent(hecho.id)}/articles?t=${Date.now()}`);
        const articles = await res.json();

        const paisArts = articles.filter(a => a.medio.toLowerCase().includes('país'));
        const mundoArts = articles.filter(a => a.medio.toLowerCase().includes('mundo'));

        // El País
        if (colPaisArticles) {
            if (paisArts.length === 0) {
                colPaisArticles.innerHTML = '<p style="text-align:center;opacity:0.5;padding:20px;">Sin artículos</p>';
            } else {
                colPaisArticles.innerHTML = paisArts.map(a => `
                    <div class="prisma-article" onclick="window.open('${a.link}', '_blank')">
                        <h4>${a.titulo}</h4>
                        <p>${a.summary || ''}</p>
                    </div>
                `).join('');
            }
        }

        // El Mundo
        if (colMundoArticles) {
            if (mundoArts.length === 0) {
                colMundoArticles.innerHTML = '<p style="text-align:center;opacity:0.5;padding:20px;">Sin artículos</p>';
            } else {
                colMundoArticles.innerHTML = mundoArts.map(a => `
                    <div class="prisma-article" onclick="window.open('${a.link}', '_blank')">
                        <h4>${a.titulo}</h4>
                        <p>${a.summary || ''}</p>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Error syncing desktop comparison:', e);
    }
}

function syncDesktopEvents() {
    const container = document.getElementById('desktopEventsContainer');
    if (!container) return;

    container.innerHTML = prismaHechos.map((h, index) => `
        <div class="event-card ${index === currentHechoIndex ? 'active' : ''}" data-index="${index}">
            <span class="event-tag">DATOS DEL HECHO</span>
            <h3>${h.id}</h3>
            <p>${h.text}</p>
            <div class="event-date">${h.date || ''}</div>
        </div>
    `).join('');

    // Scroll detection for desktop events
    container.addEventListener('scroll', handleDesktopEventsScroll);
}

function handleDesktopEventsScroll() {
    const container = document.getElementById('desktopEventsContainer');
    if (!container) return;

    const cards = container.querySelectorAll('.event-card');
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distanceFromCenter = Math.abs(containerCenter - cardCenter);
        const threshold = rect.height / 2;

        if (distanceFromCenter < threshold) {
            card.classList.add('active');
            if (currentHechoIndex !== index) {
                currentHechoIndex = index;
                // Update mini globe
                updateDesktopMiniGlobePosition(index);
                // Sync other panels without re-syncing events
                const currentHecho = prismaHechos[index];
                if (currentHecho) {
                    syncDesktopComparison(currentHecho);
                    syncDesktopTimeline(currentHecho);
                    document.getElementById('desktopEventTitle').textContent = currentHecho.macroevento || 'Evento';
                    document.getElementById('desktopEventDate').textContent = currentHecho.date || '';
                }
            }
        } else {
            card.classList.remove('active');
        }
    });
}

async function syncDesktopTimeline(hecho) {
    const timeline = document.getElementById('desktopVerticalTimeline');
    const titleEl = document.getElementById('desktopTimelineTitle');
    if (!timeline || !hecho) return;

    const macroName = hecho.macroevento;
    if (titleEl) titleEl.textContent = macroName || 'Línea Temporal';

    if (!macroName || macroName === 'Sin clasificar') {
        // Show current hechos as timeline
        renderDesktopVerticalTimeline(prismaHechos, currentHechoIndex);
        return;
    }

    try {
        const res = await fetch(`/api/timeline/${encodeURIComponent(macroName)}?t=${Date.now()}`);
        const hechos = await res.json();
        const activeIdx = hechos.findIndex(h => h.id === hecho.id);
        renderDesktopVerticalTimeline(hechos, activeIdx >= 0 ? activeIdx : 0);
    } catch (e) {
        console.error('Error syncing desktop timeline:', e);
    }
}

function renderDesktopVerticalTimeline(hechos, activeIndex) {
    const timeline = document.getElementById('desktopVerticalTimeline');
    if (!timeline) return;

    timeline.innerHTML = hechos.map((h, index) => `
        <div class="timeline-node ${index === activeIndex ? 'active' : ''}" data-id="${h.id}">
            <div class="timeline-node-content">
                <h4>${h.id}</h4>
                <span>${h.date || ''}</span>
            </div>
        </div>
    `).join('');

    // Click handler for timeline nodes
    timeline.querySelectorAll('.timeline-node').forEach((node, index) => {
        node.addEventListener('click', () => {
            // Find in prismaHechos or inject
            let matchIdx = prismaHechos.findIndex(ph => ph.id === hechos[index].id);
            if (matchIdx < 0) {
                prismaHechos.push({
                    id: hechos[index].id,
                    date: hechos[index].date,
                    text: hechos[index].text || '',
                    macroevento: document.getElementById('desktopTimelineTitle')?.textContent || 'Evento',
                    newspapers: []
                });
                matchIdx = prismaHechos.length - 1;
            }
            currentHechoIndex = matchIdx;
            syncDesktopPanels();

            // Scroll events to this card
            const eventsContainer = document.getElementById('desktopEventsContainer');
            const card = eventsContainer?.querySelector(`[data-index="${matchIdx}"]`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    // Scroll to active
    setTimeout(() => {
        const activeNode = timeline.querySelector('.timeline-node.active');
        if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function initDesktopMiniGlobe() {
    const container = document.getElementById('desktopMiniGlobe');
    if (!container || desktopMiniGlobeViz) return;

    container.innerHTML = '';
    const defaultMarker = [{ lat: 40.4168, lng: -3.7038, name: "ESPAÑA" }];

    // Initial size from container (fallback to 450 if hidden/zero)
    let initialWidth = container.clientWidth || 450;
    let initialHeight = container.clientHeight || 450;

    desktopMiniGlobeViz = Globe()
        (container)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('./img/earth-blue-marble.jpg')
        .bumpImageUrl('./img/earth-topology.png')
        .width(initialWidth)
        .height(initialHeight)
        .showAtmosphere(true)
        .atmosphereColor('lightskyblue')
        .atmosphereAltitude(0.18)
        .htmlElementsData(defaultMarker)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlElement(d => {
            const el = document.createElement('div');
            el.className = 'mini-globe-marker';
            el.innerHTML = '<div class="marker-dot pulse"></div>';
            return el;
        });

    // Add clouds layer
    const cloudTex = new THREE.TextureLoader().load('./img/earth-clouds.png');
    const CLOUDS_ALT = 0.004;
    const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(desktopMiniGlobeViz.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: cloudTex, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    desktopMiniGlobeViz.scene().add(clouds);

    // Animate clouds
    (function animateDesktopClouds() {
        clouds.rotation.y += 0.0003;
        requestAnimationFrame(animateDesktopClouds);
    })();

    desktopMiniGlobeViz.controls().enableZoom = false;
    desktopMiniGlobeViz.controls().autoRotate = true;
    desktopMiniGlobeViz.controls().autoRotateSpeed = 0.3;

    // DYNAMIC RESIZING Support
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            // Debounce or just update
            if (width > 0 && height > 0) {
                desktopMiniGlobeViz.width(width);
                desktopMiniGlobeViz.height(height);
            }
        }
    });
    resizeObserver.observe(container);

    // Position based on current event
    if (prismaHechos.length > 0) {
        updateDesktopMiniGlobePosition(currentHechoIndex);
    }
}

function updateDesktopMiniGlobePosition(index) {
    if (!desktopMiniGlobeViz || !prismaHechos[index]) return;

    const hecho = prismaHechos[index];
    const text = (hecho.text || '').toLowerCase();
    const macro = (hecho.macroevento || '').toLowerCase();
    const combined = text + ' ' + macro;

    let lat = 40.4168, lng = -3.7038, locationName = "ESPAÑA";

    if (combined.includes('sudán') || combined.includes('sudan')) {
        lat = 15.8575; lng = 30.2176; locationName = "SUDÁN";
    } else if (combined.includes('israel') || combined.includes('hamas') || combined.includes('gaza')) {
        lat = 31.5; lng = 34.8; locationName = "ORIENTE MEDIO";
    } else if (combined.includes('dana') || combined.includes('valencia')) {
        lat = 39.4699; lng = -0.3763; locationName = "VALENCIA";
    } else if (combined.includes('ucrania') || combined.includes('rusia')) {
        lat = 50.4501; lng = 30.5234; locationName = "UCRANIA";
    } else if (combined.includes('trump') || combined.includes('eeuu')) {
        lat = 38.9072; lng = -77.0369; locationName = "EEUU";
    }

    desktopMiniGlobeViz.htmlElementsData([{ lat, lng, name: locationName }]);
    desktopMiniGlobeViz.pointOfView({ lat, lng, alt: 0.5 }, 1000);
}

// =========================================
// RESPONSIVE / AUTO-MOBILE MODE
// =========================================
function checkMobileMode() {
    // If width is tiny (< 768), force Phone Mode and hide toggles
    if (window.innerWidth < 768) {
        // Only if we aren't already in phone mode, switch
        if (currentViewMode !== 'phone') {
            console.log('📱 Mobile device detected - Switching to Phone View');
            switchViewMode('phone');
        }
    } else {
        // Optional: Switch back to Desktop if user resizes back to desktop?
        // Maybe safer to leave it unless we were purely auto-switched.
        // For now, let's reset to desktop if we grew large and were in phone mode
        if (currentViewMode === 'phone') {
            switchViewMode('desktop');
        }
    }
}

// Check on load
window.addEventListener('load', checkMobileMode);

// Check on resize (debounced slightly)
// Check on resize (debounced slightly)
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkMobileMode, 200);
});


