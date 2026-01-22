
import os

file_path = 'script.js'

code_to_append = """

// --- RECOVERED INTERACTION LOGIC ---

// 1. Swipe Handler (Missing)
function handleSwipe() {
    if (!touchStartElement || !typeof touchStartX === 'number' || !typeof touchEndX === 'number') return;
    
    // Ignore swipe on interactive elements like sliders/maps if needed
    // But for global navigation, we usually want it.
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    const minSwipeDistance = 50; 
    const maxVerticalVariance = 100;

    if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffY) < maxVerticalVariance) {
        console.log('Swipe detected:', diffX);
        if (diffX > 0) {
            // Right -> Prev 
            const leftBtn = document.getElementById('prismaNavLeft');
            if(leftBtn) leftBtn.click(); // Reuse existing nav button logic
        } else {
            // Left -> Next
            const rightBtn = document.getElementById('prismaNavRight');
            if(rightBtn) rightBtn.click();
        }
    }
    // Reset
    touchStartX = 0; touchEndX = 0;
}

// 2. Double Tap Fix (Capture Phase)
(function fixDoubleTap() {
    const globeDiv = document.getElementById('globeViz');
    if (globeDiv) {
        globeDiv.addEventListener('dblclick', (e) => {
             // Force transition to Map if we are in Globe mode
             // We detect globe mode by checking if map is hidden
             const map = document.getElementById('leafletMap');
             const isMapHidden = map && (getComputedStyle(map).display === 'none' || map.style.opacity === '0');
             
             if (isMapHidden && typeof transitionToLeaflet === 'function') {
                 console.log('Force Double Tap: Globe -> Map');
                 transitionToLeaflet();
                 e.stopPropagation();
             }
        }, { capture: true }); // Capture phase ensures we get it before OrbitControls
    }
    
    // Ensure Leaflet Map also has robust listener
    const leafletDiv = document.getElementById('leafletMap');
    if (leafletDiv) {
        leafletDiv.addEventListener('dblclick', (e) => {
             // Force transition to Globe
             if (typeof transitionToGlobe === 'function') {
                 // Check if map is visible
                 const map = document.getElementById('leafletMap');
                 const isMapVisible = map && (getComputedStyle(map).display !== 'none' && map.style.opacity !== '0');
                 if (isMapVisible) {
                    console.log('Force Double Tap: Map -> Globe');
                    transitionToGlobe();
                    e.stopPropagation();
                 }
             }
        }, { capture: true });
    }
})();

"""

with open(file_path, 'a', encoding='utf-8') as f:
    f.write(code_to_append)
    
print("Appended interaction fixes to script.js")
