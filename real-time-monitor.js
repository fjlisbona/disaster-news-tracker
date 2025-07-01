// Sistema de monitoreo en tiempo real para detectar nuevos eventos automáticamente
class RealTimeNewsMonitor {
    constructor() {
        this.isMonitoring = false;
        this.knownEventIds = new Set();
        this.pollingInterval = null;
        this.criticalPollingInterval = null;
        this.checkInterval = 30000; // 30 segundos
        this.criticalCheckInterval = 30000; // 30 segundos para eventos críticos
        this.maxEvents = 15;
        this.newEventsToday = 0;
        
        // Inicializar eventos conocidos
        this.initializeKnownEvents();
        
        // Configurar listeners
        this.setupEventListeners();
    }

    // Inicializar eventos conocidos
    initializeKnownEvents() {
        if (typeof disasterData !== 'undefined' && disasterData.length > 0) {
            disasterData.forEach(event => {
                this.knownEventIds.add(this.generateEventHash(event));
            });
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        document.getElementById('toggleMonitoring')?.addEventListener('click', () => {
            this.startMonitoring();
        });
        
        document.getElementById('stopMonitoring')?.addEventListener('click', () => {
            this.stopMonitoring();
        });
    }

    // Iniciar monitoreo
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('🔄 El monitoreo ya está activo');
            return;
        }

        this.isMonitoring = true;
        console.log('🚀 Iniciando monitoreo en tiempo real cada 20 segundos...');
        
        // Actualizar UI - mostrar botón "Detener Monitoreo"
        this.updateMonitoringUI(true);
        this.showConnectionStatus('connecting');
        
        // Verificar inmediatamente
        this.checkForNewEvents();
        
        // Configurar verificación cada 20 segundos
        this.pollingInterval = setInterval(() => {
            this.checkForNewEvents();
        }, this.checkInterval);
        
        // Verificación más frecuente para eventos críticos
        this.criticalPollingInterval = setInterval(() => {
            this.checkForCriticalEvents();
        }, this.criticalCheckInterval);
        
