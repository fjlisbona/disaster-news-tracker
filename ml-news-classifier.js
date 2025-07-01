// Sistema de clasificación de noticias con Machine Learning (Sin Descargas Automáticas)
class MLNewsClassifier {
    constructor() {
        this.isInitialized = false;
        this.model = null;
        this.vectorizer = null;
        this.categories = ['war', 'natural', 'pandemic', 'accident'];
        this.maxEvents = 15;
        this.generatedJSON = null;
        this.generatedEvents = [];
        this.isProcessing = false;
        this.localJSONData = null; // Almacenar JSON sin descargar
        
        // Palabras clave para entrenamiento inicial
        this.trainingData = {
            war: [
                'guerra', 'conflicto', 'ataque', 'bombardeo', 'militar', 'terrorismo', 
                'explosión', 'batalla', 'invasión', 'combate', 'armado', 'soldados',
                'war', 'attack', 'bombing', 'military', 'terrorism', 'conflict'
            ],
            natural: [
                'terremoto', 'tsunami', 'huracán', 'incendio', 'inundación', 'volcán',
                'desastre', 'tormenta', 'ciclón', 'sequía', 'avalancha', 'deslizamiento',
                'earthquake', 'hurricane', 'flood', 'wildfire', 'volcano', 'disaster'
            ],
            pandemic: [
                'virus', 'pandemia', 'brote', 'epidemia', 'covid', 'gripe', 'enfermedad',
                'contagio', 'infección', 'vacuna', 'salud', 'médico', 'hospital',
                'pandemic', 'outbreak', 'virus', 'disease', 'infection', 'vaccine'
            ],
            accident: [
                'accidente', 'choque', 'colisión', 'avión', 'tren', 'barco', 'auto',
                'industrial', 'explosión', 'derrame', 'químico', 'nuclear', 'fuga',
                'accident', 'crash', 'collision', 'plane', 'train', 'industrial'
            ]
        };
        
        this.initializeML();
    }

    // Inicializar sistema de ML
    async initializeML() {
        try {
            console.log('🤖 Inicializando clasificador ML...');
            // NO mostrar notificación hasta que esté completamente listo
            
            await this.createSimpleClassifier();
            this.isInitialized = true;
            console.log('✅ Clasificador ML inicializado correctamente');
            
            // Generar JSON automáticamente al cargar (SIN mostrar marcadores aún)
            await this.generateClassifiedEventsJSON();
            
        } catch (error) {
            console.error('❌ Error inicializando ML:', error);
            this.isInitialized = true;
            await this.generateClassifiedEventsJSON();
        }
    }

    // Crear clasificador simple basado en palabras clave ponderadas
    async createSimpleClassifier() {
        console.log('📚 Creando clasificador basado en palabras clave...');
        
        this.vectorizer = {
            vocabulary: new Map(),
            idf: new Map()
        };
        
        // Construir vocabulario
        let wordId = 0;
        for (const [category, words] of Object.entries(this.trainingData)) {
            for (const word of words) {
                if (!this.vectorizer.vocabulary.has(word.toLowerCase())) {
                    this.vectorizer.vocabulary.set(word.toLowerCase(), wordId++);
                }
            }
        }
        
        // Calcular IDF
        const totalCategories = Object.keys(this.trainingData).length;
        for (const [word, id] of this.vectorizer.vocabulary) {
            let docFreq = 0;
            for (const [category, words] of Object.entries(this.trainingData)) {
                if (words.some(w => w.toLowerCase() === word)) {
                    docFreq++;
                }
            }
            this.vectorizer.idf.set(word, Math.log(totalCategories / (docFreq + 1)));
        }
        
        console.log(`📊 Vocabulario creado: ${this.vectorizer.vocabulary.size} palabras`);
    }

    // Clasificar texto usando el modelo
    classifyText(text) {
        if (!this.isInitialized) {
            return this.fallbackClassification(text);
        }
        
        const lowerText = text.toLowerCase();
        const scores = {};
        
        // Inicializar scores
        for (const category of this.categories) {
            scores[category] = 0;
        }
        
        // Calcular scores TF-IDF
        for (const [category, keywords] of Object.entries(this.trainingData)) {
            let categoryScore = 0;
            let matchCount = 0;
            
            for (const keyword of keywords) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    const tf = (lowerText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
                    const idf = this.vectorizer.idf.get(keyword.toLowerCase()) || 1;
                    categoryScore += tf * idf;
                    matchCount++;
                }
            }
            
            if (matchCount > 0) {
                scores[category] = categoryScore / matchCount;
            }
        }
        
