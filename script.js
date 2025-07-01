// Global variables
let map;
let markers = [];
let disasterData = [];
let currentFilters = {
    wars: true,
    natural: true,
    pandemics: true,
    accidents: true
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    loadDisasterData();
});

// Initialize the map with OpenStreetMap standard layer only
function initializeMap() {
    map = L.map('map').setView([20, 0], 2);
    
    // OpenStreetMap standard layer only
    const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    });
    
    // Add standard layer to map
    osmStandard.addTo(map);
    
    // Add scale control
    L.control.scale({
        imperial: false,
        metric: true,
        position: 'bottomleft'
    }).addTo(map);
    
    // Add custom info control
    const infoControl = L.control({
        position: 'topright'
    });
    
    infoControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info-control');
        div.innerHTML = `
            <div class="info-panel">
                <h4><i class="fas fa-info-circle"></i> Información</h4>
                <p><strong>Zoom:</strong> <span id="zoom-level">2</span></p>
                <p><strong>Centro:</strong> <span id="map-center">20, 0</span></p>
                <p><strong>Marcadores visibles:</strong> <span id="visible-markers">0</span></p>
            </div>
        `;
        return div;
    };
    
    infoControl.addTo(map);
    
    // Update info panel on map events
    map.on('zoomend', updateInfoPanel);
    map.on('moveend', updateInfoPanel);
    
    // Initial info panel update
    updateInfoPanel();
}

// Update info panel with current map state
function updateInfoPanel() {
    const zoom = map.getZoom();
    const center = map.getCenter();
    const visibleMarkers = markers.filter(marker => {
        const bounds = map.getBounds();
        return bounds.contains(marker.getLatLng());
    }).length;
    
    document.getElementById('zoom-level').textContent = zoom;
    document.getElementById('map-center').textContent = `${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`;
    document.getElementById('visible-markers').textContent = visibleMarkers;
}

// Setup event listeners
function setupEventListeners() {
    // Filter checkboxes
    document.getElementById('filter-wars').addEventListener('change', updateFilters);
    document.getElementById('filter-natural').addEventListener('change', updateFilters);
    document.getElementById('filter-pandemics').addEventListener('change', updateFilters);
    document.getElementById('filter-accidents').addEventListener('change', updateFilters);
}

// Update filters and refresh markers
function updateFilters() {
    currentFilters.wars = document.getElementById('filter-wars').checked;
    currentFilters.natural = document.getElementById('filter-natural').checked;
    currentFilters.pandemics = document.getElementById('filter-pandemics').checked;
    currentFilters.accidents = document.getElementById('filter-accidents').checked;
    
    updateMarkers();
    updateStatistics();
}

// Load disaster data
async function loadDisasterData() {
    showLoading(true);
    
    try {
        // Verificar si el clasificador ML existe y está inicializado
        if (window.mlClassifier) {
            console.log(' Clasificador ML detectado, esperando datos...');
            
            // Esperar a que el ML termine de inicializarse
            let initAttempts = 0;
            while (!window.mlClassifier.isInitialized && initAttempts < 20) {
                console.log('Esperando inicialización ML...');
                await new Promise(resolve => setTimeout(resolve, 500));
                initAttempts++;
            }
            
            if (!window.mlClassifier.isInitialized) {
                console.log('ML no se inicializó a tiempo, usando método tradicional');
                disasterData = await fetchJSONDisasterData();
            } else {
                // Esperar a que termine de procesar
                let processAttempts = 0;
                while (window.mlClassifier.isProcessing && processAttempts < 40) {
                    console.log('ML procesando noticias...');
                    await new Promise(resolve => setTimeout(resolve, 750));
                    processAttempts++;
                }
                
                // Obtener eventos del ML
                const mlEvents = await window.mlClassifier.generateClassifiedEvents();
                
                if (mlEvents && mlEvents.length > 0) {
                    console.log(`${mlEvents.length} eventos obtenidos del ML`);
                    disasterData = mlEvents;
                } else {
                    console.log('ML no generó eventos, usando método tradicional');
                    disasterData = await fetchJSONDisasterData();
                }
            }
        } else {
            console.log('ML no disponible, usando método tradicional');
            disasterData = await fetchJSONDisasterData();
        }
        
        // Verificar que tenemos datos válidos
        if (!disasterData || disasterData.length === 0) {
            console.log('⚠️ No hay datos disponibles, usando datos mínimos');
            disasterData = await fetchMinimalFallbackData();
        }
        
        console.log(`📊 Cargando ${disasterData.length} eventos en el mapa`);
        
        // Add markers to map
        addMarkersToMap();
        
        // Update statistics
        updateStatistics();
        
        // Update last update time
        updateLastUpdateTime();
        
        // Mostrar mensaje de éxito
        showNotification(`✅ ${disasterData.length} eventos cargados correctamente`, 'success');
        
    } catch (error) {
        console.error('Error loading disaster data:', error);
        
        // En lugar de mostrar error, intentar con datos mínimos
        try {
            console.log('🔄 Cargando datos mínimos de respaldo...');
            disasterData = await fetchMinimalFallbackData();
            
            if (disasterData.length > 0) {
                addMarkersToMap();
                updateStatistics();
                updateLastUpdateTime();
                showNotification('⚠️ Datos de respaldo cargados', 'warning');
            } else {
                showNotification('ℹ️ Iniciando búsqueda de noticias...', 'info');
            }
        } catch (fallbackError) {
            console.error('Error en fallback:', fallbackError);
            disasterData = [];
            showNotification('ℹ️ Sistema iniciando, espere unos momentos...', 'info');
        }
    } finally {
        showLoading(false);
    }
}