        this.showConnectionStatus('connected');
        showNotification('✅ Monitoreo automático iniciado', 'success');
    }

    // Detener monitoreo
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        if (this.criticalPollingInterval) {
            clearInterval(this.criticalPollingInterval);
            this.criticalPollingInterval = null;
        }
        
        // Actualizar UI - mostrar botón "Iniciar Monitoreo"
        this.updateMonitoringUI(false);
        this.showConnectionStatus('disconnected');
        showNotification('⏹️ Monitoreo detenido', 'info');
        console.log('⏹️ Monitoreo detenido');
    }

    // Actualizar UI de monitoreo
    updateMonitoringUI(isActive) {
        const toggleBtn = document.getElementById('toggleMonitoring');
        const stopBtn = document.getElementById('stopMonitoring');
        
        if (isActive) {
            // Ocultar "Iniciar Monitoreo" y mostrar "Detener Monitoreo"
            toggleBtn.style.display = 'none';
            stopBtn.style.display = 'block';
        } else {
            // Mostrar "Iniciar Monitoreo" y ocultar "Detener Monitoreo"
            toggleBtn.style.display = 'block';
            stopBtn.style.display = 'none';
        }
    }

    // Verificar nuevos eventos (cada 20 segundos)
    async checkForNewEvents() {
        try {
            console.log('🔍 Verificando nuevos eventos automáticamente...');
            
            const newEvents = await this.fetchLatestNews();
            const trulyNewEvents = this.filterNewEvents(newEvents);
            
            if (trulyNewEvents.length > 0) {
                console.log(`📰 ${trulyNewEvents.length} nuevos eventos encontrados`);
                await this.processNewEvents(trulyNewEvents);
            }
            
        } catch (error) {
            console.error('❌ Error verificando eventos:', error);
            this.showConnectionStatus('error');
        }
    }

    // Verificar eventos críticos
    async checkForCriticalEvents() {
        try {
            const criticalEvents = await this.fetchCriticalNews();
            if (criticalEvents.length > 0) {
                await this.processNewEvents(criticalEvents, true);
            }
        } catch (error) {
            console.warn('⚠️ Error en verificación crítica:', error);
        }
    }

    // Obtener noticias más recientes
    async fetchLatestNews() {
        const newsQueries = [
            'guerra conflicto armado',
            'terremoto tsunami',
            'ataque terrorista',
            'emergencia nuclear',
            'erupción volcánica',
            'huracán ciclón',
            'incendio forestal',
            'accidente industrial'
        ];
        
        const allEvents = [];
        
        for (const query of newsQueries) {
            try {
                const events = await this.fetchGoogleNewsRSS(query);
                allEvents.push(...events);
                await this.sleep(200);
            } catch (error) {
                console.warn(`⚠️ Error con query "${query}":`, error.message);
            }
        }
        
        return allEvents.slice(0, 5); // Máximo 5 por verificación
    }

    // Obtener noticias críticas
    async fetchCriticalNews() {
        const criticalQueries = [
            'ataque nuclear',
            'terremoto magnitud 7',
            'tsunami alerta',
            'erupción volcánica evacuación'
        ];
        
        const criticalEvents = [];
        
        for (const query of criticalQueries) {
            try {
                const events = await this.fetchGoogleNewsRSS(query);
                criticalEvents.push(...events.map(event => ({
                    ...event,
                    severity: 'high',
                    critical: true
                })));
            } catch (error) {
                console.warn(`⚠️ Error crítico:`, error.message);
            }
        }
        
        return criticalEvents;
    }

    // Obtener desde Google News RSS
    async fetchGoogleNewsRSS(query) {
        try {
            const encodedQuery = encodeURIComponent(query);
            const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es&gl=ES&ceid=ES:es`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const items = xmlDoc.querySelectorAll('item');
            const events = [];
            
            for (let i = 0; i < Math.min(items.length, 2); i++) {
                const item = items[i];
                const event = await this.parseNewsItem(item, query);
                if (event) {
                    events.push(event);
                }
            }
            
            return events;
            
        } catch (error) {
            console.warn(`⚠️ Error RSS:`, error.message);
            return [];
        }
    }

    // Parsear item de noticia
    async parseNewsItem(item, query) {
        try {
            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const source = item.querySelector('source')?.textContent || 'Google News';
            
            const eventType = this.determineEventType(title + ' ' + description);
            const location = this.extractLocation(title + ' ' + description);
            const coordinates = this.getCoordinatesForLocation(location);
            
            return {
                id: this.generateUniqueId(),
                title: this.cleanTitle(title),
                type: eventType,
                description: this.cleanDescription(description) || `Evento reportado en ${location}`,
                location: location,
                coordinates: coordinates,
                date: this.formatDate(pubDate),
                severity: this.determineSeverity(title + ' ' + description),
                newsLinks: [
                    {
                        title: `${source} - Ver noticia completa`,
                        url: link,
                        source: source
                    },
                    {
                        title: "Google News - Más información",
                        url: `https://news.google.com/search?q=${encodeURIComponent(title)}`,
                        source: "Google News"
                    }
                ]
            };
            
        } catch (error) {
            console.warn('⚠️ Error parseando:', error);
            return null;
        }
    }

    // Filtrar eventos nuevos
    filterNewEvents(events) {
        return events.filter(event => {
            const eventHash = this.generateEventHash(event);
            return !this.knownEventIds.has(eventHash);
        });
    }

    // Procesar nuevos eventos
    async processNewEvents(newEvents, isCritical = false) {
        for (const event of newEvents) {
            // Verificar límite
            if (disasterData.length >= this.maxEvents) {
                this.removeOldestEvent();
            }
            
            // Agregar a datos globales
            disasterData.push(event);
            
            // Agregar marcador al mapa
            this.addAnimatedMarkerToMap(event, isCritical);
            
            // Marcar como conocido
            this.knownEventIds.add(this.generateEventHash(event));
            
            // Mostrar notificación
            this.showNewEventNotification(event, isCritical);
            
            // Incrementar contador de eventos nuevos
            this.newEventsToday++;
            this.updateNewEventsCounter();
            
            await this.sleep(1000);
        }
        
        // Actualizar estadísticas
        if (typeof updateStatistics === 'function') {
            updateStatistics();
        }
        
        if (typeof updateLastUpdateTime === 'function') {
            updateLastUpdateTime();
        }
    }

    // Agregar marcador animado
    addAnimatedMarkerToMap(event, isCritical = false) {
        const markerColor = getMarkerColor(event.type);
        const markerSize = getMarkerSize(event.severity);
        
        const marker = L.circleMarker(event.coordinates, {
            radius: markerSize,
            fillColor: markerColor,
            color: isCritical ? '#ff0000' : 'white',
            weight: isCritical ? 4 : 2,
            opacity: 1,
            fillOpacity: 0.9,
            className: `custom-marker marker-${event.type} ${isCritical ? 'marker-critical' : 'marker-new'}`
        });
        
        const popupContent = createPopupContent(event);
        marker.bindPopup(popupContent);
        
        marker.on('click', () => {
            if (typeof showEventModal === 'function') {
                showEventModal(event);
            }
        });
        
        marker.addTo(map);
        markers.push(marker);
        
        this.animateNewMarker(marker, event, isCritical);
    }

    // Animar nuevo marcador
    animateNewMarker(marker, event, isCritical) {
        // Efecto de aparición
        marker.setStyle({
            radius: marker.options.radius * 2,
            fillOpacity: 0.3
        });
        
        setTimeout(() => {
            marker.setStyle({
                radius: marker.options.radius,
                fillOpacity: 0.8
            });
        }, 500);
        
        // Para eventos críticos, hacer zoom
        if (isCritical) {
            setTimeout(() => {
                map.setView(event.coordinates, Math.max(map.getZoom(), 8), {
                    animate: true,
                    duration: 1.5
                });
                
                setTimeout(() => {
                    marker.openPopup();
                }, 1000);
            }, 1000);
        }
    }

    // Remover evento más antiguo
    removeOldestEvent() {
        if (disasterData.length === 0) return;
        
        let oldestIndex = 0;
        let oldestDate = new Date(disasterData[0].date);
        
        for (let i = 1; i < disasterData.length; i++) {
            const eventDate = new Date(disasterData[i].date);
            if (eventDate < oldestDate) {
                oldestDate = eventDate;
                oldestIndex = i;
            }
        }
        
        const oldEvent = disasterData[oldestIndex];
        const markerIndex = markers.findIndex(marker => {
            const latLng = marker.getLatLng();
            return latLng.lat === oldEvent.coordinates[0] && 
                   latLng.lng === oldEvent.coordinates[1];
        });
        
        if (markerIndex !== -1) {
            map.removeLayer(markers[markerIndex]);
            markers.splice(markerIndex, 1);
        }
        
        disasterData.splice(oldestIndex, 1);
    }

    // Mostrar notificación de nuevo evento
    showNewEventNotification(event, isCritical = false) {
        const notificationType = isCritical ? 'warning' : 'info';
        const icon = isCritical ? '🚨' : '📍';
        const message = `${icon} Nuevo evento: ${event.title} en ${event.location}`;
        
        if (typeof showNotification === 'function') {
            showNotification(message, notificationType);
        }
        
        if (isCritical) {
            this.showCriticalAlert(event);
        }
    }

    // Mostrar alerta crítica
    showCriticalAlert(event) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger critical-alert';
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            min-width: 400px;
            max-width: 600px;
            border: 3px solid #dc3545;
            box-shadow: 0 0 20px rgba(220, 53, 69, 0.3);
            animation: criticalPulse 2s infinite;
        `;
        
        alert.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle text-danger me-3" style="font-size: 24px;"></i>
                <div class="flex-grow-1">
                    <h6 class="mb-1">🚨 EVENTO CRÍTICO DETECTADO</h6>
                    <strong>${event.title}</strong><br>
                    <small>${event.location} - ${event.date}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 8000);
    }

    // Mostrar estado de conexión
    showConnectionStatus(status) {
        let statusElement = document.getElementById('connection-status');
        
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'connection-status';
            statusElement.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                min-width: 200px;
                text-align: center;
            `;
            document.body.appendChild(statusElement);
        }
        
        switch (status) {
            case 'connecting':
                statusElement.style.background = 'rgba(255, 193, 7, 0.9)';
                statusElement.style.color = 'black';
                statusElement.innerHTML = '🔄 Conectando...';
                break;
            case 'connected':
                statusElement.style.background = 'rgba(40, 167, 69, 0.9)';
                statusElement.style.color = 'white';
                statusElement.innerHTML = '🟢 Monitoreo activo';
                break;
            case 'error':
                statusElement.style.background = 'rgba(220, 53, 69, 0.9)';
                statusElement.style.color = 'white';
                statusElement.innerHTML = '🔴 Error - Reintentando...';
                break;
            case 'disconnected':
                statusElement.style.background = 'rgba(108, 117, 125, 0.9)';
                statusElement.style.color = 'white';
                statusElement.innerHTML = '⚫ Desconectado';
                break;
        }
    }

    // Actualizar contador de eventos nuevos
    updateNewEventsCounter() {
        const counter = document.getElementById('new-events-today');
        if (counter) {
            counter.textContent = this.newEventsToday;
        }
    }

    // Funciones auxiliares
    generateEventHash(event) {
        const hashString = `${event.title}_${event.location}_${event.date}`;
        return btoa(hashString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }

    generateUniqueId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    determineEventType(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('guerra') || lowerText.includes('conflicto') || 
            lowerText.includes('ataque') || lowerText.includes('bombardeo')) {
            return 'war';
        }
        
        if (lowerText.includes('terremoto') || lowerText.includes('tsunami') ||
            lowerText.includes('huracán') || lowerText.includes('volcán')) {
            return 'natural';
        }
        
        if (lowerText.includes('virus') || lowerText.includes('pandemia')) {
            return 'pandemic';
        }
        
        return 'accident';
    }

    extractLocation(text) {
        const locations = {
            'Ucrania': [49.4871, 31.2718],
            'Gaza': [31.3547, 34.3088],
            'Israel': [31.0461, 34.8516],
            'Siria': [34.8021, 38.9968],
            'Irán': [32.4279, 53.6880],
            'Turquía': [38.9637, 35.2433],
            'China': [35.8617, 104.1954],
            'India': [20.5937, 78.9629],
            'Filipinas': [12.8797, 121.7740],
            'Chile': [-35.6751, -71.5430],
            'México': [23.6345, -102.5528]
        };
        
        for (const location of Object.keys(locations)) {
            if (text.toLowerCase().includes(location.toLowerCase())) {
                return location;
            }
        }
        
        return 'Ubicación no especificada';
    }

    getCoordinatesForLocation(location) {
        const locations = {
            'Ucrania': [49.4871, 31.2718],
            'Gaza': [31.3547, 34.3088],
            'Israel': [31.0461, 34.8516],
            'Siria': [34.8021, 38.9968],
            'Irán': [32.4279, 53.6880],
            'Turquía': [38.9637, 35.2433],
            'China': [35.8617, 104.1954],
            'India': [20.5937, 78.9629],
            'Filipinas': [12.8797, 121.7740],
            'Chile': [-35.6751, -71.5430],
            'México': [23.6345, -102.5528]
        };
        
        return locations[location] || [0, 0];
    }

    determineSeverity(text) {
        const lowerText = text.toLowerCase();
        
        const highKeywords = ['muertos', 'víctimas', 'masacre', 'devastador', 'emergencia'];
        const mediumKeywords = ['heridos', 'daños', 'alerta', 'riesgo'];
        
        for (const keyword of highKeywords) {
            if (lowerText.includes(keyword)) return 'high';
        }
        
        for (const keyword of mediumKeywords) {
            if (lowerText.includes(keyword)) return 'medium';
        }
        
        return 'low';
    }

    cleanTitle(title) {
        return title.replace(/^[^-]+-\s*/, '').replace(/\s*-\s*[^-]*$/, '').trim();
    }

    cleanDescription(description) {
        if (!description) return '';
        return description.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim().substring(0, 200) + '...';
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Agregar estilos CSS - usando nombre único para evitar conflictos
const monitoringStyles = document.createElement('style');
monitoringStyles.id = 'real-time-monitoring-styles';
monitoringStyles.textContent = `
    @keyframes criticalPulse {
        0% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.3); }
        50% { box-shadow: 0 0 30px rgba(220, 53, 69, 0.6); }
        100% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.3); }
    }
    
    .marker-new {
        animation: markerPulse 2s ease-out;
    }
    
    .marker-critical {
        animation: criticalMarkerPulse 3s infinite;
    }
    
    @keyframes markerPulse {
        0% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.5); opacity: 1; }
        100% { transform: scale(1); opacity: 0.8; }
    }
    
    @keyframes criticalMarkerPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
`;

// Solo agregar si no existe ya
if (!document.getElementById('real-time-monitoring-styles')) {
    document.head.appendChild(monitoringStyles);
}

// Inicializar sistema
let realTimeMonitor;

// Función para limpiar todos los marcadores
function clearAllMarkers() {
    if (confirm('¿Estás seguro de que quieres limpiar todos los marcadores del mapa?')) {
        clearMarkers();
        disasterData.length = 0;
        updateStatistics();
        if (realTimeMonitor) {
            realTimeMonitor.knownEventIds.clear();
            realTimeMonitor.newEventsToday = 0;
            realTimeMonitor.updateNewEventsCounter();
        }
        showNotification('🗑️ Mapa limpiado', 'info');
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof map !== 'undefined') {
            realTimeMonitor = new RealTimeNewsMonitor();
            console.log('✅ Monitor en tiempo real inicializado');
        }
    }, 2000);
});

// Exportar funciones globales
window.realTimeMonitor = realTimeMonitor;
window.clearAllMarkers = clearAllMarkers; 