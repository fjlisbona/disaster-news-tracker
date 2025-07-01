// Sistema para actualizar JSON con noticias de Google News en tiempo real
class JSONNewsUpdater {
    constructor() {
        this.jsonUrl = './events.json'; // URL del archivo JSON
        this.updateInterval = 30000; // 30 segundos
        this.maxEvents = 15;
        this.isUpdating = false;
        this.updateTimer = null;
        
        // Configurar el sistema
        this.setupEventListeners();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botón para cargar JSON
        const loadJsonBtn = document.createElement('button');
        loadJsonBtn.id = 'loadJsonBtn';
        loadJsonBtn.className = 'btn btn-info btn-sm mb-2 w-100';
        loadJsonBtn.innerHTML = '<i class="fas fa-file-import"></i> Cargar desde JSON';
        loadJsonBtn.onclick = () => this.loadEventsFromJSON();

        // Botón para iniciar actualización automática
        const autoUpdateBtn = document.createElement('button');
        autoUpdateBtn.id = 'autoUpdateBtn';
        autoUpdateBtn.className = 'btn btn-warning btn-sm mb-2 w-100';
        autoUpdateBtn.innerHTML = '<i class="fas fa-sync"></i> Auto-actualizar JSON';
        autoUpdateBtn.onclick = () => this.startAutoUpdate();

        // Botón para detener actualización
        const stopUpdateBtn = document.createElement('button');
        stopUpdateBtn.id = 'stopUpdateBtn';
        stopUpdateBtn.className = 'btn btn-secondary btn-sm mb-2 w-100';
        stopUpdateBtn.innerHTML = '<i class="fas fa-stop"></i> Detener Auto-actualización';
        stopUpdateBtn.style.display = 'none';
        stopUpdateBtn.onclick = () => this.stopAutoUpdate();

        // Agregar botones a los controles del mapa
        const mapControls = document.querySelector('.map-controls');
        if (mapControls) {
            mapControls.appendChild(loadJsonBtn);
            mapControls.appendChild(autoUpdateBtn);
            mapControls.appendChild(stopUpdateBtn);
        }
    }

