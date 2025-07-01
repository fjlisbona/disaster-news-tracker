# 🌍 Mapa Mundial de Catástrofes - ML Clasificado

Una aplicación web interactiva **potenciada por Machine Learning** que muestra un mapa mundial con marcadores de diferentes tipos de catástrofes, conflictos armados, pandemias y accidentes en tiempo real, utilizando **OpenStreetMap** como base cartográfica y **algoritmos de IA** para la clasificación automática de eventos.

## 🚀 Características

### 📍 **Mapa Interactivo con OpenStreetMap**
- **Unica capa de OpenStreetMap**:
  - 🗺️ **OpenStreetMap Estándar** - Vista clásica
 
- **Controles avanzados**:
  - 🔍 **Búsqueda geográfica** - Buscar ubicaciones específicas
  - 📏 **Herramienta de medición** - Medir distancias y áreas
  - 🖨️ **Impresión del mapa** - Imprimir en diferentes formatos
  - 📍 **Coordenadas en tiempo real** - Mostrar lat/lng actual
  - 🗺️ **Minimapa** - Vista de navegación
  - ⛶ **Pantalla completa** - Modo inmersivo
  - 📊 **Panel de información** - Zoom, centro y marcadores visibles

### 🎯 **Tipos de Eventos**
- **🔴 Guerras y Conflictos**: Marcadores rojos para conflictos armados
- **🟠 Desastres Naturales**: Marcadores naranjas para terremotos, huracanes, etc.
- **🟣 Pandemias**: Marcadores morados para brotes de enfermedades
- **🟡 Accidentes**: Marcadores amarillos para accidentes industriales

### 🔧 **Funcionalidades**
- **Filtros dinámicos**: Mostrar/ocultar tipos específicos de eventos
- **Estadísticas en tiempo real**: Contador de eventos por categoría
- **Información detallada**: Modal con detalles completos de cada evento
- **Actualización automática**: Datos se actualizan cada 30 minutos
- **Diseño responsivo**: Funciona en dispositivos móviles y de escritorio
- **Controles del mapa**: Botones para reset, ajustar vista y pantalla completa

### 🎨 **Interfaz Moderna**
- Diseño limpio y profesional con efectos de cristal (glassmorphism)
- Sidebar con controles y estadísticas
- Animaciones suaves y efectos visuales
- Iconos intuitivos de Font Awesome
- Notificaciones toast para feedback del usuario

## 📋 Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet para cargar las librerías externas y tiles de OpenStreetMap

## 🛠️ Instalación

1. **Clona o descarga** los archivos del proyecto
2. **Abre** el archivo `index.html` en tu navegador
3. **¡Listo!** La aplicación se cargará automáticamente

### Estructura de archivos:
```
├── index.html                    # Archivo principal
├── styles.css                    # Estilos CSS
├── script.js                     # Lógica JavaScript
├── config.js                     # Configuración de APIs
├── api-integration-example.js    # Ejemplos de integración
├── README.md                     # Este archivo
└── LICENSE                       # Licencia MIT
```

## 🎮 Uso

### Navegación básica:
- **Zoom**: Usa la rueda del mouse o los controles del mapa
- **Mover**: Arrastra el mapa para navegar
- **Marcadores**: Haz clic en cualquier marcador para ver detalles

### Controles del sidebar:
- **Filtros**: Usa los checkboxes para mostrar/ocultar tipos de eventos
- **Vista Inicial**: Restablece la vista del mapa
- **Ver Todos los Marcadores**: Ajusta la vista para mostrar todos los eventos
- **Limpiar Mapa**: Elimina todos los marcadores del mapa

### Atajos de teclado:
- `Ctrl/Cmd + R`: Recargar datos
- `Ctrl/Cmd + F`: Enfocar filtros
- `F11`: Pantalla completa del navegador

## 🗺️ Mapa de OpenStreetMap

### **OpenStreetMap Estándar**
- Vista clásica con calles, edificios y puntos de interés
- Ideal para navegación general y contexto urbano
- Datos actualizados constantemente por la comunidad OpenStreetMap

## 🔌 Integración con APIs Reales

Para conectar con fuentes de datos reales, modifica la función `fetchMockDisasterData()` en `script.js`:

### Ejemplo con NewsAPI:
```javascript
async function fetchRealDisasterData() {
    const API_KEY = 'tu_api_key_aqui';
    const response = await fetch(`https://newsapi.org/v2/everything?q=disaster OR war OR pandemic&apiKey=${API_KEY}`);
    const data = await response.json();
    
    return data.articles.map(article => ({
        title: article.title,
        description: article.description,
        coordinates: getCoordinatesFromText(article.content),
        // ... mapear otros campos
    }));
}
```

### APIs recomendadas:
- **NewsAPI**: Noticias en tiempo real
- **GDACS**: Datos de desastres naturales
- **ACLED**: Datos de conflictos armados
- **WHO**: Datos de pandemias y salud

## 🎨 Personalización

### Cambiar colores de marcadores:
Edita la función `getMarkerColor()` en `script.js`:
```javascript
function getMarkerColor(type) {
    const colors = {
        war: '#tu_color_guerra',
        natural: '#tu_color_natural',
        pandemic: '#tu_color_pandemia',
        accident: '#tu_color_accidente'
    };
    return colors[type] || '#default';
}
```

### Agregar nuevos tipos de eventos:
1. Añade el checkbox en `index.html`
2. Actualiza los filtros en `script.js`
3. Añade el color correspondiente en `getMarkerColor()`
4. **Entrena el clasificador ML** para reconocer el nuevo tipo

## 🔧 Configuración Avanzada

### Cambiar intervalo de actualización:
```javascript
// En script.js, línea ~470
setInterval(() => {
    loadDisasterData();
}, 5 * 60 * 1000); // 5 minutos en lugar de 30
```

### Configurar geocodificación:
```javascript
// En config.js
geocoding: {
    enabled: true,
    provider: 'nominatim', // OpenStreetMap Nominatim
    baseUrl: 'https://nominatim.openstreetmap.org/search',
    rateLimit: 1000 // ms entre requests
}
```
## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Para contribuir:

1. Haz un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **OpenStreetMap**: Para los datos cartográficos base
- **Leaflet.js**: Para el mapa interactivo
- **Bootstrap**: Para el diseño responsivo
- **Font Awesome**: Para los iconos
- **TensorFlow.js**: Para las capacidades de Machine Learning
- **Natural Language Processing**: Para el análisis de texto

---

**¡Gracias por usar el Mapa Mundial de Catástrofes con Machine Learning!** 🌍

*Desarrollado con ❤️ para crear conciencia sobre los eventos globales importantes usando OpenStreetMap y Machine Learning.* 