// =========================================
// Phone Engine Switching Module
// Handles Globe ⇄ Leaflet transitions for the phone mini-globe
// =========================================
(function (window) {
    // State
    let phoneLeafletMap = null;
    let phoneEngineState = 'ORBITAL'; // 'ORBITAL', 'TRANSITION', 'LOCAL'
    let phoneTransitionInProgress = false;
    let globeVizRef = null;
    let containerRef = null;

    // Double-tap detection for touch devices
    let lastTapTime = 0;
    const DOUBLE_TAP_DELAY = 300; // ms between taps

    // Constants
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
        if (phoneLeafletMap) return;

        // Create container div inside the parent
        const mapDiv = document.createElement('div');
        mapDiv.id = 'phoneLeafletMap';
        mapDiv.style.position = 'absolute';
        mapDiv.style.top = '0';
        mapDiv.style.left = '0';
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        mapDiv.style.zIndex = '5';
        mapDiv.style.opacity = '0';
        mapDiv.style.display = 'none';
        mapDiv.style.pointerEvents = 'none';
        mapDiv.style.transition = 'opacity 0.8s ease';
        mapDiv.style.background = '#0a0a1a';
        mapDiv.style.borderRadius = '8px';

        container.style.position = 'relative';
        container.appendChild(mapDiv);

        phoneLeafletMap = L.map('phoneLeafletMap', {
            zoomControl: false,
            attributionControl: false,
            zoomSnap: 0.1,
            zoomDelta: 0.1,
            doubleClickZoom: false
        }).setView([40.4168, -3.7038], 8);

        // ESRI World Imagery
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(phoneLeafletMap);

        // Labels overlay
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(phoneLeafletMap);

        // Double-tap on map: Map -> Globe (works for both mouse and touch)
        phoneLeafletMap.on('dblclick', function () {
            if (phoneEngineState === 'LOCAL') {
                console.log('📱 Phone: Double-tap on Map → Globe');
                transitionToGlobe();
            }
        });

        // Track zoom for return-to-globe detection
        let mapEntryZoom = null;
        let lastZoomTime = 0;
        
        // Zoom-based transition: ONLY zoom OUT returns to globe
        // Requires zooming out SIGNIFICANTLY from entry point
        phoneLeafletMap.on('zoomend', function () {
            // Only handle when in LOCAL state (map is active)
            if (phoneEngineState !== 'LOCAL') {
                mapEntryZoom = null;
                return;
            }
            
            const currentZoom = phoneLeafletMap.getZoom();
            const now = Date.now();
            
            // Debounce: ignore rapid zoom changes (within 200ms)
            if (now - lastZoomTime < 200) {
                lastZoomTime = now;
                return;
            }
            lastZoomTime = now;
            
            // Record entry zoom on first stable read
            if (mapEntryZoom === null) {
                mapEntryZoom = currentZoom;
                console.log('📱 Phone: Map entry zoom = ' + mapEntryZoom);
                return;
            }
            
            // Only return to globe if zoomed out SIGNIFICANTLY from entry
            // Must be at least 2 levels below entry AND below absolute threshold of 3
            const zoomDelta = mapEntryZoom - currentZoom;
            if (zoomDelta >= 2 && currentZoom <= 3) {
                console.log('📱 Phone: Significant zoom out ' + mapEntryZoom + ' → ' + currentZoom + ' → Globe');
                transitionToGlobe();
            }
        });

        // Touch-based double-tap for the map container
        // Must be SINGLE finger taps (not pinch release)
        const mapContainer = phoneLeafletMap.getContainer();
        let lastTapX = 0;
        let lastTapY = 0;
        let lastTouchCount = 0;
        
        mapContainer.addEventListener('touchstart', function(e) {
            // Track how many fingers are touching
            lastTouchCount = e.touches.length;
        }, { passive: true });
        
        mapContainer.addEventListener('touchend', function(e) {
            if (phoneEngineState !== 'LOCAL') return;
            
            // IGNORE if this was a multi-touch gesture (pinch)
            // e.touches.length is remaining fingers, we check if MORE than 0 remain
            // OR if the gesture started with multiple fingers
            if (e.touches.length > 0 || lastTouchCount > 1) {
                lastTapTime = 0; // Reset double-tap detection
                lastTouchCount = e.touches.length;
                return;
            }
            
            const touch = e.changedTouches[0];
            const currentTime = Date.now();
            const tapLength = currentTime - lastTapTime;
            
            // Check if taps are close together in position (within 50px)
            const dx = Math.abs(touch.clientX - lastTapX);
            const dy = Math.abs(touch.clientY - lastTapY);
            const sameSpot = dx < 50 && dy < 50;
            
            if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0 && sameSpot) {
                e.preventDefault();
                console.log('📱 Phone: Touch double-tap on Map → Globe');
                transitionToGlobe();
                lastTapTime = 0;
            } else {
                lastTapTime = currentTime;
                lastTapX = touch.clientX;
                lastTapY = touch.clientY;
            }
            
            lastTouchCount = 0;
        }, { passive: false });

        console.log('📱 Phone Engine: Leaflet Initialized');
    }

    // Sync Camera position from Globe to Leaflet
    function syncCamera() {
        if (!phoneLeafletMap || !globeVizRef) return;
        const pov = globeVizRef.pointOfView();
        // Use fixed zoom 5 for a good overview when entering map
        phoneLeafletMap.setView([pov.lat, pov.lng], 5, { animate: false });
    }

    // Setup double-tap on Globe canvas (supports both mouse and touch)
    function setupGlobeDoubleTap(container) {
        const canvas = container.querySelector('canvas');
        if (canvas) {
            // Mouse double-click (for desktop/simulator)
            canvas.addEventListener('dblclick', (e) => {
                if (phoneEngineState === 'ORBITAL') {
                    console.log('📱 Phone: Double-click on Globe → Map');
                    transitionToLeaflet();
                }
            });

            // Touch double-tap (for actual mobile devices)
            let globeLastTap = 0;
            canvas.addEventListener('touchend', (e) => {
                if (phoneEngineState !== 'ORBITAL') return;
                
                const currentTime = Date.now();
                const tapLength = currentTime - globeLastTap;
                
                if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
                    e.preventDefault();
                    console.log('📱 Phone: Touch double-tap on Globe → Map');
                    transitionToLeaflet();
                    globeLastTap = 0;
                } else {
                    globeLastTap = currentTime;
                }
            }, { passive: false });

            console.log('📱 Phone Engine: Globe double-tap enabled (mouse + touch)');
        }
    }

    // Transition: Globe -> Leaflet
    function transitionToLeaflet() {
        if (phoneTransitionInProgress) return;
        phoneTransitionInProgress = true;
        phoneEngineState = 'TRANSITION';

        const leafletDiv = document.getElementById('phoneLeafletMap');
        const globeCanvas = containerRef ? containerRef.querySelector('canvas') : null;

        // Make visible first
        leafletDiv.style.display = 'block';
        leafletDiv.style.opacity = '0';

        // Wait a frame, then sync and animate
        requestAnimationFrame(() => {
            if (phoneLeafletMap) phoneLeafletMap.invalidateSize();
            syncCamera();

            const duration = 800;
            const startTime = performance.now();

            function animate() {
                const elapsed = performance.now() - startTime;
                const t = Math.min(1, elapsed / duration);
                const ease = t * t * (3 - 2 * t);

                leafletDiv.style.opacity = ease;
                if (globeCanvas) globeCanvas.style.opacity = 1 - ease;

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    phoneEngineState = 'LOCAL';
                    leafletDiv.style.pointerEvents = 'auto';
                    if (globeCanvas) globeCanvas.style.opacity = 0;
                    phoneTransitionInProgress = false;
                    console.log('📱 Phone Engine: → LOCAL');
                }
            }
            requestAnimationFrame(animate);
        });
    }

    // Transition: Leaflet -> Globe
    function transitionToGlobe() {
        if (phoneTransitionInProgress) return;
        phoneTransitionInProgress = true;
        phoneEngineState = 'TRANSITION';

        const leafletDiv = document.getElementById('phoneLeafletMap');
        const globeCanvas = containerRef ? containerRef.querySelector('canvas') : null;

        if (globeCanvas) globeCanvas.style.opacity = 0;
        leafletDiv.style.pointerEvents = 'none';

        // Return to same altitude as initial globe (0.5) - keep map location
        if (phoneLeafletMap && globeVizRef) {
            const center = phoneLeafletMap.getCenter();
            // Use 'alt' (not 'altitude') for consistency with initMiniGlobe
            globeVizRef.pointOfView({ lat: center.lat, lng: center.lng, alt: 0.5 }, 0);
        }

        const duration = 800;
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
                phoneEngineState = 'ORBITAL';
                leafletDiv.style.display = 'none';
                if (globeCanvas) globeCanvas.style.opacity = 1;
                phoneTransitionInProgress = false;
                console.log('📱 Phone Engine: → ORBITAL');
            }
        }
        requestAnimationFrame(animate);
    }

    // Public API
    window.PhoneEngine = {
        init: function (viz, container) {
            globeVizRef = viz;
            containerRef = container;
            initLeaflet(container);
            // Setup double-tap after a small delay to ensure canvas is ready
            setTimeout(() => setupGlobeDoubleTap(container), 500);
        },

        // Expose for manual triggering if needed
        transitionToLeaflet: transitionToLeaflet,
        transitionToGlobe: transitionToGlobe
    };

})(window);

