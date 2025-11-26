// Global state
let newsData = [];
let world;
let availableDates = [];
let currentDateIndex = 0;
let selectedTopic = ""; // empty means all topics

// DOM elements for news reader
const readerPanel = document.getElementById('newsReader');
const readerSource = document.getElementById('readerSource');
const readerTitle = document.getElementById('readerTitle');
const readerContent = document.getElementById('readerContent');

function openArticle(data) {
    readerSource.textContent = `${data.source} • ${data.city}`;
    readerTitle.textContent = data.title;
    readerContent.innerHTML = `
        <p><strong>${data.city}</strong> — ${data.summary}</p>
        <a href="${data.url}" target="_blank" class="read-more-btn">Leer artículo original <i data-lucide="external-link" style="width:14px;vertical-align:middle;"></i></a>
    `;
    readerPanel.classList.add('open');
    lucide.createIcons();
    if (world) {
        world.pointOfView({ lat: data.lat, lng: data.lng, altitude: 1.2 }, 2000);
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
        li.onclick = () => openArticle(item);
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

async function fetchDates() {
    try {
        const res = await fetch('/api/dates');
        if (!res.ok) throw new Error('Failed to fetch dates');
        availableDates = await res.json();

        // Select the most recent date by default
        if (availableDates.length > 0) {
            // Sort just in case
            availableDates.sort((a, b) => new Date(b.date) - new Date(a.date));
            selectedDate = availableDates[0].date;
            calendarDate = new Date(selectedDate); // Jump calendar to that month
        }
        renderCalendar();
    } catch (e) {
        console.error('Error fetching dates:', e);
    }
}

async function fetchTopics() {
    try {
        const res = await fetch('/api/topics');
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
        });
    } catch (e) {
        console.error('Error fetching topics:', e);
    }
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
        let url = '/api/news';
        const params = [];
        if (dateFilter) params.push(`date=${dateFilter}`);
        if (topicFilter) params.push(`topic=${encodeURIComponent(topicFilter)}`);
        if (params.length) url += '?' + params.join('&');
        console.log('📡 Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        console.log('📥 Received', data.length, 'articles');
        newsData = data;

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


function updateGlobeData() {
    if (world) world.htmlElementsData(newsData);
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
    world = Globe()(document.getElementById('globeViz'))
        .globeMaterial(earthMat)
        .backgroundImageUrl('./img/night-sky.png')
        .pointOfView({ lat: 40.4168, lng: -3.7038, altitude: 1.5 })
        .htmlElementsData(newsData)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlElement(d => {
            const el = document.createElement('div');
            el.className = 'news-marker';
            el.innerHTML = `
                <div class="marker-dot"></div>
                <div class="marker-card">
                    <div class="marker-source">${d.source}</div>
                    <div class="marker-title">${d.title}</div>
                </div>
            `;
            el.onclick = e => { e.stopPropagation(); openArticle(d); };
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
});