        // Encontrar categoría con mayor score
        const bestCategory = Object.keys(scores).reduce((a, b) => 
            scores[a] > scores[b] ? a : b
        );
        
        const confidence = scores[bestCategory] / (Object.values(scores).reduce((a, b) => a + b, 0) || 1);
        
        return {
            category: bestCategory,
            confidence: confidence,
            scores: scores
        };
    }

    // Clasificación de respaldo
    fallbackClassification(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.match(/guerra|conflicto|ataque|bombardeo|militar|terrorismo|explosión/)) {
            return { category: 'war', confidence: 0.8, scores: { war: 0.8 } };
        }
        if (lowerText.match(/terremoto|tsunami|huracán|incendio|inundación|volcán|desastre/)) {
            return { category: 'natural', confidence: 0.8, scores: { natural: 0.8 } };
        }
        if (lowerText.match(/virus|pandemia|brote|epidemia|covid|gripe/)) {
            return { category: 'pandemic', confidence: 0.8, scores: { pandemic: 0.8 } };
        }
        if (lowerText.match(/accidente|choque|colisión|avión|tren|barco/)) {
            return { category: 'accident', confidence: 0.8, scores: { accident: 0.8 } };
        }
        
        return { category: 'war', confidence: 0.5, scores: { war: 0.5 } };
    }

    // FUNCIÓN PRINCIPAL: Generar JSON con 15 eventos clasificados (SIN DESCARGAS)
    async generateClassifiedEventsJSON() {
        try {
            this.isProcessing = true;
            console.log('📰 Iniciando clasificación de noticias...');
            
            const rawNews = await this.fetchNewsFromMultipleSources();
            
            if (rawNews.length === 0) {
                console.log('ℹ️ No se obtuvieron noticias en este momento');
                this.generatedEvents = [];
                this.isProcessing = false;
                return;
            }
            
            console.log(`🔍 Clasificando ${rawNews.length} noticias...`);
            
            const classifiedEvents = [];
            for (const news of rawNews) {
                try {
                    const classification = this.classifyText(news.title + ' ' + news.description);
                    
                    if (classification.confidence > 0.2) {
                        const event = await this.convertNewsToEvent(news, classification);
                        if (event) {
                            classifiedEvents.push(event);
                        }
                    }
                } catch (eventError) {
                    console.warn('⚠️ Error procesando noticia:', eventError.message);
                    continue;
                }
            }
            
            const validEvents = classifiedEvents.filter(event => 
                event && 
                event.coordinates && 
                event.coordinates[0] !== 0 && 
                event.coordinates[1] !== 0 &&
                event.title && 
                event.title.length > 10
            );
            
            if (validEvents.length === 0) {
                console.log('ℹ️ No se generaron eventos válidos en esta ejecución');
                this.generatedEvents = [];
                this.isProcessing = false;
                return;
            }
            
            this.generatedEvents = validEvents
                .sort((a, b) => {
                    if (a.mlConfidence !== b.mlConfidence) {
                        return b.mlConfidence - a.mlConfidence;
                    }
                    return new Date(b.date) - new Date(a.date);
                })
                .slice(0, this.maxEvents);
            
            // Crear estructura JSON completa
            this.generatedJSON = {
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    totalEvents: this.generatedEvents.length,
                    maxEvents: this.maxEvents,
                    source: "ML Classified Google News",
                    mlModel: "TF-IDF + Keyword Classification",
                    generatedAt: new Date().toISOString(),
                    averageConfidence: this.calculateAverageConfidence(this.generatedEvents),
                    version: "1.0.0"
                },
                statistics: {
                    byType: this.getEventsByType(this.generatedEvents),
                    bySeverity: this.getEventsBySeverity(this.generatedEvents),
                    byConfidence: this.getConfidenceDistribution(this.generatedEvents)
                },
                events: this.generatedEvents
            };
            
            // ALMACENAR JSON LOCALMENTE (SIN DESCARGAR)
            this.storeJSONLocally();
            
            console.log(`✅ ${this.generatedEvents.length} eventos clasificados correctamente`);
            
            // Mostrar información en consola
            this.displayJSONInfo();
            
            // Cargar en mapa
            this.loadEventsIntoMap();
            
            this.isProcessing = false;
            
        } catch (error) {
            console.error('❌ Error en clasificación ML:', error);
            this.generatedEvents = [];
            this.isProcessing = false;
        }
    }

    // ALMACENAR JSON LOCALMENTE (SIN DESCARGAR)
    storeJSONLocally() {
        try {
            const jsonString = JSON.stringify(this.generatedJSON, null, 2);
            const filename = `ml-classified-events-${new Date().toISOString().split('T')[0]}.json`;
            
            // Almacenar en memoria local
            this.localJSONData = {
                filename: filename,
                content: jsonString,
                size: new Blob([jsonString]).size,
                timestamp: new Date().toISOString(),
                events: this.generatedEvents.length
            };
            
            // Almacenar en localStorage para persistencia
            try {
                localStorage.setItem('mlClassifiedEvents', jsonString);
                localStorage.setItem('mlClassifiedEventsMetadata', JSON.stringify({
                    filename: filename,
                    timestamp: new Date().toISOString(),
                    events: this.generatedEvents.length,
                    size: this.localJSONData.size
                }));
                console.log(`💾 JSON almacenado localmente: ${filename}`);
            } catch (storageError) {
                console.warn('⚠️ No se pudo guardar en localStorage:', storageError.message);
            }
            
            // Simular creación de archivo en consola
            console.log('📁 ARCHIVO JSON CREADO LOCALMENTE:');
            console.log('================================');
            console.log(`📄 Nombre: ${filename}`);
            console.log(`📊 Tamaño: ${(this.localJSONData.size / 1024).toFixed(2)} KB`);
            console.log(`🎯 Eventos: ${this.generatedEvents.length}`);
            console.log(`⏰ Creado: ${new Date().toLocaleString()}`);
            console.log('================================');
            
            // Crear preview en interfaz (SIN botón de descarga automática)
            this.createLocalJSONPreview();
            
        } catch (error) {
            console.error('❌ Error almacenando JSON localmente:', error);
        }
    }

    // CREAR PREVIEW DEL JSON LOCAL (SIN DESCARGAS AUTOMÁTICAS)
    createLocalJSONPreview() {
        let container = document.getElementById('json-preview-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'json-preview-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 320px;
                max-height: 250px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                overflow-y: auto;
                border: 1px solid #333;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            `;
            document.body.appendChild(container);
        }
        
        container.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #4CAF50;">
                📁 Archivo JSON Local
            </div>
            <div style="margin-bottom: 5px; color: #E0E0E0;">
                📄 ${this.localJSONData.filename}
            </div>
            <div style="margin-bottom: 5px;">
                📊 Eventos: ${this.generatedEvents.length}
            </div>
            <div style="margin-bottom: 5px;">
                💾 Tamaño: ${(this.localJSONData.size / 1024).toFixed(2)} KB
            </div>
            <div style="margin-bottom: 5px;">
                🎯 Confianza: ${(this.calculateAverageConfidence(this.generatedEvents) * 100).toFixed(1)}%
            </div>
            <div style="margin-bottom: 10px; color: #A0A0A0; font-size: 10px;">
                ⏰ ${new Date().toLocaleTimeString()}
            </div>
            <div style="margin-bottom: 10px;">
                <button onclick="window.mlClassifier.showJSONContent()" style="
                    background: #2196F3;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 5px;
                    font-size: 10px;
                ">Ver Contenido</button>
                <button onclick="window.mlClassifier.copyJSONToClipboard()" style="
                    background: #FF9800;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 5px;
                    font-size: 10px;
                ">Copiar JSON</button>
            </div>
            <div style="margin-bottom: 10px;">
                <button onclick="window.mlClassifier.saveJSONManually()" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 5px;
                    font-size: 10px;
                ">Guardar Como...</button>
                <button onclick="window.mlClassifier.hidePreview()" style="
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                ">Ocultar</button>
            </div>
            <div style="font-size: 10px; color: #888; line-height: 1.3;">
                💡 El archivo se almacena localmente sin descargas automáticas
            </div>
        `;
    }

    // MOSTRAR CONTENIDO DEL JSON EN CONSOLA
    showJSONContent() {
        if (this.localJSONData) {
            console.log('📄 CONTENIDO DEL JSON LOCAL:');
            console.log('============================');
            console.log(this.localJSONData.content);
            console.log('============================');
            showNotification('📄 Contenido JSON mostrado en consola', 'info');
        }
    }

    // COPIAR JSON AL PORTAPAPELES
    async copyJSONToClipboard() {
        if (this.localJSONData) {
            try {
                await navigator.clipboard.writeText(this.localJSONData.content);
                showNotification('📋 JSON copiado al portapapeles', 'success');
            } catch (error) {
                console.error('Error copiando al portapapeles:', error);
                
                // Fallback: crear textarea temporal
                const textarea = document.createElement('textarea');
                textarea.value = this.localJSONData.content;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                
                showNotification('📋 JSON copiado al portapapeles (fallback)', 'success');
            }
        }
    }

    // GUARDAR JSON MANUALMENTE (SOLO SI EL USUARIO LO SOLICITA)
    saveJSONManually() {
        if (this.localJSONData) {
            try {
                const blob = new Blob([this.localJSONData.content], { 
                    type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = this.localJSONData.filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showNotification('💾 JSON guardado manualmente', 'success');
            } catch (error) {
                console.error('Error guardando JSON:', error);
                showNotification('❌ Error guardando archivo', 'error');
            }
        }
    }

    // MOSTRAR INFORMACIÓN DEL JSON
    displayJSONInfo() {
        console.log('📊 INFORMACIÓN DEL JSON GENERADO:');
        console.log('=================================');
        console.log(`   📄 Archivo: ${this.localJSONData.filename}`);
        console.log(`   📊 Total eventos: ${this.generatedEvents.length}`);
        console.log(`   💾 Tamaño: ${(this.localJSONData.size / 1024).toFixed(2)} KB`);
        console.log(`   🎯 Confianza promedio: ${(this.calculateAverageConfidence(this.generatedEvents) * 100).toFixed(1)}%`);
        console.log(`   📈 Por tipo:`, this.getEventsByType(this.generatedEvents));
        console.log(`   ⚡ Por severidad:`, this.getEventsBySeverity(this.generatedEvents));
        console.log('=================================');
    }

    // CARGAR JSON DESDE LOCALSTORAGE
    loadJSONFromLocalStorage() {
        try {
            const storedJSON = localStorage.getItem('mlClassifiedEvents');
            const storedMetadata = localStorage.getItem('mlClassifiedEventsMetadata');
            
            if (storedJSON && storedMetadata) {
                const metadata = JSON.parse(storedMetadata);
                const jsonData = JSON.parse(storedJSON);
                
                // Verificar si los datos no son muy antiguos (máximo 1 hora)
                const dataAge = Date.now() - new Date(metadata.timestamp).getTime();
                const maxAge = 60 * 60 * 1000; // 1 hora
                
                if (dataAge < maxAge && jsonData.events) {
                    console.log(`📁 Cargando datos desde localStorage: ${metadata.events} eventos`);
                    this.generatedEvents = jsonData.events;
                    this.generatedJSON = jsonData;
                    this.localJSONData = {
                        filename: metadata.filename,
                        content: storedJSON,
                        size: metadata.size,
                        timestamp: metadata.timestamp,
                        events: metadata.events
                    };
                    return true;
                }
            }
        } catch (error) {
            console.warn('⚠️ Error cargando desde localStorage:', error);
        }
        return false;
    }

    // FUNCIÓN PÚBLICA MEJORADA
    async generateClassifiedEvents() {
        try {
            // Intentar cargar desde localStorage primero
            if (this.loadJSONFromLocalStorage()) {
                console.log(`📁 Devolviendo ${this.generatedEvents.length} eventos desde localStorage`);
                return this.generatedEvents;
            }
            
            // Si ya hay eventos generados y no está procesando, devolverlos
            if (this.generatedEvents.length > 0 && !this.isProcessing) {
                console.log(`📁 Devolviendo ${this.generatedEvents.length} eventos ya clasificados`);
                return this.generatedEvents;
            }
            
            // Si está procesando, esperar
            if (this.isProcessing) {
                console.log('⏳ Clasificación en progreso, esperando...');
                let attempts = 0;
                while (this.isProcessing && attempts < 60) {
                    await this.sleep(500);
                    attempts++;
                }
                
                if (this.generatedEvents.length > 0) {
                    console.log(`✅ Clasificación completada: ${this.generatedEvents.length} eventos`);
                    return this.generatedEvents;
                }
            }
            
            // Si no está inicializado, inicializar
            if (!this.isInitialized) {
                console.log('🤖 Inicializando clasificador...');
                await this.initializeML();
                
                let attempts = 0;
                while (this.isProcessing && attempts < 60) {
                    await this.sleep(500);
                    attempts++;
                }
            }
            
            if (this.generatedEvents.length === 0) {
                console.log('ℹ️ No hay eventos clasificados disponibles aún');
                return [];
            }
            
            return this.generatedEvents;
            
        } catch (error) {
            console.error('❌ Error en generateClassifiedEvents:', error);
            return [];
        }
    }

    // Ocultar preview
    hidePreview() {
        const container = document.getElementById('json-preview-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    // Obtener noticias de múltiples fuentes
    async fetchNewsFromMultipleSources() {
        const queries = [
            'breaking news world',
            'última hora mundo',
            'guerra conflicto',
            'desastre natural',
            'accidente grave',
            'crisis mundial',
            'emergencia internacional',
            'ataque terrorismo'
        ];
        
        const allNews = [];
        
        for (const query of queries) {
            try {
                const news = await this.fetchGoogleNewsRSS(query);
                allNews.push(...news);
                await this.sleep(300); // Pausa más larga para evitar rate limiting
            } catch (error) {
                console.warn(`⚠️ Error obteniendo noticias para "${query}":`, error.message);
            }
        }
        
        // Eliminar duplicados por URL
        const uniqueNews = allNews.filter((news, index, self) => 
            index === self.findIndex(n => n.url === news.url)
        );
        
        console.log(`📊 ${uniqueNews.length} noticias únicas obtenidas`);
        return uniqueNews.slice(0, 50);
    }

    // Obtener noticias de Google News RSS
    async fetchGoogleNewsRSS(query) {
        try {
            const encodedQuery = encodeURIComponent(query);
            const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es&gl=ES&ceid=ES:es`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const items = xmlDoc.querySelectorAll('item');
            const news = [];
            
            for (let i = 0; i < Math.min(items.length, 4); i++) { // Aumentar a 4 para más variedad
                const item = items[i];
                const title = item.querySelector('title')?.textContent?.trim();
                const link = item.querySelector('link')?.textContent?.trim();
                const pubDate = item.querySelector('pubDate')?.textContent?.trim();
                const description = item.querySelector('description')?.textContent?.trim();
                
                if (title && link) {
                    news.push({
                        title: title,
                        url: link,
                        description: description || title,
                        pubDate: pubDate,
                        source: 'Google News'
                    });
                }
            }
            
            return news;
            
        } catch (error) {
            console.error(`❌ Error RSS para "${query}":`, error);
            return [];
        }
    }

    // Convertir noticia a evento
    async convertNewsToEvent(news, classification) {
        try {
            const articleDate = this.parseDate(news.pubDate);
            
            // Filtrar noticias muy antiguas
            const daysDiff = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 7) return null;
            
            const location = this.extractLocation(news.title + ' ' + news.description);
            const coordinates = await this.getCoordinates(location);
            
            // No crear eventos sin coordenadas válidas
            if (!coordinates || (coordinates[0] === 0 && coordinates[1] === 0)) {
                return null;
            }
            
            const severity = this.determineSeverity(news.title + ' ' + news.description);
            
            return {
                id: this.generateId(),
                title: this.cleanText(news.title, 100),
                type: classification.category,
                description: this.cleanText(news.description, 200),
                location: location,
                coordinates: coordinates,
                date: articleDate.toISOString(),
                severity: severity,
                mlConfidence: Math.round(classification.confidence * 100) / 100,
                mlScores: classification.scores,
                newsLinks: [{
                    title: this.cleanText(news.title, 100),
                    url: news.url,
                    source: news.source,
                    publishedAt: articleDate.toISOString()
                }],
                source: `ML-${classification.category}`,
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            console.warn('⚠️ Error convirtiendo noticia:', error);
            return null;
        }
    }

    // Funciones helper
    parseDate(dateString) {
        try {
            return new Date(dateString);
        } catch {
            return new Date();
        }
    }

    extractLocation(text) {
        const locations = [
            'España', 'Francia', 'Italia', 'Alemania', 'Reino Unido',
            'Estados Unidos', 'Rusia', 'China', 'Japón', 'India',
            'Ucrania', 'Siria', 'Turquía', 'México', 'Brasil',
            'Argentina', 'Pakistán', 'Irán', 'Gaza', 'Sudán',
            'Filipinas', 'Indonesia', 'Madrid', 'París', 'Londres',
            'Nueva York', 'Tokio', 'Moscú', 'Pekín', 'Kiev'
        ];
        
        for (const location of locations) {
            if (text.toLowerCase().includes(location.toLowerCase())) {
                return location;
            }
        }
        
        return 'Ubicación no especificada';
    }

    async getCoordinates(location) {
        const coords = {
            'España': [40.4168, -3.7038], 'Francia': [46.6034, 1.8883],
            'Italia': [41.8719, 12.5674], 'Alemania': [51.1657, 10.4515],
            'Reino Unido': [55.3781, -3.4360], 'Estados Unidos': [37.0902, -95.7129],
            'Rusia': [61.5240, 105.3188], 'China': [35.8617, 104.1954],
            'Japón': [36.2048, 138.2529], 'India': [20.5937, 78.9629],
            'Ucrania': [48.3794, 31.1656], 'Siria': [34.8021, 38.9968],
            'Turquía': [38.9637, 35.2433], 'México': [23.6345, -102.5528],
            'Brasil': [-14.2350, -51.9253], 'Irán': [32.4279, 53.6880],
            'Gaza': [31.5017, 34.4668], 'Sudán': [12.8628, 30.2176],
            'Filipinas': [12.8797, 121.7740], 'Indonesia': [-0.7893, 113.9213]
        };
        
        return coords[location] || null; // Retornar null si no hay coordenadas
    }

    determineSeverity(text) {
        const lowerText = text.toLowerCase();
        const highWords = ['devastador', 'catastrófico', 'masivo', 'grave', 'crítico'];
        const mediumWords = ['importante', 'significativo', 'considerable'];
        
        if (highWords.some(word => lowerText.includes(word))) return 'high';
        if (mediumWords.some(word => lowerText.includes(word))) return 'medium';
        return 'low';
    }

    cleanText(text, maxLength) {
        return text.replace(/\s+/g, ' ').trim().substring(0, maxLength);
    }

    generateId() {
        return 'ml-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    calculateAverageConfidence(events) {
        if (events.length === 0) return 0;
        const total = events.reduce((sum, event) => sum + (event.mlConfidence || 0), 0);
        return total / events.length;
    }

    getEventsByType(events) {
        const byType = {};
        events.forEach(event => {
            byType[event.type] = (byType[event.type] || 0) + 1;
        });
        return byType;
    }

    getEventsBySeverity(events) {
        const bySeverity = {};
        events.forEach(event => {
            bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
        });
        return bySeverity;
    }

    getConfidenceDistribution(events) {
        const distribution = {
            high: events.filter(e => e.mlConfidence > 0.7).length,
            medium: events.filter(e => e.mlConfidence > 0.4 && e.mlConfidence <= 0.7).length,
            low: events.filter(e => e.mlConfidence <= 0.4).length
        };
        return distribution;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar automáticamente al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando clasificador ML automático...');
    window.mlClassifier = new MLNewsClassifier();
});

window.MLNewsClassifier = MLNewsClassifier; 