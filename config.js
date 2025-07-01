// Configuración de la aplicación Mapa de Catástrofes
const CONFIG = {
    // Configuración del mapa
    map: {
        defaultCenter: [20, 0],
        defaultZoom: 2,
        maxZoom: 18,
        minZoom: 1
    },

    // Configuración de marcadores
    markers: {
        colors: {
            war: '#e74c3c',        // Rojo para guerras
            natural: '#f39c12',    // Naranja para desastres naturales
            pandemic: '#9b59b6',   // Morado para pandemias
            accident: '#f1c40f'    // Amarillo para accidentes
        },
        sizes: {
            critical: 12,
            high: 10,
            medium: 8,
            low: 6
        }
    },

    // Configuración de APIs (para integración futura)
    apis: {
        // NewsAPI - Para noticias en tiempo real
        newsApi: {
            enabled: false,
            apiKey: 'tu_api_key_aqui',
            baseUrl: 'https://newsapi.org/v2',
            endpoints: {
                everything: '/everything',
                topHeadlines: '/top-headlines'
            },
            queries: {
                disasters: 'disaster OR earthquake OR hurricane OR flood OR wildfire',
                wars: 'war OR conflict OR military OR armed',
                pandemics: 'pandemic OR virus OR outbreak OR disease',
                accidents: 'accident OR explosion OR crash OR incident'
            }
        },

        // GDACS - Datos de desastres naturales
        gdacs: {
            enabled: false,
            baseUrl: 'https://www.gdacs.org/xml/rss.xml',
            refreshInterval: 30 * 60 * 1000 // 30 minutos
        },

        // ACLED - Datos de conflictos armados
        acled: {
            enabled: false,
            apiKey: 'tu_api_key_aqui',
            baseUrl: 'https://api.acleddata.com/acled/read',
            refreshInterval: 60 * 60 * 1000 // 1 hora
        },

        // WHO - Datos de salud y pandemias
        who: {
            enabled: false,
            baseUrl: 'https://www.who.int/rss-feeds/news-english.xml',
            refreshInterval: 60 * 60 * 1000 // 1 hora
        }
    },

    // Configuración de actualización
    refresh: {
        interval: 30 * 60 * 1000, // 30 minutos
        autoRefresh: true,
        showLoadingIndicator: true
    },

    // Configuración de filtros por defecto
    defaultFilters: {
        wars: true,
        natural: true,
        pandemics: true,
        accidents: true
    },

    // Configuración de idioma
    language: {
        default: 'es',
        supported: ['es', 'en'],
        translations: {
            es: {
                war: 'Guerra',
                natural: 'Desastre Natural',
                pandemic: 'Pandemia',
                accident: 'Accidente',
                critical: 'Crítico',
                high: 'Alto',
                medium: 'Medio',
                low: 'Bajo'
            },
            en: {
                war: 'War',
                natural: 'Natural Disaster',
                pandemic: 'Pandemic',
                accident: 'Accident',
                critical: 'Critical',
                high: 'High',
                medium: 'Medium',
                low: 'Low'
            }
        }
    },

    // Configuración de notificaciones
    notifications: {
        enabled: true,
        sound: false,
        desktop: false,
        criticalEventsOnly: true
    },

    // Configuración de caché
    cache: {
        enabled: false,
        duration: 15 * 60 * 1000, // 15 minutos
        maxItems: 100
    },

    // Configuración de geocodificación
    geocoding: {
        enabled: true,
        provider: 'nominatim', // OpenStreetMap Nominatim
        baseUrl: 'https://nominatim.openstreetmap.org/search',
        rateLimit: 1000 // ms entre requests
    },

    // Configuración de análisis
    analytics: {
        enabled: false,
        provider: 'google', // 'google', 'matomo', 'custom'
        trackingId: 'tu_tracking_id'
    },

    // Configuración de desarrollo
    development: {
        debug: false,
        mockData: true,
        logLevel: 'info' // 'debug', 'info', 'warn', 'error'
    }
};

