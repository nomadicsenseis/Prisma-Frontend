
// Mock Data for Spanish News
// News Data provided by User (2025-06-29)
const newsData = [
    {
        city: "Madrid",
        lat: 40.4168,
        lng: -3.7038,
        title: "Las seis vidas segadas en una semana dramática de violencia machista",
        summary: "Entre el martes y el miércoles fueron hallados los cuerpos de cinco mujeres asesinadas a manos de sus parejas...",
        source: "El País",
        url: "https://elpais.com/sociedad/2025-06-28/las-seis-vidas-segadas-en-una-semana-dramatica-de-violencia-machista.html"
    },
    {
        city: "Almería",
        lat: 36.8340,
        lng: -2.4637,
        title: "Detenido un hombre por el asesinato de su mujer en Almería",
        summary: "La Policía Nacional ha detenido a un hombre de 60 años como presunto asesino de su mujer...",
        source: "El País",
        url: "https://elpais.com/espana/2025-06-28/detenido-un-hombre-por-el-asesinato-de-su-mujer-en-almeria.html"
    },
    {
        city: "Madrid (Tribunal Supremo)",
        lat: 40.4240,
        lng: -3.6938,
        title: "Protesta de jueces y fiscales contra la reforma judicial",
        summary: "Cientos de manifestantes en la protesta de jueces y fiscales contra la reforma judicial del Gobierno...",
        source: "El País",
        url: "https://elpais.com/espana/2025-06-28/multitudinaria-protesta-de-jueces-y-fiscales-contra-la-reforma-judicial-al-supremo.html"
    },
    {
        city: "Sevilla",
        lat: 37.3891,
        lng: -5.9845,
        title: "Arranca la primera ola de calor",
        summary: "La primera ola de calor arranca con el 77% de los municipios en niveles de riesgo para la salud...",
        source: "El País",
        url: "https://elpais.com/clima-y-medio-ambiente/2025-06-28/la-primera-ola-de-calor-arranca-con-el-75-de-los-municipios-en-niveles-de-riesgo-para-la-salud.html"
    },
    {
        city: "Budapest",
        lat: 47.4979,
        lng: 19.0402,
        title: "Claves del Orgullo prohibido en Budapest",
        summary: "Hungría celebra hoy su manifestación por los derechos LGTBIQ+ más compleja en un ambiente de alta tensión...",
        source: "El País",
        url: "https://elpais.com/sociedad/lgtb/2025-06-28/claves-del-orgullo-prohibido-de-budapest.html"
    },
    {
        city: "Madrid (Zarzuela)",
        lat: 40.4820,
        lng: -3.7964,
        title: "Marta Carazo, nueva jefa de la Secretaría de la Reina",
        summary: "La periodista de TVE será la nueva mano derecha de la Reina Letizia a partir de septiembre...",
        source: "El País",
        url: "https://elpais.com/espana/2025-06-28/marta-carazo-periodista-de-tve-nueva-jefa-de-la-secretaria-de-la-reina.html"
    },
    {
        city: "Madrid (Congreso)",
        lat: 40.4160,
        lng: -3.6960,
        title: "Trump, Peinado y González, ¿al rescate de Sánchez?",
        summary: "Análisis sobre cómo los recientes eventos internacionales y judiciales afectan al presidente Pedro Sánchez...",
        source: "El País",
        url: "https://elpais.com/espana/2025-06-28/trump-peinado-y-gonzalez-al-rescate-de-sanchez.html"
    },
    {
        city: "Venecia",
        lat: 45.4408,
        lng: 12.3155,
        title: "Boda de Jeff Bezos y Lauren Sánchez en Venecia",
        summary: "Fin de fiesta con baile de máscaras y manifestación contra la boda en la ciudad italiana...",
        source: "El País",
        url: "https://elpais.com/gente/2025-06-28/fin-de-fiesta-de-jeff-bezos-y-lauren-sanchez-en-venecia-baile-de-mascaras-y-manifestacion-contra-la-boda.html"
    },
    {
        city: "California (Western States)",
        lat: 39.0968,
        lng: -120.0324,
        title: "Kilian Jornet: 'Hay momentos en que no sé si estoy vivo o muerto'",
        summary: "El atleta regresa a la carrera Western States de 100 millas en California...",
        source: "El País",
        url: "https://elpais.com/deportes/2025-06-28/kilian-jornet-hay-momentos-en-que-no-se-si-estoy-vivo-o-muerto.html"
    },
    {
        city: "Valencia",
        lat: 39.4699,
        lng: -0.3763,
        title: "El auge del ventilador de techo",
        summary: "Por qué el ventilador de techo amenaza el reinado del aire acondicionado este verano...",
        source: "El País",
        url: "https://elpais.com/economia/negocios/2025-06-28/el-gran-hit-del-verano-contra-el-calor-por-que-el-ventilador-de-techo-amenaza-el-reinado-del-aire-acondicionado.html"
    },
    {
        city: "Teherán",
        lat: 35.6892,
        lng: 51.3890,
        title: "Funerales multitudinarios en Irán",
        summary: "Irán cierra filas con un funeral de Estado por los altos cargos asesinados en el conflicto...",
        source: "El País",
        url: "https://elpais.com/internacional/2025-06-28/iran-cierra-filas-con-los-funerales-por-los-altos-cargos-asesinados-por-israel.html"
    },
    {
        city: "Gaza",
        lat: 31.5017,
        lng: 34.4668,
        title: "Conflicto en Oriente Próximo: Última hora",
        summary: "Israel mata al menos a 12 palestinos en Gaza mientras continúan los funerales en Irán...",
        source: "El País",
        url: "https://elpais.com/internacional/2025-06-28/ultima-hora-del-conflicto-en-oriente-proximo-en-directo.html"
    },
    {
        city: "Washington D.C.",
        lat: 38.9072,
        lng: -77.0369,
        title: "El Supremo de EE UU limita el poder de los jueces",
        summary: "Victoria para Trump: el tribunal limita la capacidad de los jueces para bloquear su agenda...",
        source: "El País",
        url: "https://elpais.com/internacional/2025-06-27/el-supremo-de-ee-uu-limita-el-poder-de-los-jueces-para-oponerse-a-la-agenda-de-trump.html"
    },
    {
        city: "Lavapiés (Madrid)",
        lat: 40.4087,
        lng: -3.7005,
        title: "El camino imposible de los inmigrantes sin papeles",
        summary: "Años en la clandestinidad: historias de supervivencia de inmigrantes irregulares en España...",
        source: "El País",
        url: "https://elpais.com/espana/2025-06-28/anos-en-la-clandestinidad-el-camino-imposible-de-los-inmigrantes-sin-papeles-en-espana.html"
    }
];