    // Cargar eventos desde JSON
    async loadEventsFromJSON() {
        try {
            showLoading(true);
            console.log('📄 Cargando eventos desde JSON...');

            // Intentar cargar desde archivo local primero
            let jsonData;
            try {
                const response = await fetch(this.jsonUrl);
                if (response.ok) {
                    jsonData = await response.json();
                } else {
                    throw new Error('Archivo no encontrado');
                }
            } catch (error) {
                // Si no existe el archivo, crear uno nuevo con eventos actuales
                console.log('📝 Creando nuevo archivo JSON con noticias actuales...');
                jsonData = await this.createInitialJSON();
            }

            // Limpiar datos actuales
            disasterData.length = 0;
            clearMarkers();

            // Cargar eventos del JSON
            if (jsonData.events && Array.isArray(jsonData.events)) {
                disasterData.push(...jsonData.events.slice(0, this.maxEvents));
                
                // Agregar marcadores al mapa
                addMarkersToMap();
                
                // Actualizar estadísticas
                updateStatistics();
                updateLastUpdateTime();

                showNotification(`✅ ${disasterData.length} eventos cargados desde JSON`, 'success');
                console.log(`📊 Eventos cargados:`, disasterData);
            } else {
                throw new Error('Formato de JSON inválido');
            }

        } catch (error) {
            console.error('❌ Error cargando JSON:', error);
            showNotification('❌ Error cargando archivo JSON', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Crear JSON inicial con eventos actuales
    async createInitialJSON() {
        const initialEvents = await this.fetchLatestNewsForJSON();
        
        const jsonStructure = {
            lastUpdated: new Date().toISOString(),
            totalEvents: initialEvents.length,
            maxEvents: this.maxEvents,
            source: "Google News Real-time",
            updateInterval: this.updateInterval,
            events: initialEvents
        };

        // Crear y descargar el archivo JSON inicial
        this.downloadJSON(jsonStructure, 'events-initial.json');
        
        return jsonStructure;
    }

    // Iniciar actualización automática del JSON
    async startAutoUpdate() {
        if (this.isUpdating) {
            showNotification('⚠️ La actualización automática ya está activa', 'warning');
            return;
        }

        this.isUpdating = true;
        console.log('🔄 Iniciando actualización automática del JSON...');

        // Actualizar UI
        document.getElementById('autoUpdateBtn').style.display = 'none';
        document.getElementById('stopUpdateBtn').style.display = 'block';

        // Actualizar inmediatamente
        await this.updateJSONWithLatestNews();

        // Configurar actualización periódica
        this.updateTimer = setInterval(async () => {
            await this.updateJSONWithLatestNews();
        }, this.updateInterval);

        showNotification('🔄 Auto-actualización del JSON iniciada', 'success');
    }

    // Detener actualización automática
    stopAutoUpdate() {
        this.isUpdating = false;
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        // Actualizar UI
        document.getElementById('autoUpdateBtn').style.display = 'block';
        document.getElementById('stopUpdateBtn').style.display = 'none';

        showNotification('⏹️ Auto-actualización del JSON detenida', 'info');
        console.log('⏹️ Auto-actualización detenida');
    }

    // Actualizar JSON con últimas noticias
    async updateJSONWithLatestNews() {
        try {
            console.log('🔍 Actualizando JSON con últimas noticias...');

            // Obtener noticias más recientes
            const latestNews = await this.fetchLatestNewsForJSON();
            
            // Combinar con eventos existentes (evitar duplicados)
            const combinedEvents = this.mergeEvents(disasterData, latestNews);
            
            // Limitar a máximo de eventos
            const finalEvents = combinedEvents.slice(0, this.maxEvents);

            // Crear estructura JSON actualizada
            const updatedJSON = {
                lastUpdated: new Date().toISOString(),
                totalEvents: finalEvents.length,
                maxEvents: this.maxEvents,
                source: "Google News Real-time",
                updateInterval: this.updateInterval,
                events: finalEvents
            };

            // Actualizar datos en la aplicación
            disasterData.length = 0;
            disasterData.push(...finalEvents);
            
            // Actualizar mapa
            clearMarkers();
            addMarkersToMap();
            updateStatistics();
            updateLastUpdateTime();

            // Descargar JSON actualizado
            this.downloadJSON(updatedJSON, `events-updated-${new Date().toISOString().split('T')[0]}.json`);

            console.log(`✅ JSON actualizado con ${finalEvents.length} eventos`);
            showNotification(`📄 JSON actualizado con ${finalEvents.length} eventos`, 'info');

        } catch (error) {
            console.error('❌ Error actualizando JSON:', error);
            showNotification('❌ Error actualizando JSON', 'error');
        }
    }

    // Obtener noticias más recientes para JSON (SIN FILTRO DE FECHA)
    async fetchLatestNewsForJSON() {
        const newsQueries = [
            'guerra conflicto armado',
            'terremoto tsunami',
            'ataque terrorista',
            'emergencia nuclear',
            'erupción volcánica',
            'huracán ciclón',
            'incendio forestal',
            'accidente industrial',
            'crisis humanitaria',
            'pandemia virus brote'
        ];

        const allEvents = [];

        for (const query of newsQueries) {
            try {
                const events = await this.fetchGoogleNewsRSS(query);
                allEvents.push(...events);
                await this.sleep(300); // Pausa entre consultas
            } catch (error) {
                console.warn(`⚠️ Error con query "${query}":`, error.message);
            }
        }

        // Filtrar eventos válidos y ordenar por fecha (más recientes primero)
        const filteredEvents = allEvents
            .filter(event => event && event.title && event.location)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, this.maxEvents);

        console.log(`📰 Noticias obtenidas: ${filteredEvents.length} eventos`);
        filteredEvents.forEach(event => {
            console.log(`📅 ${event.date} - ${event.title} (${event.location})`);
        });

        return filteredEvents;
    }

    // Obtener noticias desde Google News RSS
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

            for (let i = 0; i < Math.min(items.length, 3); i++) {
                const item = items[i];
                const event = await this.parseNewsItemForJSON(item, query);
                if (event) {
                    events.push(event);
                }
            }

            return events;

        } catch (error) {
            console.warn(`⚠️ Error RSS para "${query}":`, error.message);
            return [];
        }
    }

