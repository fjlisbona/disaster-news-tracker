// Sistema integrado: WebSocket + JSON con noticias actuales cada 40 segundos + Notificaciones Inteligentes
class IntegratedMonitoringSystem {
    constructor() {
        this.isMonitoring = false;
        this.knownEventIds = new Set();
        this.pollingInterval = null;
        this.jsonUpdateInterval = null;
        this.websocketCheckInterval = 20000; // WebSocket cada 20 segundos
        this.jsonUpdateInterval_time = 40000; // JSON cada 40 segundos
        this.maxEvents = 15;
        this.newEventsToday = 0;
        
        // Inicializar eventos conocidos
        this.initializeKnownEvents();
        
        // Configurar listeners
        this.setupEventListeners();
        
        // Referencia al sistema de notificaciones
        this.notificationSystem = window.smartNotificationSystem;
    }

    // Inicializar eventos conocidos
    initializeKnownEvents() {
        if (typeof disasterData !== 'undefined' && disasterData.length > 0) {
            disasterData.forEach(event => {
                this.knownEventIds.add(this.generateEventHash(event));
            });
            
            // Inicializar sistema de notificaciones con eventos existentes
            if (this.notificationSystem) {
                this.notificationSystem.analyzeEvents(disasterData);
            }
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        document.getElementById('toggleMonitoring')?.addEventListener('click', () => {
            this.startIntegratedMonitoring();
        });
        
        document.getElementById('stopMonitoring')?.addEventListener('click', () => {
            this.stopIntegratedMonitoring();
        });
    }

    // INICIAR MONITOREO INTEGRADO (WebSocket + JSON + Notificaciones)
    async startIntegratedMonitoring() {
        if (this.isMonitoring) {
            console.log('🔄 El monitoreo integrado ya está activo');
            return;
        }

        this.isMonitoring = true;
        console.log('🚀 Iniciando monitoreo integrado: WebSocket + JSON + Notificaciones...');
        
        // Habilitar sistema de notificaciones
        if (this.notificationSystem) {
            this.notificationSystem.setEnabled(true);
            await this.notificationSystem.requestNotificationPermission();
        }
        
        // Actualizar UI
        this.updateMonitoringUI(true);
        this.showConnectionStatus('connecting');
        
        // 1. CARGAR JSON INICIAL INMEDIATAMENTE
        await this.loadLatestJSONNews();
        
        // 2. INICIAR WEBSOCKET (cada 20 segundos)
        this.startWebSocketMonitoring();
        
        // 3. INICIAR ACTUALIZACIÓN JSON (cada 40 segundos)
        this.startJSONUpdates();
        
        this.showConnectionStatus('connected');
        showNotification('✅ Monitoreo integrado iniciado: WebSocket + JSON + Notificaciones', 'success');
    }

    // DETENER MONITOREO INTEGRADO
    stopIntegratedMonitoring() {
        this.isMonitoring = false;
        
        // Deshabilitar notificaciones
        if (this.notificationSystem) {
            this.notificationSystem.setEnabled(false);
        }
        
        // Detener WebSocket
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        // Detener actualizaciones JSON
        if (this.jsonUpdateInterval) {
            clearInterval(this.jsonUpdateInterval);
            this.jsonUpdateInterval = null;
        }
        
        this.updateMonitoringUI(false);
        this.showConnectionStatus('disconnected');
        showNotification('⏹️ Monitoreo integrado detenido', 'info');
        console.log('⏹️ Monitoreo integrado detenido');
    }

    // INICIAR WEBSOCKET (cada 20 segundos)
    startWebSocketMonitoring() {
        console.log('🔌 Iniciando WebSocket - verificación cada 20s...');
        
        // Verificar inmediatamente
        this.checkWebSocketEvents();
        
        // Configurar verificación periódica WebSocket
        this.pollingInterval = setInterval(() => {
            this.checkWebSocketEvents();
        }, this.websocketCheckInterval);
    }

    // INICIAR ACTUALIZACIONES JSON (cada 40 segundos)
    startJSONUpdates() {
        console.log('📄 Iniciando actualizaciones JSON - cada 40s...');
        
        // Configurar actualización JSON periódica
        this.jsonUpdateInterval = setInterval(async () => {
            await this.loadLatestJSONNews();
        }, this.jsonUpdateInterval_time);
    }

    // VERIFICAR EVENTOS WEBSOCKET
    async checkWebSocketEvents() {
        try {
            console.log('🔍 WebSocket: Verificando eventos rápidos...');
            
            const quickEvents = await this.fetchQuickWebSocketEvents();
            const newEvents = this.filterNewEvents(quickEvents);
            
            if (newEvents.length > 0) {
                console.log(`⚡ WebSocket: ${newEvents.length} eventos rápidos detectados`);
                await this.addNewEventsToMap(newEvents, 'websocket');
                
                // ANALIZAR PARA NOTIFICACIONES INTELIGENTES
                if (this.notificationSystem) {
                    this.notificationSystem.analyzeEvents([...disasterData, ...newEvents]);
                }
            }
            
        } catch (error) {
            console.error('❌ Error en WebSocket:', error);
            this.showConnectionStatus('error');
        }
    }

    // CARGAR NOTICIAS JSON MÁS ACTUALES
    async loadLatestJSONNews() {
        try {
            console.log('📄 JSON: Cargando noticias más actuales...');
            this.showConnectionStatus('updating');
            
            // Guardar eventos anteriores para comparación
            const previousEvents = [...disasterData];
            
            // Obtener noticias más recientes para JSON
            const latestNews = await this.fetchLatestNewsForJSON();
            
            if (latestNews.length > 0) {
                console.log(`📰 JSON: ${latestNews.length} noticias actuales obtenidas`);
                
                // Combinar con eventos existentes
                const combinedEvents = this.mergeEventsIntelligent(disasterData, latestNews);
                const finalEvents = combinedEvents.slice(0, this.maxEvents);
                
                // Actualizar datos globales
                const previousCount = disasterData.length;
                disasterData.length = 0;
                disasterData.push(...finalEvents);
                
                // ANALIZAR CAMBIOS PARA NOTIFICACIONES INTELIGENTES
                if (this.notificationSystem) {
                    this.notificationSystem.analyzeEvents(finalEvents);
                }
                
                // Actualizar mapa completamente
                clearMarkers();
                addMarkersToMap();
                updateStatistics();
                updateLastUpdateTime();
                
                // Crear y descargar JSON actualizado
                const jsonData = {
                    lastUpdated: new Date().toISOString(),
                    totalEvents: finalEvents.length,
                    maxEvents: this.maxEvents,
                    source: "Integrated: WebSocket + Google News + Smart Notifications",
                    updateInterval: this.jsonUpdateInterval_time,
                    events: finalEvents
                };
                               
                const newCount = finalEvents.length - previousCount;
                if (newCount > 0) {
                    showNotification(`📄 JSON: ${newCount} nuevas noticias cargadas`, 'info');
                }
                
                this.showConnectionStatus('connected');
            }
            
        } catch (error) {
            console.error('❌ Error cargando JSON:', error);
            this.showConnectionStatus('error');
        }
    }

    // OBTENER EVENTOS RÁPIDOS WEBSOCKET
    async fetchQuickWebSocketEvents() {
        const urgentQueries = [
            'breaking news war conflict',
            'última hora guerra conflicto',
            'urgente desastre natural',
            'alerta terremoto tsunami',
            'breaking earthquake disaster',
            'urgent attack bombing'
        ];
        
        const quickEvents = [];
        
        for (const query of urgentQueries) {
            try {
                const events = await this.fetchGoogleNewsRSS(query, 'urgent');
                quickEvents.push(...events);
                await this.sleep(100);
            } catch (error) {
                console.warn(`⚠️ Error en query WebSocket "${query}":`, error.message);
            }
        }
        
        return quickEvents.slice(0, 5); // Máximo 5 eventos urgentes
    }

    // OBTENER NOTICIAS PARA JSON (más completas)
    async fetchLatestNewsForJSON() {
        const comprehensiveQueries = [
            { query: 'guerra conflicto armado', type: 'war' },
            { query: 'terremoto tsunami desastre', type: 'natural' },
            { query: 'ataque terrorismo bombing', type: 'war' },
            { query: 'incendio forestal wildfire', type: 'natural' },
            { query: 'accidente avión tren', type: 'accident' },
            { query: 'pandemia virus outbreak', type: 'pandemic' },
            { query: 'huracán ciclón tormenta', type: 'natural' },
            { query: 'explosion industrial', type: 'accident' }
        ];
        
        const allNews = [];
        
        for (const { query, type } of comprehensiveQueries) {
            try {
                const events = await this.fetchGoogleNewsRSS(query, type);
                allNews.push(...events);
                await this.sleep(200);
            } catch (error) {
                console.warn(`⚠️ Error en query JSON "${query}":`, error.message);
            }
        }
        
        // Filtrar y ordenar por fecha (más recientes primero)
        return allNews
            .filter(event => event && event.title)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, this.maxEvents);
    }