// Nueva función para datos mínimos de respaldo (sin mostrar en mapa)
async function fetchMinimalFallbackData() {
    console.log('🔄 Generando datos mínimos...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retornar array vacío para que no se muestren marcadores de ejemplo
    return [];
}

// Add markers to map
function addMarkersToMap() {
    // Clear existing markers
    clearMarkers();
    
    // Add new markers based on filters
    disasterData.forEach(disaster => {
        if (shouldShowDisaster(disaster)) {
            addMarker(disaster);
        }
    });
}

// Check if disaster should be shown based on filters
function shouldShowDisaster(disaster) {
    switch (disaster.type) {
        case 'war':
            return currentFilters.wars;
        case 'natural':
            return currentFilters.natural;
        case 'pandemic':
            return currentFilters.pandemics;
        case 'accident':
            return currentFilters.accidents;
        default:
            return true;
    }
}

// Add individual marker
function addMarker(disaster) {
    const markerColor = getMarkerColor(disaster.type);
    const markerSize = getMarkerSize(disaster.severity);
    
    const marker = L.circleMarker(disaster.coordinates, {
        radius: markerSize,
        fillColor: markerColor,
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        className: `custom-marker marker-${disaster.type} ${disaster.severity === 'critical' ? 'marker-critical' : ''}`
    });
    
    // Create popup content
    const popupContent = createPopupContent(disaster);
    marker.bindPopup(popupContent);
    
    // Add click event for modal
    marker.on('click', () => {
        showEventModal(disaster);
    });
    
    // Add to map and markers array
    marker.addTo(map);
    markers.push(marker);
}

// Get marker color based on type
function getMarkerColor(type) {
    const colors = {
        war: '#e74c3c',
        natural: '#f39c12',
        pandemic: '#9b59b6',
        accident: '#f1c40f'
    };
    return colors[type] || '#95a5a6';
}

// Get marker size based on severity
function getMarkerSize(severity) {
    const sizes = {
        critical: 12,
        high: 10,
        medium: 8,
        low: 6
    };
    return sizes[severity] || 8;
}

// Create popup content
function createPopupContent(disaster) {
    const typeLabels = {
        war: 'Guerra',
        natural: 'Desastre Natural',
        pandemic: 'Pandemia',
        accident: 'Accidente'
    };
    
    const severityLabels = {
        critical: 'Crítico',
        high: 'Alto',
        medium: 'Medio',
        low: 'Bajo'
    };
    
    // Create news links HTML
    let newsLinksHTML = '';
    if (disaster.newsLinks && disaster.newsLinks.length > 0) {
        newsLinksHTML = `
            <div class="news-links mt-2">
                <strong><i class="fas fa-newspaper"></i> Noticias:</strong><br>
                ${disaster.newsLinks.map(link => 
                    `<a href="${link.url}" target="_blank" class="btn btn-sm btn-outline-primary me-1 mb-1">
                        <i class="fas fa-external-link-alt"></i> ${link.source}
                    </a>`
                ).join('')}
            </div>
        `;
    }
    
    return `
        <div class="event-popup">
            <div class="event-title">${disaster.title}</div>
            <span class="event-type ${disaster.type}">${typeLabels[disaster.type]}</span>
            <div class="event-description">${disaster.description}</div>
            <div class="event-date">
                <strong>Ubicación:</strong> ${disaster.location}<br>
                <strong>Fecha:</strong> ${formatDate(disaster.date)}<br>
                <strong>Severidad:</strong> ${severityLabels[disaster.severity]}
            </div>
            ${newsLinksHTML}
            <div class="mt-2">
                <button class="btn btn-sm btn-info" onclick="showEventModal(disasterData.find(d => d.id === ${disaster.id}))">
                    <i class="fas fa-info-circle"></i> Ver detalles
                </button>
            </div>
        </div>
    `;
}

// Show event modal
function showEventModal(disaster) {
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    
    // Create news links HTML for modal
    let newsLinksHTML = '';
    if (disaster.newsLinks && disaster.newsLinks.length > 0) {
        newsLinksHTML = `
            <div class="col-md-12 mt-3">
                <h6><i class="fas fa-newspaper"></i> Enlaces de Noticias</h6>
                <div class="row">
                    ${disaster.newsLinks.map(link => 
                        `<div class="col-md-6 mb-2">
                            <div class="card">
                                <div class="card-body p-2">
                                    <h6 class="card-title mb-1">${link.source}</h6>
                                    <p class="card-text small">${link.title}</p>
                                    <a href="${link.url}" target="_blank" class="btn btn-sm btn-primary">
                                        <i class="fas fa-external-link-alt"></i> Leer más
                                    </a>
                                </div>
                            </div>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    document.getElementById('eventModalTitle').textContent = disaster.title;
    document.getElementById('eventModalBody').innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h6>Descripción</h6>
                <p>${disaster.description}</p>
                
                <h6>Detalles</h6>
                <ul>
                    <li><strong>Ubicación:</strong> ${disaster.location}</li>
                    <li><strong>Fecha:</strong> ${formatDate(disaster.date)}</li>
                    <li><strong>Tipo:</strong> ${getTypeLabel(disaster.type)}</li>
                    <li><strong>Severidad:</strong> ${getSeverityLabel(disaster.severity)}</li>
                </ul>
            </div>
            <div class="col-md-4">
                <div class="alert alert-info">
                    <h6><i class="fas fa-info-circle"></i> Información</h6>
                    <p>Este evento ha sido identificado como una situación de emergencia que requiere atención internacional.</p>
                    <small class="text-muted">
                        <i class="fas fa-clock"></i> Última actualización: ${formatDate(disaster.date)}
                    </small>
                </div>
            </div>
            ${newsLinksHTML}
        </div>
    `;
    
    // Update the main modal link to point to the first news source if available
    const modalLink = document.getElementById('eventModalLink');
    if (disaster.newsLinks && disaster.newsLinks.length > 0) {
        modalLink.href = disaster.newsLinks[0].url;
        modalLink.innerHTML = `<i class="fas fa-external-link-alt"></i> Ver en ${disaster.newsLinks[0].source}`;
    } else {
        modalLink.href = '#';
        modalLink.innerHTML = '<i class="fas fa-external-link-alt"></i> Ver más información';
    }
    
    modal.show();
}

// Get type label
function getTypeLabel(type) {
    const labels = {
        war: 'Conflicto Armado',
        natural: 'Desastre Natural',
        pandemic: 'Pandemia',
        accident: 'Accidente'
    };
    return labels[type] || type;
}

// Get severity label
function getSeverityLabel(severity) {
    const labels = {
        critical: 'Crítico',
        high: 'Alto',
        medium: 'Medio',
        low: 'Bajo'
    };
    return labels[severity] || severity;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Clear all markers
function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

// Función para limpiar todos los marcadores (llamada desde HTML)
function clearAllMarkers() {
    clearMarkers();
    showNotification('🗑️ Todos los marcadores han sido eliminados', 'info');
}

// Update markers based on filters
function updateMarkers() {
    addMarkersToMap();
}

// Update statistics
function updateStatistics() {
    const stats = {
        total: 0,
        wars: 0,
        natural: 0,
        pandemics: 0,
        accidents: 0
    };
    
    disasterData.forEach(disaster => {
        if (shouldShowDisaster(disaster)) {
            stats.total++;
            stats[disaster.type]++;
        }
    });
    
    document.getElementById('total-events').textContent = stats.total;
    document.getElementById('wars-count').textContent = stats.wars;
    document.getElementById('natural-count').textContent = stats.natural;
    document.getElementById('pandemics-count').textContent = stats.pandemics;
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('es-ES');
    document.getElementById('last-update').textContent = timeString;
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger position-fixed';
    errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Error:</strong> ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

// Auto-refresh data every 30 minutes
setInterval(() => {
    loadDisasterData();
}, 30 * 60 * 1000);

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'r':
            case 'R':
                e.preventDefault();
                loadDisasterData();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                document.getElementById('filter-wars').focus();
                break;
        }
    }
});

// Add search functionality (placeholder for future implementation)
function searchDisasters(query) {
    // This would be implemented to search through disaster data
    console.log('Searching for:', query);
}

// Export functions for potential external use
window.DisasterMap = {
    loadDisasterData,
    updateFilters,
    searchDisasters,
    showEventModal
};

// Additional map control functions
function resetMapView() {
    map.setView([20, 0], 2);
    showNotification('Vista del mapa restablecida', 'info');
}

function fitAllMarkers() {
    if (markers.length === 0) {
        showNotification('No hay marcadores para mostrar', 'warning');
        return;
    }
    
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
    showNotification('Vista ajustada a todos los marcadores', 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification-toast`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(10px);
        border: none;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${getNotificationIcon(type)} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export additional functions
window.resetMapView = resetMapView;
window.fitAllMarkers = fitAllMarkers;
window.clearAllMarkers = clearAllMarkers;
window.showNotification = showNotification;

// Funciones adicionales para integración con monitor en tiempo real
window.getMarkerColor = getMarkerColor;
window.getMarkerSize = getMarkerSize;
window.createPopupContent = createPopupContent;
window.showEventModal = showEventModal;
window.updateStatistics = updateStatistics;
window.updateLastUpdateTime = updateLastUpdateTime;
window.clearMarkers = clearMarkers;

// Función para verificar si el mapa está inicializado
function isMapReady() {
    return typeof map !== 'undefined' && map !== null;
}

// Función para obtener información del estado actual
function getMapState() {
    return {
        totalEvents: disasterData.length,
        maxEvents: 15,
        mapCenter: map ? map.getCenter() : null,
        mapZoom: map ? map.getZoom() : null,
        filters: currentFilters
    };
}

// Función para reiniciar completamente la aplicación
function resetApplication() {
    // Limpiar datos
    disasterData.length = 0;
    clearMarkers();
    
    // Reiniciar filtros
    currentFilters = {
        wars: true,
        natural: true,
        pandemics: true,
        accidents: true
    };
    
    // Actualizar UI
    document.getElementById('filter-wars').checked = true;
    document.getElementById('filter-natural').checked = true;
    document.getElementById('filter-pandemics').checked = true;
    document.getElementById('filter-accidents').checked = true;
    
    // Actualizar estadísticas
    updateStatistics();
    
    // Restablecer vista del mapa
    if (map) {
        map.setView([20, 0], 2);
    }
    
    showNotification('🔄 Aplicación reiniciada', 'info');
}

// Función para exportar datos actuales
function exportCurrentData() {
    const exportData = {
        timestamp: new Date().toISOString(),
        totalEvents: disasterData.length,
        events: disasterData,
        mapState: getMapState()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `disaster-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('📄 Datos exportados correctamente', 'success');
}

// Función para importar datos
function importData(jsonData) {
    try {
        const importedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        if (importedData.events && Array.isArray(importedData.events)) {
            // Limpiar datos actuales
            disasterData.length = 0;
            clearMarkers();
            
            // Importar nuevos datos
            disasterData.push(...importedData.events.slice(0, 15)); // Máximo 15
            
            // Agregar marcadores
            addMarkersToMap();
            
            // Actualizar estadísticas
            updateStatistics();
            updateLastUpdateTime();
            
            showNotification(`✅ ${disasterData.length} eventos importados`, 'success');
        } else {
            throw new Error('Formato de datos inválido');
        }
    } catch (error) {
        showError('Error al importar datos: ' + error.message);
    }
}

// Event listeners adicionales para funciones avanzadas
document.addEventListener('DOMContentLoaded', function() {
    // Agregar botón de exportar datos (opcional)
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-sm btn-outline-secondary mb-2 w-100';
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar Datos';
    exportBtn.onclick = exportCurrentData;
    
    // Agregar botón de reiniciar (opcional)
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-sm btn-outline-warning mb-2 w-100';
    resetBtn.innerHTML = '<i class="fas fa-redo"></i> Reiniciar App';
    resetBtn.onclick = () => {
        if (confirm('¿Estás seguro de que quieres reiniciar la aplicación?')) {
            resetApplication();
        }
    };
    
    // Agregar a controles del mapa
    const mapControls = document.querySelector('.map-controls');
    if (mapControls) {
        mapControls.appendChild(exportBtn);
        mapControls.appendChild(resetBtn);
    }
    
    // Atajos de teclado adicionales
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'e':
                case 'E':
                    e.preventDefault();
                    exportCurrentData();
                    break;
                case 'Delete':
                case 'Backspace':
                    if (e.shiftKey) {
                        e.preventDefault();
                        if (confirm('¿Limpiar todos los marcadores?')) {
                            if (typeof clearAllMarkers === 'function') {
                                clearAllMarkers();
                            }
                        }
                    }
                    break;
            }
        }
        
        // Tecla ESC para detener monitoreo
        if (e.key === 'Escape') {
            if (window.realTimeMonitor && window.realTimeMonitor.isMonitoring) {
                window.realTimeMonitor.stopMonitoring();
            }
        }
    });
});

// Exportar funciones adicionales
window.isMapReady = isMapReady;
window.getMapState = getMapState;
window.resetApplication = resetApplication;
window.exportCurrentData = exportCurrentData;
window.importData = importData;

console.log('✅ Sistema de mapa de catástrofes con monitoreo en tiempo real cargado correctamente'); 