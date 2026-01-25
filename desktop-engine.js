// =========================================
// Desktop Engine Switching Module
// Handles Globe ⇄ Leaflet transitions for the desktop mini-globe
// =========================================
(function (window) {
    // State
    let desktopLeafletMap = null;
    let desktopEngineState = 'ORBITAL'; // 'ORBITAL', 'PRELOAD', 'TRANSITION', 'LOCAL'
    let desktopTransitionInProgress = false;
    let globeVizRef = null;

    // Constants (Higher thresholds for mini-globe - transition happens earlier)
    const PRELOAD_ALTITUDE = 3.5;
    const TRANSITION_ALTITUDE = 2.5;
    const ZOOM_CORRECTION = 0.6;

    // Helper: Altitude to Zoom conversion
    function altitudeToZoom(altitude) {
        if (altitude <= 0) return 19;
        const k = ZOOM_CORRECTION;
        const val = (128 * k) / altitude;
        if (val <= 0) return 2;
        return Math.log2(val);
    }

    function zoomToAltitude(zoom) {
        const k = ZOOM_CORRECTION;
        return (128 * k) / Math.pow(2, zoom);
    }

    // Initialize Leaflet Map inside the container
    function initLeaflet(container) {
        if (desktopLeafletMap) return;

        // Create container div inside the parent
        const mapDiv = document.createElement('div');
        mapDiv.id = 'desktopLeafletMap';
        mapDiv.style.position = 'absolute';
        mapDiv.style.top = '0';
        mapDiv.style.left = '0';
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        mapDiv.style.zIndex = '5'; // Above Globe canvas
        mapDiv.style.opacity = '0';
        mapDiv.style.display = 'none';
        mapDiv.style.pointerEvents = 'none';
        mapDiv.style.transition = 'opacity 0.8s ease';
        mapDiv.style.background = '#0a0a1a';
        mapDiv.style.borderRadius = '12px';

        container.style.position = 'relative';
        container.appendChild(mapDiv);

        desktopLeafletMap = L.map('desktopLeafletMap', {
            zoomControl: false, // No zoom controls for mini-map
            attributionControl: false,
            zoomSnap: 0.1,
            zoomDelta: 0.1
        }).setView([40.4168, -3.7038], 6);

        // ESRI World Imagery
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(desktopLeafletMap);

        // Labels overlay
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(desktopLeafletMap);

        // Zoom-out return listener
        desktopLeafletMap.on('zoomend', function () {
            if (desktopEngineState === 'LOCAL') {
                const zoom = desktopLeafletMap.getZoom();
                if (zoom <= 5.4) {
                    transitionToGlobe();
                }
            }
        });

        // Double-tap: Map -> Globe (same as Globe Mode)
        desktopLeafletMap.on('dblclick', function () {
            if (desktopEngineState === 'LOCAL') {
                console.log('🖥️ Desktop: Double-tap on Map → Globe');
                transitionToGlobe();
            }
        });

        console.log('🖥️ Desktop Engine: Leaflet Initialized');
    }

    // Setup double-tap on Globe canvas
    function setupGlobeDoubleTap(container) {
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('dblclick', (e) => {
                if (desktopEngineState === 'ORBITAL' || desktopEngineState === 'PRELOAD') {
                    console.log('🖥️ Desktop: Double-tap on Globe → Map');
                    transitionToLeaflet();
                }
            });
        }
    }

    // Sync Camera position
    function syncCamera() {
        if (!desktopLeafletMap || !globeVizRef) return;
        const pov = globeVizRef.pointOfView();
        const rawZoom = altitudeToZoom(pov.altitude);
        const zoomLevel = Math.min(19, Math.max(2, rawZoom));
        desktopLeafletMap.setView([pov.lat, pov.lng], zoomLevel, { animate: false });
    }

    // Transition: Globe -> Leaflet
    function transitionToLeaflet() {
        if (desktopTransitionInProgress) return;
        desktopTransitionInProgress = true;
        desktopEngineState = 'TRANSITION';

        const leafletDiv = document.getElementById('desktopLeafletMap');
        const parent = document.getElementById('desktopMiniGlobe');
        const globeCanvas = parent ? parent.querySelector('canvas') : null;

        // IMPORTANT: Make visible FIRST, then sync, then animate
        leafletDiv.style.display = 'block';
        leafletDiv.style.opacity = '0';
        
        // Wait a frame for display to take effect, then sync and start animation
        requestAnimationFrame(() => {
            if (desktopLeafletMap) desktopLeafletMap.invalidateSize();
            syncCamera();
            
            // Now start the animation after sync is complete
            const duration = 1200;
            const startTime = performance.now();

            function animate() {
                const elapsed = performance.now() - startTime;
                const t = Math.min(1, elapsed / duration);
                const ease = t * t * (3 - 2 * t); // Smoothstep

                leafletDiv.style.opacity = ease;
                if (globeCanvas) globeCanvas.style.opacity = 1 - ease;

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    desktopEngineState = 'LOCAL';
                    leafletDiv.classList.add('active');
                    leafletDiv.style.pointerEvents = 'auto';
                    if (globeCanvas) globeCanvas.style.opacity = 0;
                    desktopTransitionInProgress = false;
                    console.log('🖥️ Desktop Engine: → LOCAL');
                }
            }
            requestAnimationFrame(animate);
        });
    }

    // Transition: Leaflet -> Globe
    function transitionToGlobe() {
        if (desktopTransitionInProgress) return;
        desktopTransitionInProgress = true;
        desktopEngineState = 'TRANSITION';

        const leafletDiv = document.getElementById('desktopLeafletMap');
        const parent = document.getElementById('desktopMiniGlobe');
        const globeCanvas = parent ? parent.querySelector('canvas') : null;

        if (globeCanvas) globeCanvas.style.opacity = 0;
        leafletDiv.style.pointerEvents = 'none';

        // Sync globe position from Leaflet
        if (desktopLeafletMap && globeVizRef) {
            const center = desktopLeafletMap.getCenter();
            const zoom = desktopLeafletMap.getZoom();
            const altitude = zoomToAltitude(zoom);
            globeVizRef.pointOfView({ lat: center.lat, lng: center.lng, altitude: altitude }, 0);
        }

        const duration = 1200;
        const startTime = performance.now();

        function animate() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = t * t * (3 - 2 * t);

            if (globeCanvas) globeCanvas.style.opacity = ease;
            leafletDiv.style.opacity = 1 - ease;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                desktopEngineState = 'ORBITAL';
                leafletDiv.style.display = 'none';
                if (globeCanvas) globeCanvas.style.opacity = 1;
                desktopTransitionInProgress = false;
                console.log('🖥️ Desktop Engine: → ORBITAL');
            }
        }
        requestAnimationFrame(animate);
    }

    // Public API
    window.DesktopEngine = {
        init: function (viz, container) {
            globeVizRef = viz;
            initLeaflet(container);
            // Setup double-tap after a small delay to ensure canvas is ready
            setTimeout(() => setupGlobeDoubleTap(container), 500);
        },

        checkTransitions: function () {
            if (desktopTransitionInProgress || !globeVizRef) return;

            const camDist = globeVizRef.camera().position.length();
            const radius = globeVizRef.getGlobeRadius();
            const alt = (camDist / radius) - 1;

            switch (desktopEngineState) {
                case 'ORBITAL':
                    if (alt < PRELOAD_ALTITUDE) {
                        desktopEngineState = 'PRELOAD';
                        const mapDiv = document.getElementById('desktopLeafletMap');
                        if (mapDiv) {
                            mapDiv.style.display = 'block';
                            mapDiv.style.opacity = '0';
                            if (desktopLeafletMap) desktopLeafletMap.invalidateSize();
                        }
                        syncCamera();
                    }
                    break;

                case 'PRELOAD':
                    if (alt >= PRELOAD_ALTITUDE) {
                        desktopEngineState = 'ORBITAL';
                        const mapDiv = document.getElementById('desktopLeafletMap');
                        if (mapDiv) mapDiv.style.display = 'none';
                    } else if (alt < TRANSITION_ALTITUDE) {
                        transitionToLeaflet();
                    } else {
                        syncCamera();
                    }
                    break;
            }
        },

        // Expose for manual triggering if needed
        transitionToLeaflet: transitionToLeaflet,
        transitionToGlobe: transitionToGlobe
    };

})(window);

