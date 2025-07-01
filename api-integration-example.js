// Ejemplo de integración con APIs reales para el Mapa de Catástrofes
// Este archivo muestra cómo conectar con fuentes de datos reales

// ============================================================================
// EJEMPLO 1: NewsAPI - Para noticias en tiempo real
// ============================================================================

async function fetchNewsApiData() {
    const API_KEY = 'tu_api_key_de_newsapi'; // Obtén tu API key en https://newsapi.org/
    
    try {
        // Consulta para diferentes tipos de catástrofes
        const queries = [
            'war OR conflict OR military OR armed OR battle',
            'earthquake OR hurricane OR flood OR wildfire OR tsunami',
            'pandemic OR virus OR outbreak OR disease OR epidemic',
            'accident OR explosion OR crash OR incident OR disaster'
        ];
        
        const allArticles = [];
        
        for (const query of queries) {
            const response = await fetch(
                `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=es&sortBy=publishedAt&pageSize=20&apiKey=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error(`Error en NewsAPI: ${response.status}`);
            }
            
            const data = await response.json();
            allArticles.push(...data.articles);
        }
        
        // Procesar y mapear los artículos
        return allArticles.map(async article => ({
            id: article.url, // Usar URL como ID único
            title: article.title,
            type: determineEventTypeFromNews(article.title, article.description),
            description: article.description || 'Sin descripción disponible',
            location: extractLocationFromNews(article.title, article.description),
            coordinates: await geocodeLocation(extractLocationFromNews(article.title, article.description)),
            date: article.publishedAt,
            severity: determineSeverityFromNews(article.title, article.description),
            source: article.url,
            image: article.urlToImage
        }));
        
    } catch (error) {
        console.error('Error al obtener datos de NewsAPI:', error);
        return [];
    }
}

// ============================================================================
// EJEMPLO 2: GDACS - Datos de desastres naturales
// ============================================================================

async function fetchGdacsData() {
    try {
        const response = await fetch('https://www.gdacs.org/xml/rss.xml');
        const text = await response.text();
        
        // Parsear el RSS XML
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');
        
        return Array.from(items).map(item => {
            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            
            return {
                id: link,
                title: title,
                type: 'natural',
                description: description,
                location: extractLocationFromGdacs(title, description),
                coordinates: parseGdacsCoordinates(title, description),
                date: new Date(pubDate).toISOString(),
                severity: determineGdacsSeverity(title, description),
                source: link
            };
        });
        
    } catch (error) {
        console.error('Error al obtener datos de GDACS:', error);
        return [];
    }
}

// ============================================================================
// EJEMPLO 3: ACLED - Datos de conflictos armados
// ============================================================================

async function fetchAcledData() {
    const API_KEY = 'tu_api_key_de_acled'; // Obtén tu API key en https://acleddata.com/
    
    try {
        // Obtener eventos de los últimos 30 días
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await fetch(
            `https://api.acleddata.com/acled/read?key=${API_KEY}&start_date=${startDate}&end_date=${endDate}&limit=100`
        );
        
        if (!response.ok) {
            throw new Error(`Error en ACLED: ${response.status}`);
        }
        
        const data = await response.json();
        
        return data.data.map(event => ({
            id: event.data_id,
            title: `${event.event_type} en ${event.location}`,
            type: 'war',
            description: `${event.event_type} en ${event.location}, ${event.country}. ${event.notes || ''}`,
            location: `${event.location}, ${event.country}`,
            coordinates: [parseFloat(event.latitude), parseFloat(event.longitude)],
            date: event.event_date,
            severity: determineAcledSeverity(event.fatalities),
            source: `https://acleddata.com/data-export-tool/`,
            fatalities: event.fatalities,
            actors: event.actor1 + ' vs ' + event.actor2
        }));
        
    } catch (error) {
        console.error('Error al obtener datos de ACLED:', error);
        return [];
    }
}

// ============================================================================
// EJEMPLO 4: WHO - Datos de salud y pandemias
// ============================================================================

async function fetchWhoData() {
    try {
        const response = await fetch('https://www.who.int/rss-feeds/news-english.xml');
        const text = await response.text();
        
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');
        
        return Array.from(items)
            .filter(item => {
                const title = item.querySelector('title')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const text = `${title} ${description}`.toLowerCase();
                
                // Filtrar solo noticias relacionadas con pandemias
                return text.includes('pandemic') || 
                       text.includes('outbreak') || 
                       text.includes('virus') || 
                       text.includes('disease') ||
                       text.includes('covid') ||
                       text.includes('flu');
            })
            .map(item => {
                const title = item.querySelector('title')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';
                
                return {
                    id: link,
                    title: title,
                    type: 'pandemic',
                    description: description,
                    location: extractLocationFromWho(title, description),
                    coordinates: [0, 0], // WHO no proporciona coordenadas específicas
                    date: new Date(pubDate).toISOString(),
                    severity: determineWhoSeverity(title, description),
                    source: link
                };
            });
            
    } catch (error) {
        console.error('Error al obtener datos de WHO:', error);
        return [];
    }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

// Determinar tipo de evento desde noticias
function determineEventTypeFromNews(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('guerra') || text.includes('conflicto') || text.includes('militar') || 
        text.includes('bombardeo') || text.includes('ataque')) {
        return 'war';
    } else if (text.includes('terremoto') || text.includes('huracán') || text.includes('inundación') ||
               text.includes('tsunami') || text.includes('volcán') || text.includes('tornado')) {
        return 'natural';
    } else if (text.includes('pandemia') || text.includes('virus') || text.includes('enfermedad') ||
               text.includes('covid') || text.includes('gripe') || text.includes('brote')) {
        return 'pandemic';
    } else {
        return 'accident';
    }
}

// Extraer ubicación desde noticias
function extractLocationFromNews(title, description) {
    const text = `${title} ${description}`;
    
    // Lista de países y ciudades comunes
    const locations = [
        'Ucrania', 'Rusia', 'Gaza', 'Israel', 'Siria', 'Turquía', 'Japón', 'China',
        'Estados Unidos', 'México', 'Brasil', 'Argentina', 'Chile', 'Colombia',
        'España', 'Francia', 'Alemania', 'Italia', 'Reino Unido', 'Canadá',
        'Australia', 'India', 'Pakistán', 'Irán', 'Irak', 'Afganistán', 'Sudán'
    ];
    
    for (const location of locations) {
        if (text.includes(location)) {
            return location;
        }
    }
    
    return 'Ubicación no especificada';
}

// Determinar severidad desde noticias
function determineSeverityFromNews(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('crítico') || text.includes('grave') || text.includes('muerte') ||
        text.includes('fallecido') || text.includes('muerto') || text.includes('fatal')) {
        return 'critical';
    } else if (text.includes('alto') || text.includes('importante') || text.includes('significativo')) {
        return 'high';
    } else if (text.includes('medio') || text.includes('moderado') || text.includes('leve')) {
        return 'medium';
    } else {
        return 'low';
    }
}

