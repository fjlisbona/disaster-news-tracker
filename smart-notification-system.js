// Sistema de notificaciones inteligente para eventos nuevos y diferentes
class SmartNotificationSystem {
    constructor() {
        this.knownEvents = new Map(); // Almacenar eventos conocidos con detalles
        this.lastNotificationTime = new Map(); // Evitar spam de notificaciones
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        this.notificationHistory = [];
        this.maxNotifications = 50;
        this.cooldownTime = 60000; // 1 minuto entre notificaciones del mismo evento
        this.isEnabled = false;
        
        // Configurar sistema de notificaciones
        this.setupNotificationContainer();
        this.setupEventListeners();
        
        console.log('📢 Sistema de notificaciones inteligente inicializado');
    }

    // Configurar contenedor de notificaciones
    setupNotificationContainer() {
        // Crear contenedor si no existe
        if (!document.getElementById('smart-notifications-container')) {
            const container = document.createElement('div');
            container.id = 'smart-notifications-container';
            container.className = 'smart-notifications-container';
            container.innerHTML = `
                <div class="notifications-header">
                    <h4><i class="fas fa-bell"></i> Nuevos Eventos</h4>
                    <button id="clear-notifications" class="clear-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="notifications-list" class="notifications-list"></div>
            `;
            document.body.appendChild(container);
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        const clearBtn = document.getElementById('clear-notifications');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllNotifications());
        }
    }

    // Habilitar/deshabilitar notificaciones
    setEnabled(enabled) {
        this.isEnabled = enabled;
        const container = document.getElementById('smart-notifications-container');
        if (container) {
            container.style.display = enabled ? 'block' : 'none';
        }
    }

    // Analizar eventos para detectar nuevos y diferentes
    analyzeEvents(currentEvents) {
        if (!this.isEnabled || !Array.isArray(currentEvents)) return;

        const newEvents = [];
        const updatedEvents = [];
        const currentTime = Date.now();

        currentEvents.forEach(event => {
            const eventKey = this.generateEventKey(event);
            const knownEvent = this.knownEvents.get(eventKey);
            
            if (!knownEvent) {
                // Evento completamente nuevo
                newEvents.push({
                    ...event,
                    changeType: 'new',
                    detectedAt: currentTime
                });
                this.knownEvents.set(eventKey, {
                    ...event,
                    firstSeen: currentTime,
                    lastUpdated: currentTime
                });
            } else {
                // Verificar si el evento ha cambiado significativamente
                const changes = this.detectSignificantChanges(knownEvent, event);
                if (changes.length > 0) {
                    updatedEvents.push({
                        ...event,
                        changeType: 'updated',
                        changes: changes,
                        detectedAt: currentTime
                    });
                    // Actualizar evento conocido
                    this.knownEvents.set(eventKey, {
                        ...event,
                        firstSeen: knownEvent.firstSeen,
                        lastUpdated: currentTime
                    });
                }
            }
        });

        // Procesar eventos nuevos y actualizados
        [...newEvents, ...updatedEvents].forEach(event => {
            this.queueNotification(event);
        });

        this.processNotificationQueue();
    }

    // Generar clave única para evento
    generateEventKey(event) {
        // Combinar ubicación, tipo y palabras clave del título
        const locationKey = event.coordinates ? 
            `${Math.round(event.coordinates[0] * 10) / 10}_${Math.round(event.coordinates[1] * 10) / 10}` : 
            event.location?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
        
        const titleKey = event.title ? 
            event.title.toLowerCase().split(' ').slice(0, 3).join('_') : 
            'untitled';
        
        return `${event.type}_${locationKey}_${titleKey}`;
    }

    // Detectar cambios significativos en eventos
    detectSignificantChanges(oldEvent, newEvent) {
        const changes = [];

        // Verificar cambios en severidad
        if (oldEvent.severity !== newEvent.severity) {
            changes.push({
                type: 'severity',
                old: oldEvent.severity,
                new: newEvent.severity,
                description: `Severidad cambió de ${oldEvent.severity} a ${newEvent.severity}`
            });
        }

        // Verificar cambios en descripción (nuevos detalles importantes)
        if (this.hasSignificantDescriptionChange(oldEvent.description, newEvent.description)) {
            changes.push({
                type: 'description',
                description: 'Nueva información disponible sobre el evento'
            });
        }

        // Verificar nuevos enlaces de noticias
        const newLinks = this.findNewNewsLinks(oldEvent.newsLinks || [], newEvent.newsLinks || []);
        if (newLinks.length > 0) {
            changes.push({
                type: 'news',
                newLinks: newLinks,
                description: `${newLinks.length} nueva(s) noticia(s) disponible(s)`
            });
        }

        // Verificar cambios en estado/título que indiquen escalada
        if (this.detectEscalation(oldEvent.title, newEvent.title)) {
            changes.push({
                type: 'escalation',
                description: 'Posible escalada o desarrollo importante detectado'
            });
        }

        return changes;
    }

    // Verificar cambios significativos en descripción
    hasSignificantDescriptionChange(oldDesc, newDesc) {
        if (!oldDesc || !newDesc) return false;
        
        const oldWords = new Set(oldDesc.toLowerCase().split(' '));
        const newWords = new Set(newDesc.toLowerCase().split(' '));
        
        // Palabras clave que indican cambios importantes
        const importantKeywords = [
            'muertos', 'heridos', 'víctimas', 'evacuados', 'desaparecidos',
            'escalada', 'intensifica', 'aumenta', 'empeora', 'crítico',
            'emergencia', 'alerta', 'evacuación', 'rescate', 'ayuda'
        ];

        return importantKeywords.some(keyword => 
            newWords.has(keyword) && !oldWords.has(keyword)
        );
    }

    // Encontrar nuevos enlaces de noticias
    findNewNewsLinks(oldLinks, newLinks) {
        const oldUrls = new Set((oldLinks || []).map(link => link.url));
        return (newLinks || []).filter(link => !oldUrls.has(link.url));
    }

    // Detectar escalada en títulos
    detectEscalation(oldTitle, newTitle) {
        const escalationWords = [
            'intensifica', 'escalada', 'aumenta', 'empeora', 'agrava',
            'crítico', 'grave', 'severo', 'masivo', 'devastador'
        ];
        
        const oldTitleLower = (oldTitle || '').toLowerCase();
        const newTitleLower = (newTitle || '').toLowerCase();
        
        return escalationWords.some(word => 
            newTitleLower.includes(word) && !oldTitleLower.includes(word)
        );
    }

    // Agregar notificación a la cola
    queueNotification(event) {
        const eventKey = this.generateEventKey(event);
        const lastNotification = this.lastNotificationTime.get(eventKey);
        const currentTime = Date.now();

        // Verificar cooldown para evitar spam
        if (lastNotification && (currentTime - lastNotification) < this.cooldownTime) {
            return; // Saltar si está en cooldown
        }

        this.notificationQueue.push(event);
        this.lastNotificationTime.set(eventKey, currentTime);
    }

    // Procesar cola de notificaciones
    async processNotificationQueue() {
        if (this.isProcessingQueue || this.notificationQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.notificationQueue.length > 0) {
            const event = this.notificationQueue.shift();
            await this.showSmartNotification(event);
            await this.delay(2000); // 2 segundos entre notificaciones
        }

        this.isProcessingQueue = false;
    }

    // Mostrar notificación inteligente
    async showSmartNotification(event) {
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification = this.createNotificationElement(event, notificationId);
        
        const container = document.getElementById('notifications-list');
        if (container) {
            container.insertBefore(notification, container.firstChild);
            
            // Animar entrada
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);

            // Agregar al historial
            this.notificationHistory.unshift({
                id: notificationId,
                event: event,
                timestamp: Date.now()
            });

            // Limitar historial
            if (this.notificationHistory.length > this.maxNotifications) {
                this.notificationHistory = this.notificationHistory.slice(0, this.maxNotifications);
            }

            // Auto-ocultar después de 10 segundos para eventos actualizados
            if (event.changeType === 'updated') {
                setTimeout(() => {
                    this.hideNotification(notificationId);
                }, 10000);
            }

            // Mostrar notificación del sistema también
            this.showSystemNotification(event);
        }
    }

    // Crear elemento de notificación
    createNotificationElement(event, notificationId) {
        const div = document.createElement('div');
        div.id = notificationId;
        div.className = `smart-notification ${event.changeType}`;
        
        const icon = this.getEventIcon(event.type);
        const changeIcon = event.changeType === 'new' ? '🆕' : '🔄';
        const timeAgo = this.getTimeAgo(event.detectedAt);
        
        let changesHtml = '';
        if (event.changes && event.changes.length > 0) {
            changesHtml = `
                <div class="changes-list">
                    ${event.changes.map(change => `
                        <div class="change-item">
                            <i class="fas fa-arrow-right"></i>
                            ${change.description}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        div.innerHTML = `
            <div class="notification-header">
                <span class="event-icon">${icon}</span>
                <span class="change-type">${changeIcon}</span>
                <span class="event-type">${this.getTypeLabel(event.type)}</span>
                <span class="time-ago">${timeAgo}</span>
                <button class="close-notification" onclick="smartNotificationSystem.hideNotification('${notificationId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-content">
                <h5 class="event-title">${event.title}</h5>
                <p class="event-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${event.location}
                </p>
                ${changesHtml}
                <div class="notification-actions">
                    <button class="view-on-map-btn" onclick="smartNotificationSystem.viewEventOnMap('${event.id}')">
                        <i class="fas fa-map"></i>
                        Ver en mapa
                    </button>
                    ${event.newsLinks && event.newsLinks.length > 0 ? `
                        <button class="view-news-btn" onclick="smartNotificationSystem.viewEventNews('${event.id}')">
                            <i class="fas fa-newspaper"></i>
                            Ver noticias
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        return div;
    }

    // Mostrar notificación del sistema (nativa del navegador)
    showSystemNotification(event) {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            const title = event.changeType === 'new' ? 
                `🆕 Nuevo evento: ${event.title}` : 
                `🔄 Actualización: ${event.title}`;
            
            const options = {
                body: `${event.location} - ${this.getTypeLabel(event.type)}`,
                icon: this.getNotificationIcon(event.type),
                tag: event.id,
                requireInteraction: false,
                silent: true // Sin sonido como solicitó el usuario
            };

            const notification = new Notification(title, options);
            
            notification.onclick = () => {
                window.focus();
                this.viewEventOnMap(event.id);
                notification.close();
            };

            setTimeout(() => notification.close(), 8000);
        }
    }

    // Obtener icono del evento
    getEventIcon(type) {
        const icons = {
            war: '⚔️',
            natural: '🌪️',
            pandemic: '🦠',
            accident: '⚠️'
        };
        return icons[type] || '📍';
    }

    // Obtener etiqueta del tipo
    getTypeLabel(type) {
        const labels = {
            war: 'Conflicto',
            natural: 'Desastre Natural',
            pandemic: 'Pandemia',
            accident: 'Accidente'
        };
        return labels[type] || 'Evento';
    }

    // Obtener icono de notificación
    getNotificationIcon(type) {
        const icons = {
            war: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkY0NDQ0Ii8+Cjwvc3ZnPgo=',
            natural: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQuMjQgOC4yNkwyMiA5TDE0LjI0IDE1Ljc0TDEyIDIyTDkuNzYgMTUuNzRMMiA5TDkuNzYgOC4yNkwxMiAyWiIgZmlsbD0iI0ZGOTUwMCIvPgo8L3N2Zz4K',
            pandemic: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM5QzI3QjAiLz4KPC9zdmc+Cg==',
            accident: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMjIgMjBIMkwxMiAyWiIgZmlsbD0iI0ZGQzEwNyIvPgo8L3N2Zz4K'
        };
        return icons[type] || icons.accident;
    }

    // Obtener tiempo transcurrido
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Ahora mismo';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }

    // Ver evento en el mapa
    viewEventOnMap(eventId) {
        if (typeof window.showEventModal === 'function') {
            const event = Array.from(this.knownEvents.values()).find(e => e.id == eventId);
            if (event) {
                // Centrar mapa en el evento
                if (event.coordinates && window.map) {
                    window.map.setView(event.coordinates, 8);
                }
                // Mostrar modal del evento
                window.showEventModal(event);
            }
        }
    }

    // Ver noticias del evento
    viewEventNews(eventId) {
        const event = Array.from(this.knownEvents.values()).find(e => e.id == eventId);
        if (event && event.newsLinks && event.newsLinks.length > 0) {
            // Abrir primera noticia en nueva pestaña
            window.open(event.newsLinks[0].url, '_blank');
        }
    }

    // Ocultar notificación
    hideNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.classList.add('hiding');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    // Limpiar todas las notificaciones
    clearAllNotifications() {
        const container = document.getElementById('notifications-list');
        if (container) {
            const notifications = container.querySelectorAll('.smart-notification');
            notifications.forEach(notification => {
                notification.classList.add('hiding');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
        }
        this.notificationHistory = [];
    }

    // Solicitar permisos de notificación
    async requestNotificationPermission() {
        if ("Notification" in window && Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        return Notification.permission === "granted";
    }

    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Obtener estadísticas de notificaciones
    getNotificationStats() {
        const stats = {
            total: this.notificationHistory.length,
            new: this.notificationHistory.filter(n => n.event.changeType === 'new').length,
            updated: this.notificationHistory.filter(n => n.event.changeType === 'updated').length,
            byType: {}
        };

        // Estadísticas por tipo
        this.notificationHistory.forEach(notification => {
            const type = notification.event.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        return stats;
    }
}

// Inicializar sistema global
const smartNotificationSystem = new SmartNotificationSystem();

// Solicitar permisos al cargar
document.addEventListener('DOMContentLoaded', () => {
    smartNotificationSystem.requestNotificationPermission();
});

// Exportar para uso global
window.smartNotificationSystem = smartNotificationSystem; 