    // Parsear item de noticia para JSON (FECHA REAL DE LA NOTICIA)
    async parseNewsItemForJSON(item, query) {
        try {
            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const source = item.querySelector('source')?.textContent || 'Google News';

            // Determinar tipo de evento
            const eventType = this.determineEventType(title + ' ' + description);
            
            // Extraer ubicación
            const location = this.extractLocation(title + ' ' + description);
            const coordinates = this.getCoordinatesForLocation(location);

            // USAR FECHA REAL DE LA NOTICIA (sin forzar 2025)
            const realDate = this.parseRealDate(pubDate);

            // Crear evento en formato JSON
            return {
                id: this.generateUniqueId(),
                title: this.cleanTitle(title),
                type: eventType,
                description: this.cleanDescription(description) || `Evento reportado en ${location}`,
                location: location,
                coordinates: coordinates,
                date: realDate, // Fecha real de la noticia
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
            console.warn('⚠️ Error parseando noticia para JSON:', error);
            return null;
        }
    }

    // Parsear fecha real de la noticia (SIN FORZAR AÑO)
    parseRealDate(pubDateString) {
        try {
            if (!pubDateString) {
                return new Date().toISOString().split('T')[0];
            }

            // Parsear la fecha tal como viene de la noticia
            const parsedDate = new Date(pubDateString);
            
            // Verificar si la fecha es válida
            if (isNaN(parsedDate.getTime())) {
                console.warn('⚠️ Fecha inválida, usando fecha actual:', pubDateString);
                return new Date().toISOString().split('T')[0];
            }

            // Devolver la fecha real en formato YYYY-MM-DD
            const realDate = parsedDate.toISOString().split('T')[0];
            console.log(`📅 Fecha real de noticia: ${realDate} (original: ${pubDateString})`);
            
            return realDate;

        } catch (error) {
            console.warn('⚠️ Error parseando fecha, usando actual:', error);
            return new Date().toISOString().split('T')[0];
        }
    }

    // Combinar eventos existentes con nuevos (evitar duplicados)
    mergeEvents(existingEvents, newEvents) {
        const combined = [...existingEvents];
        const existingTitles = new Set(existingEvents.map(e => e.title.toLowerCase()));

        for (const newEvent of newEvents) {
            if (!existingTitles.has(newEvent.title.toLowerCase())) {
                combined.push(newEvent);
                existingTitles.add(newEvent.title.toLowerCase());
            }
        }

        // Ordenar por fecha (más recientes primero)
        return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Descargar JSON
    downloadJSON(jsonData, filename) {
        const dataStr = JSON.stringify(jsonData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // Funciones auxiliares
    generateUniqueId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    determineEventType(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('guerra') || lowerText.includes('conflicto') || 
            lowerText.includes('ataque') || lowerText.includes('bombardeo') ||
            lowerText.includes('militar') || lowerText.includes('terrorista')) {
            return 'war';
        }
        
        if (lowerText.includes('terremoto') || lowerText.includes('tsunami') ||
            lowerText.includes('huracán') || lowerText.includes('volcán') ||
            lowerText.includes('incendio') || lowerText.includes('inundación') ||
            lowerText.includes('ciclón') || lowerText.includes('tifón')) {
            return 'natural';
        }
        
        if (lowerText.includes('virus') || lowerText.includes('pandemia') ||
            lowerText.includes('brote') || lowerText.includes('epidemia') ||
            lowerText.includes('covid') || lowerText.includes('gripe')) {
            return 'pandemic';
        }
        
        return 'accident';
    }

    extractLocation(text) {
        const locations = {
            'España': [40.4637, -3.7492],
            'Francia': [46.6034, 1.8883],
            'Alemania': [51.1657, 10.4515],
            'Italia': [41.8719, 12.5674],
            'Reino Unido': [55.3781, -3.4360],
            'Estados Unidos': [37.0902, -95.7129],
            'México': [23.6345, -102.5528],
            'Brasil': [14.2350, -51.9253],
            'Argentina': [-38.4161, -63.6167],
            'Chile': [-35.6751, -71.5430],
            'Colombia': [4.5709, -74.2973],
            'Perú': [-9.1900, -75.0152],
            'Venezuela': [6.4238, -66.5897],
            'Ucrania': [48.3794, 31.1656],
            'Rusia': [61.5240, 105.3188],
            'China': [35.8617, 104.1954],
            'Japón': [36.2048, 138.2529],
            'India': [20.5937, 78.9629],
            'Corea del Sur': [35.9078, 127.7669],
            'Filipinas': [12.8797, 121.7740],
            'Indonesia': [-0.7893, 113.9213],
            'Australia': [-25.2744, 133.7751],
            'Turquía': [38.9637, 35.2433],
            'Irán': [32.4279, 53.6880],
            'Israel': [31.0461, 34.8516],
            'Gaza': [31.3547, 34.3088],
            'Siria': [34.8021, 38.9968],
            'Irak': [33.2232, 43.6793],
            'Afganistán': [33.9391, 67.7100],
            'Pakistán': [30.3753, 69.3451],
            'Sudán': [12.8628, 30.2176],
            'Etiopía': [9.1450, 40.4897],
            'Nigeria': [9.0820, 8.6753],
            'Sudáfrica': [-30.5595, 22.9375]
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
            'España': [40.4637, -3.7492],
            'Francia': [46.6034, 1.8883],
            'Alemania': [51.1657, 10.4515],
            'Italia': [41.8719, 12.5674],
            'Reino Unido': [55.3781, -3.4360],
            'Estados Unidos': [37.0902, -95.7129],
            'México': [23.6345, -102.5528],
            'Brasil': [14.2350, -51.9253],
            'Argentina': [-38.4161, -63.6167],
            'Chile': [-35.6751, -71.5430],
            'Colombia': [4.5709, -74.2973],
            'Perú': [-9.1900, -75.0152],
            'Venezuela': [6.4238, -66.5897],
            'Ucrania': [48.3794, 31.1656],
            'Rusia': [61.5240, 105.3188],
            'China': [35.8617, 104.1954],
            'Japón': [36.2048, 138.2529],
            'India': [20.5937, 78.9629],
            'Corea del Sur': [35.9078, 127.7669],
            'Filipinas': [12.8797, 121.7740],
            'Indonesia': [-0.7893, 113.9213],
            'Australia': [-25.2744, 133.7751],
            'Turquía': [38.9637, 35.2433],
            'Irán': [32.4279, 53.6880],
            'Israel': [31.0461, 34.8516],
            'Gaza': [31.3547, 34.3088],
            'Siria': [34.8021, 38.9968],
            'Irak': [33.2232, 43.6793],
            'Afganistán': [33.9391, 67.7100],
            'Pakistán': [30.3753, 69.3451],
            'Sudán': [12.8628, 30.2176],
            'Etiopía': [9.1450, 40.4897],
            'Nigeria': [9.0820, 8.6753],
            'Sudáfrica': [-30.5595, 22.9375]
        };

        return locations[location] || [0, 0];
    }

    determineSeverity(text) {
        const lowerText = text.toLowerCase();
        
        const highKeywords = ['muertos', 'víctimas', 'masacre', 'devastador', 'catástrofe', 'emergencia', 'evacuación', 'crítico', 'grave'];
        const mediumKeywords = ['heridos', 'daños', 'alerta', 'riesgo', 'amenaza', 'conflicto', 'tensión'];
        
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar el sistema JSON
let jsonNewsUpdater;

// Función para cargar archivo JSON personalizado
function loadCustomJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const text = await file.text();
                const jsonData = JSON.parse(text);
                
                if (jsonData.events && Array.isArray(jsonData.events)) {
                    // Limpiar datos actuales
                    disasterData.length = 0;
                    clearMarkers();
                    
                    // Cargar eventos del JSON
                    disasterData.push(...jsonData.events.slice(0, 15));
                    
                    // Actualizar mapa
                    addMarkersToMap();
                    updateStatistics();
                    updateLastUpdateTime();
                    
                    showNotification(`✅ ${disasterData.length} eventos cargados desde ${file.name}`, 'success');
                } else {
                    throw new Error('Formato de JSON inválido');
                }
            } catch (error) {
                showNotification('❌ Error leyendo archivo JSON: ' + error.message, 'error');
            }
        }
    };
    input.click();
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof map !== 'undefined') {
            jsonNewsUpdater = new JSONNewsUpdater();
            
            // Agregar botón para cargar JSON personalizado
            const customJsonBtn = document.createElement('button');
            customJsonBtn.className = 'btn btn-outline-info btn-sm mb-2 w-100';
            customJsonBtn.innerHTML = '<i class="fas fa-upload"></i> Subir JSON Personalizado';
            customJsonBtn.onclick = loadCustomJSON;
            
            const mapControls = document.querySelector('.map-controls');
            if (mapControls) {
                mapControls.appendChild(customJsonBtn);
            }
            
            console.log('✅ Sistema JSON inicializado');
        }
    }, 2000);
});

// Exportar funciones
window.jsonNewsUpdater = jsonNewsUpdater;
window.loadCustomJSON = loadCustomJSON; 