console.log("DEBUG: Script started");

// Initialize Globe
let world;
try {
    if (typeof Globe !== 'undefined') {
        console.log("DEBUG: Globe library found, initializing...");
        world = Globe()
            (document.getElementById('globeViz'))
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
            .pointOfView({ lat: 40.4168, lng: -3.7038, altitude: 1.5 }) // Start focused on Spain
            .pointsData(newsData)
            .pointLat('lat')
            .pointLng('lng')
            .pointColor(() => '#3eabf7')
            .pointAltitude(0.1)
            .pointRadius(0.5)
            .showAtmosphere(true)
            .atmosphereColor('lightskyblue')
            .atmosphereAltitude(0.15)
            .pointLabel(d => `
                <div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; border: 1px solid #3eabf7; color: white; font-family: sans-serif;">
                    <b style="color: #3eabf7">${d.city}</b>: ${d.title}<br/>
                    <i style="font-size: 0.8em; color: #ccc">${d.source}</i>
                </div>
            `)
            .onPointClick(d => {
                if (d.url) window.open(d.url, '_blank');
            });
        console.log("DEBUG: Globe initialized successfully");
    } else {
        console.error("DEBUG: Globe library not found!");
    }
} catch (e) {
    console.error("DEBUG: Error initializing Globe:", e);
}

// Populate Left Panel News List
const newsList = document.getElementById('topNews');
newsData.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.title;
    li.title = item.summary;
    li.onclick = () => {
        // Fly to location on click
        world.pointOfView({ lat: item.lat, lng: item.lng, altitude: 1.5 }, 2000);
        world.controls().autoRotate = false; // Stop rotation to focus
    };
    newsList.appendChild(li);
});

// Add Clouds using Procedural Texture (Canvas)
function createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill transparent
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw random cloud puffs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.filter = 'blur(20px)';

    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 40 + 20;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas;
}

// Constants for clouds
const CLOUDS_ALT = 0.004; // Altitude of clouds relative to globe radius
const CLOUDS_ROTATION_SPEED = 0.005; // Degrees per frame

window.addEventListener('load', () => {
    console.log("DEBUG: Window loaded");
    console.log("DEBUG: window.THREE:", !!window.THREE);
    console.log("DEBUG: world:", !!world);

    if (window.THREE && world) {
        try {
            console.log("DEBUG: Attempting to create clouds...");
            const cloudTexture = new THREE.CanvasTexture(createCloudTexture());
            const clouds = new THREE.Mesh(
                new THREE.SphereGeometry(world.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
                new THREE.MeshPhongMaterial({ map: cloudTexture, transparent: true, opacity: 0.9 })
            );

            console.log("DEBUG: Cloud mesh created", clouds);
            world.scene().add(clouds);
            console.log("DEBUG: Clouds added to scene");

            (function rotateClouds() {
                clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
                requestAnimationFrame(rotateClouds);
            })();
            console.log("DEBUG: Animation loop started");
        } catch (e) {
            console.error("DEBUG: Error creating clouds:", e);
        }
    } else {
        console.error("DEBUG: Missing dependencies", { three: !!window.THREE, world: !!world });
    }
});

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
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatInput.value = '';

    // Simulate bot response
    setTimeout(() => {
        const responses = [
            "Entiendo. ¿Te gustaría saber más sobre esa noticia?",
            "Puedo buscar más información en los periódicos españoles.",
            "Ese es un tema interesante. Aquí tienes un resumen...",
            "Lo siento, solo soy una interfaz de demostración por ahora."
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomResponse, 'bot');
    }, 1000);
}

chatSend.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