// Funciones de utilidad para la configuración
const ConfigUtils = {
    // Obtener configuración por clave
    get: (key) => {
        const keys = key.split('.');
        let value = CONFIG;
        for (const k of keys) {
            value = value[k];
            if (value === undefined) return null;
        }
        return value;
    },

    // Establecer configuración
    set: (key, value) => {
        const keys = key.split('.');
        let obj = CONFIG;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
    },

    // Verificar si una API está habilitada
    isApiEnabled: (apiName) => {
        return CONFIG.apis[apiName]?.enabled || false;
    },

    // Obtener color de marcador
    getMarkerColor: (type) => {
        return CONFIG.markers.colors[type] || '#95a5a6';
    },

    // Obtener tamaño de marcador
    getMarkerSize: (severity) => {
        return CONFIG.markers.sizes[severity] || 8;
    },

    // Obtener traducción
    getTranslation: (key, language = CONFIG.language.default) => {
        return CONFIG.language.translations[language]?.[key] || key;
    },

    // Validar configuración
    validate: () => {
        const errors = [];
        
        // Validar APIs
        Object.keys(CONFIG.apis).forEach(apiName => {
            const api = CONFIG.apis[apiName];
            if (api.enabled && !api.apiKey && api.apiKey !== undefined) {
                errors.push(`API ${apiName} está habilitada pero no tiene API key`);
            }
        });

        // Validar intervalos
        if (CONFIG.refresh.interval < 60000) {
            errors.push('El intervalo de actualización debe ser al menos 1 minuto');
        }

        return errors;
    },

    // Exportar configuración
    export: () => {
        return JSON.stringify(CONFIG, null, 2);
    },

    // Importar configuración
    import: (configString) => {
        try {
            const newConfig = JSON.parse(configString);
            Object.assign(CONFIG, newConfig);
            return true;
        } catch (error) {
            console.error('Error al importar configuración:', error);
            return false;
        }
    }
};

// Ejemplo de uso de APIs reales
const APIExamples = {
    // Ejemplo: NewsAPI
    async fetchNewsApiData() {
        if (!ConfigUtils.isApiEnabled('newsApi')) {
            throw new Error('NewsAPI no está habilitada');
        }

        const api = CONFIG.apis.newsApi;
        const query = `${api.queries.disasters} OR ${api.queries.wars} OR ${api.queries.pandemics}`;
        
        const response = await fetch(
            `${api.baseUrl}${api.endpoints.everything}?q=${encodeURIComponent(query)}&apiKey=${api.apiKey}&language=es&sortBy=publishedAt`
        );

        if (!response.ok) {
            throw new Error(`Error en NewsAPI: ${response.status}`);
        }

        const data = await response.json();
        return data.articles.map(async article => ({
            title: article.title,
            description: article.description,
            type: determineEventType(article.title, article.description),
            location: extractLocation(article.title, article.description),
            coordinates: await geocodeLocation(extractLocation(article.title, article.description)),
            date: article.publishedAt,
            severity: determineSeverity(article.title, article.description),
            source: article.url
        }));
    },

    // Ejemplo: GDACS
    async fetchGdacsData() {
        if (!ConfigUtils.isApiEnabled('gdacs')) {
            throw new Error('GDACS no está habilitada');
        }

        const response = await fetch(CONFIG.apis.gdacs.baseUrl);
        const text = await response.text();
        
        // Parsear RSS XML
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        return Array.from(items).map(item => ({
            title: item.querySelector('title')?.textContent,
            description: item.querySelector('description')?.textContent,
            type: 'natural',
            location: extractLocationFromGdacs(item),
            coordinates: parseGdacsCoordinates(item),
            date: item.querySelector('pubDate')?.textContent,
            severity: determineGdacsSeverity(item),
            source: item.querySelector('link')?.textContent
        }));
    }
};

// Funciones auxiliares
function determineEventType(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('guerra') || text.includes('conflicto') || text.includes('militar')) {
        return 'war';
    } else if (text.includes('terremoto') || text.includes('huracán') || text.includes('inundación')) {
        return 'natural';
    } else if (text.includes('pandemia') || text.includes('virus') || text.includes('enfermedad')) {
        return 'pandemic';
    } else {
        return 'accident';
    }
}

function determineSeverity(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('crítico') || text.includes('grave') || text.includes('muerte')) {
        return 'critical';
    } else if (text.includes('alto') || text.includes('importante')) {
        return 'high';
    } else if (text.includes('medio') || text.includes('moderado')) {
        return 'medium';
    } else {
        return 'low';
    }
}

async function geocodeLocation(location) {
    if (!CONFIG.geocoding.enabled || !location) {
        return [0, 0]; // Coordenadas por defecto
    }

    try {
        const response = await fetch(
            `${CONFIG.geocoding.baseUrl}?q=${encodeURIComponent(location)}&format=json&limit=1`
        );
        const data = await response.json();
        
        if (data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch (error) {
        console.warn('Error en geocodificación:', error);
    }
    
    return [0, 0];
}

// Exportar para uso global
window.CONFIG = CONFIG;
window.ConfigUtils = ConfigUtils;
window.APIExamples = APIExamples; 