// Geocodificación usando Nominatim (OpenStreetMap)
async function geocodeLocation(location) {
    if (!location || location === 'Ubicación no especificada') {
        return [0, 0];
    }
    
    try {
        // Esperar entre requests para respetar rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
        );
        
        if (!response.ok) {
            throw new Error(`Error en geocodificación: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
        
    } catch (error) {
        console.warn('Error en geocodificación:', error);
    }
    
    return [0, 0];
}

// Extraer ubicación desde GDACS
function extractLocationFromGdacs(title, description) {
    const text = `${title} ${description}`;
    
    // GDACS suele incluir el país en el título
    const match = text.match(/(?:in|en)\s+([A-Za-z\s]+)/i);
    if (match) {
        return match[1].trim();
    }
    
    return 'Ubicación no especificada';
}

// Parsear coordenadas desde GDACS
function parseGdacsCoordinates(title, description) {
    // GDACS suele incluir coordenadas en el formato "lat: X, lon: Y"
    const latMatch = title.match(/lat:\s*([0-9.-]+)/i);
    const lonMatch = title.match(/lon:\s*([0-9.-]+)/i);
    
    if (latMatch && lonMatch) {
        return [parseFloat(latMatch[1]), parseFloat(lonMatch[1])];
    }
    
    return [0, 0];
}

// Determinar severidad desde GDACS
function determineGdacsSeverity(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('red') || text.includes('extreme')) {
        return 'critical';
    } else if (text.includes('orange') || text.includes('high')) {
        return 'high';
    } else if (text.includes('yellow') || text.includes('medium')) {
        return 'medium';
    } else {
        return 'low';
    }
}

// Determinar severidad desde ACLED
function determineAcledSeverity(fatalities) {
    const fatalityCount = parseInt(fatalities) || 0;
    
    if (fatalityCount > 100) {
        return 'critical';
    } else if (fatalityCount > 10) {
        return 'high';
    } else if (fatalityCount > 0) {
        return 'medium';
    } else {
        return 'low';
    }
}

// Extraer ubicación desde WHO
function extractLocationFromWho(title, description) {
    const text = `${title} ${description}`;
    
    // WHO suele mencionar países específicos
    const countries = [
        'China', 'India', 'United States', 'Brazil', 'Russia', 'Mexico',
        'Germany', 'France', 'United Kingdom', 'Italy', 'Spain', 'Canada'
    ];
    
    for (const country of countries) {
        if (text.includes(country)) {
            return country;
        }
    }
    
    return 'Global';
}

// Determinar severidad desde WHO
function determineWhoSeverity(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('emergency') || text.includes('crisis') || text.includes('critical')) {
        return 'critical';
    } else if (text.includes('outbreak') || text.includes('spread') || text.includes('increase')) {
        return 'high';
    } else if (text.includes('case') || text.includes('reported') || text.includes('detected')) {
        return 'medium';
    } else {
        return 'low';
    }
}

// ============================================================================
// FUNCIÓN PRINCIPAL PARA INTEGRAR TODAS LAS APIS
// ============================================================================

async function fetchAllDisasterData() {
    const allData = [];
    
    try {
        // Obtener datos de todas las APIs habilitadas
        const promises = [];
        
        if (CONFIG.apis.newsApi.enabled) {
            promises.push(fetchNewsApiData());
        }
        
        if (CONFIG.apis.gdacs.enabled) {
            promises.push(fetchGdacsData());
        }
        
        if (CONFIG.apis.acled.enabled) {
            promises.push(fetchAcledData());
        }
        
        if (CONFIG.apis.who.enabled) {
            promises.push(fetchWhoData());
        }
        
        // Esperar a que todas las APIs respondan
        const results = await Promise.allSettled(promises);
        
        // Combinar todos los datos
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                allData.push(...result.value);
            } else {
                console.error('Error en una de las APIs:', result.reason);
            }
        });
        
        // Eliminar duplicados basados en título y ubicación
        const uniqueData = removeDuplicates(allData);
        
        // Ordenar por fecha (más recientes primero)
        uniqueData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return uniqueData;
        
    } catch (error) {
        console.error('Error al obtener datos de todas las APIs:', error);
        return [];
    }
}

// Eliminar duplicados
function removeDuplicates(data) {
    const seen = new Set();
    return data.filter(item => {
        const key = `${item.title}-${item.location}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// ============================================================================
// USO EN LA APLICACIÓN PRINCIPAL
// ============================================================================

// Para usar estas funciones en script.js, reemplaza fetchMockDisasterData() con:

/*
async function fetchMockDisasterData() {
    // Si las APIs están habilitadas, usar datos reales
    if (CONFIG.apis.newsApi.enabled || CONFIG.apis.gdacs.enabled || 
        CONFIG.apis.acled.enabled || CONFIG.apis.who.enabled) {
        return await fetchAllDisasterData();
    }
    
    // Si no, usar datos de ejemplo
    return await fetchMockData();
}
*/

// Exportar funciones para uso global
window.APIExamples = {
    fetchNewsApiData,
    fetchGdacsData,
    fetchAcledData,
    fetchWhoData,
    fetchAllDisasterData
}; 