    // OBTENER NOTICIAS DE GOOGLE NEWS RSS
    async fetchGoogleNewsRSS(query, type = 'standard') {
        try {
            const encodedQuery = encodeURIComponent(query);
            const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es&gl=ES&ceid=ES:es`;
            
            // Usar un proxy CORS para acceder a Google News
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const items = xmlDoc.querySelectorAll('item');
            const events = [];
            
            for (let i = 0; i < Math.min(items.length, 3); i++) {
                const item = items[i];
                try {
                    const event = await this.parseNewsItem(item, query, type);
                    if (event) events.push(event);
                } catch (parseError) {
                    console.warn('⚠️ Error parseando item:', parseError.message);
                }
            }
            
            return events;
            
        } catch (error) {
            console.error(`❌ Error obteniendo RSS para "${query}":`, error);
            return [];
        }
    }

    // PARSEAR ITEM DE NOTICIA
    async parseNewsItem(item, query, type = 'standard') {
        const title = item.querySelector('title')?.textContent?.trim();
        const link = item.querySelector('link')?.textContent?.trim();
        const pubDate = item.querySelector('pubDate')?.textContent?.trim();
        const description = item.querySelector('description')?.textContent?.trim();
        
        if (!title || !link) return null;
        
        // Filtrar noticias muy antiguas (más de 7 días)
        const articleDate = this.parseRealDate(pubDate);
        const daysDiff = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) return null;
        
        // Determinar tipo de evento si no se especificó
        const eventType = type === 'standard' ? this.determineEventType(title + ' ' + description) : type;
        
        // Extraer ubicación
        const location = this.extractLocation(title + ' ' + description);
        const coordinates = await this.getCoordinatesForLocation(location);
        
        return {
            id: this.generateUniqueId(),
            title: this.cleanTitle(title),
            type: eventType,
            description: this.cleanDescription(description || title),
            location: location,
            coordinates: coordinates,
            date: articleDate.toISOString(),
            severity: this.determineSeverity(title + ' ' + description),
            newsLinks: [{
                title: this.cleanTitle(title),
                url: link,
                source: 'Google News',
                publishedAt: articleDate.toISOString()
            }],
            source: `GoogleNews-${type}`,
            lastUpdated: new Date().toISOString()
        };
    }

    // COMBINAR EVENTOS DE FORMA INTELIGENTE (evitar duplicados)
    mergeEventsIntelligent(existingEvents, newEvents) {
        const combined = [...existingEvents];
        const existingHashes = new Set(existingEvents.map(e => this.generateEventHash(e)));
        
        newEvents.forEach(newEvent => {
            const hash = this.generateEventHash(newEvent);
            if (!existingHashes.has(hash)) {
                combined.push(newEvent);
                existingHashes.add(hash);
            }
        });
        
        // Ordenar por fecha (más recientes primero) y limitar
        return combined
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, this.maxEvents);
    }

    // AGREGAR NUEVOS EVENTOS AL MAPA CON NOTIFICACIONES
    async addNewEventsToMap(newEvents, source) {
        let addedCount = 0;
        
        for (const event of newEvents) {
            // Verificar si ya existe
            const exists = disasterData.some(existing => 
                this.generateEventHash(existing) === this.generateEventHash(event)
            );
            
            if (!exists) {
                // Agregar al array global
                disasterData.unshift(event);
                addedCount++;
                
                // Mantener límite máximo
                if (disasterData.length > this.maxEvents) {
                    disasterData.pop();
                }
                
                // Agregar marcador animado
                this.addAnimatedMarkerToMap(event, source === 'websocket');
                
                // Pequeña pausa para efecto visual
                await this.sleep(500);
            }
        }
        
        if (addedCount > 0) {
            // Actualizar estadísticas
            updateStatistics();
            updateLastUpdateTime();
            this.updateNewEventsCounter();
            
            console.log(`✅ ${addedCount} nuevos eventos agregados desde ${source}`);
        }
    }

    // FILTRAR EVENTOS NUEVOS
    filterNewEvents(events) {
        return events.filter(event => {
            const hash = this.generateEventHash(event);
            return !this.knownEventIds.has(hash);
        });
    }

    // ACTUALIZAR UI DE MONITOREO
    updateMonitoringUI(isActive) {
        const toggleBtn = document.getElementById('toggleMonitoring');
        const stopBtn = document.getElementById('stopMonitoring');
        const statusIndicator = document.getElementById('monitoring-status');
        
        if (toggleBtn) {
            toggleBtn.textContent = isActive ? '⏹️ Detener Monitoreo' : '🔴 Iniciar Monitoreo';
            toggleBtn.className = isActive ? 'btn btn-danger' : 'btn btn-success';
        }
        
        if (statusIndicator) {
            statusIndicator.textContent = isActive ? '🟢 Monitoreo activo' : '🔴 Monitoreo inactivo';
            statusIndicator.className = isActive ? 'status-active' : 'status-inactive';
        }
    }

    // MOSTRAR ESTADO DE CONEXIÓN
    showConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;
        
        const statusConfig = {
            connecting: { text: '🟡 Conectando...', class: 'status-connecting' },
            connected: { text: '🟢 Conectado', class: 'status-connected' },
            updating: { text: '🔄 Actualizando...', class: 'status-updating' },
            error: { text: '🔴 Error de conexión', class: 'status-error' },
            disconnected: { text: '⚫ Desconectado', class: 'status-disconnected' }
        };
        
        const config = statusConfig[status] || statusConfig.disconnected;
        statusElement.textContent = config.text;
        statusElement.className = `connection-status ${config.class}`;
    }

    // GENERAR HASH ÚNICO PARA EVENTO
    generateEventHash(event) {
        const key = `${event.type}_${event.location}_${event.title?.substring(0, 30)}`;
        return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    }

    // GENERAR ID ÚNICO
    generateUniqueId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // PARSEAR FECHA REAL
    parseRealDate(pubDateString) {
        if (!pubDateString) return new Date();
        try {
            return new Date(pubDateString);
        } catch {
            return new Date();
        }
    }

    // DETERMINAR TIPO DE EVENTO
    determineEventType(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.match(/guerra|conflicto|ataque|bombardeo|militar|terrorismo|explosion/)) return 'war';
        if (lowerText.match(/terremoto|tsunami|huracan|incendio|inundacion|volcan|desastre/)) return 'natural';
        if (lowerText.match(/virus|pandemia|brote|epidemia|covid|gripe/)) return 'pandemic';
        if (lowerText.match(/accidente|choque|colision|avion|tren|barco/)) return 'accident';
        
        return 'war'; // Por defecto
    }

    // EXTRAER UBICACIÓN
    extractLocation(text) {
        // Lista de países y ciudades importantes
        const locations = [
            'España', 'Madrid', 'Barcelona', 'Valencia', 'Sevilla',
            'Francia', 'París', 'Lyon', 'Marsella',
            'Italia', 'Roma', 'Milán', 'Nápoles',
            'Alemania', 'Berlín', 'Múnich', 'Hamburgo',
            'Reino Unido', 'Londres', 'Manchester', 'Liverpool',
            'Estados Unidos', 'Nueva York', 'Los Ángeles', 'Chicago',
            'Rusia', 'Moscú', 'San Petersburgo',
            'China', 'Pekín', 'Shanghái', 'Hong Kong',
            'Japón', 'Tokio', 'Osaka', 'Kioto',
            'Ucrania', 'Kiev', 'Járkov',
            'Siria', 'Damasco', 'Alepo',
            'Turquía', 'Estambul', 'Ankara',
            'México', 'Ciudad de México', 'Guadalajara',
            'Brasil', 'São Paulo', 'Río de Janeiro',
            'Argentina', 'Buenos Aires', 'Córdoba',
            'India', 'Nueva Delhi', 'Bombay',
            'Pakistán', 'Islamabad', 'Karachi'
        ];
        
        for (const location of locations) {
            if (text.toLowerCase().includes(location.toLowerCase())) {
                return location;
            }
        }
        
        return 'Ubicación no especificada';
    }

    // OBTENER COORDENADAS PARA UBICACIÓN
    async getCoordinatesForLocation(location) {
        const coordinates = {
            'España': [40.4168, -3.7038],
            'Madrid': [40.4168, -3.7038],
            'Barcelona': [41.3851, 2.1734],
            'Francia': [46.6034, 1.8883],
            'París': [48.8566, 2.3522],
            'Italia': [41.8719, 12.5674],
            'Roma': [41.8719, 12.5674],
            'Alemania': [51.1657, 10.4515],
            'Berlín': [52.5200, 13.4050],
            'Reino Unido': [55.3781, -3.4360],
            'Londres': [51.5074, -0.1278],
            'Estados Unidos': [37.0902, -95.7129],
            'Nueva York': [40.7128, -74.0060],
            'Rusia': [61.5240, 105.3188],
            'Moscú': [55.7558, 37.6173],
            'China': [35.8617, 104.1954],
            'Pekín': [39.9042, 116.4074],
            'Japón': [36.2048, 138.2529],
            'Tokio': [35.6762, 139.6503],
            'Ucrania': [48.3794, 31.1656],
            'Kiev': [50.4501, 30.5234],
            'Siria': [34.8021, 38.9968],
            'Turquía': [38.9637, 35.2433],
            'México': [23.6345, -102.5528],
            'Brasil': [-14.2350, -51.9253],
            'India': [20.5937, 78.9629]
        };
        
        return coordinates[location] || [0, 0];
    }

    // DETERMINAR SEVERIDAD
    determineSeverity(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.match(/devastador|catastrofico|masivo|grave|critico|severo/)) return 'high';
        if (lowerText.match(/importante|significativo|considerable|serio/)) return 'medium';
        return 'low';
    }

    // LIMPIAR TÍTULO
    cleanTitle(title) {
        return title.replace(/\s+/g, ' ').trim().substring(0, 100);
    }

    // LIMPIAR DESCRIPCIÓN
    cleanDescription(description) {
        return description.replace(/\s+/g, ' ').trim().substring(0, 200);
    }

    // AGREGAR MARCADOR ANIMADO AL MAPA
    addAnimatedMarkerToMap(event, isUrgent = false) {
        if (!window.map || !event.coordinates) return;
        
        const color = getMarkerColor(event.type);
        const size = isUrgent ? 'large' : getMarkerSize(event.severity);
        
        const marker = L.circleMarker(event.coordinates, {
            radius: size === 'large' ? 12 : (size === 'medium' ? 8 : 6),
            fillColor: color,
            color: isUrgent ? '#FFD700' : '#fff',
            weight: isUrgent ? 3 : 2,
            opacity: 1,
            fillOpacity: 0.8,
            className: isUrgent ? 'urgent-marker' : 'new-marker'
        });
        
        // Popup content
        const popupContent = createPopupContent(event);
        marker.bindPopup(popupContent);
        
        // Agregar al mapa con animación
        marker.addTo(window.map);
        markers.push(marker);
        
        // Animación de entrada para eventos urgentes
        if (isUrgent) {
            marker.setStyle({ radius: 20, fillOpacity: 0.3 });
            setTimeout(() => {
                marker.setStyle({ 
                    radius: 12, 
                    fillOpacity: 0.8,
                    color: color,
                    weight: 2
                });
            }, 1000);
        }
    }

    // REMOVER EVENTO MÁS ANTIGUO
    removeOldestEvent() {
        if (disasterData.length > 0) {
            disasterData.pop();
            
            // Remover último marcador
            if (markers.length > 0) {
                const lastMarker = markers.pop();
                if (window.map && lastMarker) {
                    window.map.removeLayer(lastMarker);
                }
            }
        }
    }

    // DESCARGAR JSON
    downloadJSON(jsonData, filename) {
        try {
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`📁 JSON descargado: ${filename}`);
        } catch (error) {
            console.error('❌ Error descargando JSON:', error);
        }
    }

    // ACTUALIZAR CONTADOR DE EVENTOS NUEVOS
    updateNewEventsCounter() {
        this.newEventsToday++;
        const counter = document.getElementById('new-events-counter');
        if (counter) {
            counter.textContent = this.newEventsToday;
        }
    }

    // HELPER: SLEEP
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar sistema integrado
const integratedMonitoring = new IntegratedMonitoringSystem();

// Exportar para uso global
window.integratedMonitoring = integratedMonitoring; 