// TrustMD Real-Time Sync Manager
// Handles real-time data synchronization, collaboration, and live updates

class RealTimeSyncManager {
    constructor() {
        this.connections = new Map(); // WebSocket connections
        this.rooms = new Map(); // Chat rooms for collaboration
        this.syncQueue = new Map(); // Offline sync queue
        this.conflicts = new Map(); // Data conflict resolution
        this.eventListeners = new Map(); // Event listeners
        this.heartbeatInterval = null;
        this.syncInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isOnline = navigator.onLine;
        this.lastSyncTimestamp = new Map();
        this.syncInProgress = false;
        this.initialized = false;
        
        // Configuration
        this.config = {
            heartbeatInterval: 30000, // 30 seconds
            syncInterval: 5000, // 5 seconds
            maxRetries: 3,
            conflictResolution: 'last-write-wins', // or 'manual', 'merge'
            enableOfflineSync: true,
            enableCollaboration: true,
            enableRealTimeUpdates: true
        };
    }

    // Initialize real-time sync manager
    async initialize(dependencies = {}) {
        try {
            this.supabaseClient = dependencies.supabaseClient || window.trustMDClient;
            this.apiServer = dependencies.apiServer || window.apiServer;
            this.phiProtection = dependencies.phiProtection || window.phiProtection;
            
            // Setup network monitoring
            this.setupNetworkMonitoring();
            
            // Setup WebSocket connections
            await this.setupWebSocketConnections();
            
            // Setup sync intervals
            this.setupSyncIntervals();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Load offline sync queue
            await this.loadOfflineQueue();
            
            this.initialized = true;
            console.log('Real-Time Sync Manager initialized successfully');
            
            return {
                success: true,
                message: 'Real-time sync ready',
                features: {
                    realTimeUpdates: this.config.enableRealTimeUpdates,
                    offlineSync: this.config.enableOfflineSync,
                    collaboration: this.config.enableCollaboration
                }
            };
        } catch (error) {
            console.error('Real-Time Sync Manager initialization failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Setup network monitoring
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Network connection restored');
            this.handleReconnection();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Network connection lost');
            this.handleDisconnection();
        });
    }

    // Setup WebSocket connections for real-time updates
    async setupWebSocketConnections() {
        try {
            // Create WebSocket connection to Supabase realtime
            if (this.supabaseClient && this.supabaseClient.supabase) {
                await this.setupSupabaseRealtime();
            }
            
            // Create custom WebSocket for collaboration
            if (this.config.enableCollaboration) {
                await this.setupCollaborationWebSocket();
            }
            
            console.log('WebSocket connections established');
        } catch (error) {
            console.error('WebSocket setup failed:', error);
            // Fallback to polling
            this.setupPollingFallback();
        }
    }

    // Setup Supabase realtime subscriptions
    async setupSupabaseRealtime() {
        const realtime = this.supabaseClient.supabase.realtime;
        
        // Subscribe to compliance updates
        const complianceChannel = realtime.channel('compliance_updates');
        complianceChannel
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'user_compliance' },
                (payload) => this.handleComplianceUpdate(payload)
            )
            .subscribe();
        
        // Subscribe to risk assessment updates
        const riskChannel = realtime.channel('risk_updates');
        riskChannel
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'risk_assessments' },
                (payload) => this.handleRiskUpdate(payload)
            )
            .subscribe();
        
        // Subscribe to document updates
        const documentChannel = realtime.channel('document_updates');
        documentChannel
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'documents' },
                (payload) => this.handleDocumentUpdate(payload)
            )
            .subscribe();
        
        // Subscribe to notifications
        const notificationChannel = realtime.channel('notifications');
        notificationChannel
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => this.handleNotification(payload)
            )
            .subscribe();
        
        console.log('Supabase realtime subscriptions established');
    }

    // Setup collaboration WebSocket
    async setupCollaborationWebSocket() {
        const wsUrl = this.getCollaborationWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('Collaboration WebSocket connected');
            this.connections.set('collaboration', ws);
            this.startHeartbeat();
        };
        
        ws.onmessage = (event) => {
            this.handleCollaborationMessage(JSON.parse(event.data));
        };
        
        ws.onclose = () => {
            console.log('Collaboration WebSocket disconnected');
            this.connections.delete('collaboration');
            this.handleReconnection();
        };
        
        ws.onerror = (error) => {
            console.error('Collaboration WebSocket error:', error);
        };
    }

    // Setup polling fallback for when WebSockets fail
    setupPollingFallback() {
        console.log('Setting up polling fallback for real-time updates');
        
        this.syncInterval = setInterval(async () => {
            if (this.isOnline && !this.syncInProgress) {
                await this.pollForUpdates();
            }
        }, this.config.syncInterval);
    }

    // Poll for updates when WebSockets are not available
    async pollForUpdates() {
        try {
            this.syncInProgress = true;
            
            const lastSync = this.getLastSyncTimestamp();
            const updates = await this.fetchUpdatesSince(lastSync);
            
            if (updates.length > 0) {
                await this.processUpdates(updates);
                this.updateLastSyncTimestamp();
            }
        } catch (error) {
            console.error('Polling for updates failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    // Handle compliance updates
    async handleComplianceUpdate(payload) {
        try {
            const { eventType, new: newData, old: oldData } = payload;
            
            console.log('Compliance update received:', eventType);
            
            // Update local data
            await this.updateLocalComplianceData(newData, oldData, eventType);
            
            // Notify listeners
            this.emitEvent('compliance-update', {
                type: eventType,
                data: newData,
                oldData,
                timestamp: new Date().toISOString()
            });
            
            // Handle conflicts if needed
            if (eventType === 'UPDATE') {
                await this.handleConflict('compliance', newData, oldData);
            }
            
        } catch (error) {
            console.error('Error handling compliance update:', error);
        }
    }

    // Handle risk assessment updates
    async handleRiskUpdate(payload) {
        try {
            const { eventType, new: newData, old: oldData } = payload;
            
            console.log('Risk update received:', eventType);
            
            // Update local data
            await this.updateLocalRiskData(newData, oldData, eventType);
            
            // Notify listeners
            this.emitEvent('risk-update', {
                type: eventType,
                data: newData,
                oldData,
                timestamp: new Date().toISOString()
            });
            
            // Handle conflicts
            if (eventType === 'UPDATE') {
                await this.handleConflict('risk', newData, oldData);
            }
            
        } catch (error) {
            console.error('Error handling risk update:', error);
        }
    }

    // Handle document updates
    async handleDocumentUpdate(payload) {
        try {
            const { eventType, new: newData, old: oldData } = payload;
            
            console.log('Document update received:', eventType);
            
            // Update local data
            await this.updateLocalDocumentData(newData, oldData, eventType);
            
            // Notify listeners
            this.emitEvent('document-update', {
                type: eventType,
                data: newData,
                oldData,
                timestamp: new Date().toISOString()
            });
            
            // Handle conflicts
            if (eventType === 'UPDATE') {
                await this.handleConflict('document', newData, oldData);
            }
            
        } catch (error) {
            console.error('Error handling document update:', error);
        }
    }

    // Handle new notifications
    async handleNotification(payload) {
        try {
            const { new: notification } = payload;
            
            console.log('New notification received:', notification);
            
            // Add to local notifications
            if (window.notifications) {
                window.notifications.unshift(notification);
            }
            
            // Notify listeners
            this.emitEvent('notification', {
                data: notification,
                timestamp: new Date().toISOString()
            });
            
            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                this.showBrowserNotification(notification);
            }
            
        } catch (error) {
            console.error('Error handling notification:', error);
        }
    }

    // Handle collaboration messages
    handleCollaborationMessage(message) {
        try {
            const { type, data, room, userId, timestamp } = message;
            
            switch (type) {
                case 'join-room':
                    this.handleJoinRoom(room, userId);
                    break;
                case 'leave-room':
                    this.handleLeaveRoom(room, userId);
                    break;
                case 'room-message':
                    this.handleRoomMessage(room, data, userId, timestamp);
                    break;
                case 'typing':
                    this.handleTypingIndicator(room, userId, data);
                    break;
                case 'cursor-position':
                    this.handleCursorPosition(room, userId, data);
                    break;
                case 'edit-conflict':
                    this.handleEditConflict(room, data);
                    break;
                default:
                    console.log('Unknown collaboration message type:', type);
            }
        } catch (error) {
            console.error('Error handling collaboration message:', error);
        }
    }

    // Join a collaboration room
    async joinRoom(roomId, userId = null) {
        try {
            const currentUserId = userId || this.getCurrentUserId();
            
            if (!this.rooms.has(roomId)) {
                this.rooms.set(roomId, new Set());
            }
            
            this.rooms.get(roomId).add(currentUserId);
            
            // Send join message to other users
            this.sendCollaborationMessage({
                type: 'join-room',
                room: roomId,
                userId: currentUserId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`User ${currentUserId} joined room ${roomId}`);
            
            // Emit event for UI
            this.emitEvent('room-joined', { roomId, userId: currentUserId });
            
        } catch (error) {
            console.error('Error joining room:', error);
        }
    }

    // Leave a collaboration room
    async leaveRoom(roomId, userId = null) {
        try {
            const currentUserId = userId || this.getCurrentUserId();
            
            if (this.rooms.has(roomId)) {
                this.rooms.get(roomId).delete(currentUserId);
                
                if (this.rooms.get(roomId).size === 0) {
                    this.rooms.delete(roomId);
                }
            }
            
            // Send leave message to other users
            this.sendCollaborationMessage({
                type: 'leave-room',
                room: roomId,
                userId: currentUserId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`User ${currentUserId} left room ${roomId}`);
            
            // Emit event for UI
            this.emitEvent('room-left', { roomId, userId: currentUserId });
            
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    // Send message to room
    async sendRoomMessage(roomId, message) {
        try {
            const userId = this.getCurrentUserId();
            
            this.sendCollaborationMessage({
                type: 'room-message',
                room: roomId,
                data: message,
                userId,
                timestamp: new Date().toISOString()
            });
            
            // Emit event for UI
            this.emitEvent('room-message', {
                roomId,
                message,
                userId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error sending room message:', error);
        }
    }

    // Handle data conflicts
    async handleConflict(type, newData, oldData) {
        try {
            const conflictKey = `${type}-${newData.id}`;
            
            // Check if we already have a conflict for this item
            if (this.conflicts.has(conflictKey)) {
                return; // Already handling this conflict
            }
            
            // Detect conflict based on timestamps
            const localTimestamp = this.lastSyncTimestamp.get(`${type}-${newData.id}`);
            const serverTimestamp = new Date(newData.updated_at);
            
            if (localTimestamp && serverTimestamp > localTimestamp) {
                // Server has newer data, potential conflict
                const conflict = {
                    type,
                    itemId: newData.id,
                    localData: oldData,
                    serverData: newData,
                    localTimestamp,
                    serverTimestamp,
                    resolution: null
                };
                
                this.conflicts.set(conflictKey, conflict);
                
                // Handle based on resolution strategy
                if (this.config.conflictResolution === 'last-write-wins') {
                    await this.resolveConflictAuto(conflictKey);
                } else {
                    // Notify UI for manual resolution
                    this.emitEvent('conflict-detected', conflict);
                }
            }
            
        } catch (error) {
            console.error('Error handling conflict:', error);
        }
    }

    // Auto-resolve conflict using last-write-wins
    async resolveConflictAuto(conflictKey) {
        try {
            const conflict = this.conflicts.get(conflictKey);
            if (!conflict) return;
            
            // Apply server data (last write wins)
            await this.applyServerData(conflict.type, conflict.serverData);
            
            // Remove from conflicts
            this.conflicts.delete(conflictKey);
            
            // Emit resolution event
            this.emitEvent('conflict-resolved', {
                conflictKey,
                resolution: 'auto',
                data: conflict.serverData
            });
            
        } catch (error) {
            console.error('Error auto-resolving conflict:', error);
        }
    }

    // Manual conflict resolution
    async resolveConflictManual(conflictKey, resolution) {
        try {
            const conflict = this.conflicts.get(conflictKey);
            if (!conflict) return;
            
            // Apply chosen resolution
            if (resolution === 'server') {
                await this.applyServerData(conflict.type, conflict.serverData);
            } else if (resolution === 'local') {
                await this.applyLocalData(conflict.type, conflict.localData);
            } else if (resolution === 'merge') {
                await this.applyMergedData(conflict.type, conflict.localData, conflict.serverData);
            }
            
            // Remove from conflicts
            this.conflicts.delete(conflictKey);
            
            // Emit resolution event
            this.emitEvent('conflict-resolved', {
                conflictKey,
                resolution: 'manual',
                data: resolution
            });
            
        } catch (error) {
            console.error('Error manually resolving conflict:', error);
        }
    }

    // Handle disconnection
    handleDisconnection() {
        try {
            // Stop heartbeat
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            // Close WebSocket connections
            for (const [name, ws] of this.connections) {
                ws.close();
            }
            this.connections.clear();
            
            // Enable offline mode
            if (this.config.enableOfflineSync) {
                this.enableOfflineMode();
            }
            
            // Emit disconnection event
            this.emitEvent('disconnected', {
                timestamp: new Date().toISOString(),
                reason: 'network-lost'
            });
            
        } catch (error) {
            console.error('Error handling disconnection:', error);
        }
    }

    // Handle reconnection
    async handleReconnection() {
        try {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
                return;
            }
            
            this.reconnectAttempts++;
            
            // Wait before reconnecting
            await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
            
            // Try to reconnect
            await this.setupWebSocketConnections();
            
            // Sync offline changes
            if (this.config.enableOfflineSync) {
                await this.syncOfflineChanges();
            }
            
            // Reset reconnection attempts
            this.reconnectAttempts = 0;
            
            // Emit reconnection event
            this.emitEvent('reconnected', {
                timestamp: new Date().toISOString(),
                attempts: this.reconnectAttempts
            });
            
        } catch (error) {
            console.error('Reconnection failed:', error);
            // Exponential backoff
            this.reconnectDelay *= 2;
        }
    }

    // Enable offline mode
    enableOfflineMode() {
        console.log('Enabling offline mode');
        
        // Store changes locally
        this.setupOfflineStorage();
        
        // Queue changes for sync
        this.setupSyncQueue();
        
        // Emit offline event
        this.emitEvent('offline-mode', {
            timestamp: new Date().toISOString()
        });
    }

    // Sync offline changes when back online
    async syncOfflineChanges() {
        try {
            if (!this.isOnline || this.syncQueue.size === 0) {
                return;
            }
            
            console.log(`Syncing ${this.syncQueue.size} offline changes`);
            
            const syncedItems = [];
            const failedItems = [];
            
            for (const [key, change] of this.syncQueue) {
                try {
                    await this.syncChange(change);
                    syncedItems.push(key);
                } catch (error) {
                    console.error(`Failed to sync change ${key}:`, error);
                    failedItems.push({ key, error: error.message });
                }
            }
            
            // Remove synced items from queue
            syncedItems.forEach(key => this.syncQueue.delete(key));
            
            // Save updated queue
            await this.saveOfflineQueue();
            
            // Emit sync completion event
            this.emitEvent('offline-sync-completed', {
                syncedCount: syncedItems.length,
                failedCount: failedItems.length,
                failedItems,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error syncing offline changes:', error);
        }
    }

    // Setup sync intervals
    setupSyncIntervals() {
        if (this.config.enableRealTimeUpdates) {
            // Heartbeat to keep connections alive
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat();
            }, this.config.heartbeatInterval);
        }
    }

    // Send heartbeat to keep connections alive
    sendHeartbeat() {
        for (const [name, ws] of this.connections) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
            }
        }
    }

    // Setup event handlers
    setupEventHandlers() {
        // Setup custom event listeners
        this.addEventListener('compliance-update', (data) => {
            console.log('Compliance update event:', data);
        });
        
        this.addEventListener('risk-update', (data) => {
            console.log('Risk update event:', data);
        });
        
        this.addEventListener('document-update', (data) => {
            console.log('Document update event:', data);
        });
        
        this.addEventListener('notification', (data) => {
            console.log('Notification event:', data);
        });
    }

    // Add event listener
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    // Remove event listener
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).delete(callback);
        }
    }

    // Emit event to listeners
    emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            for (const callback of this.eventListeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            }
        }
    }

    // Utility methods
    getCurrentUserId() {
        // Get current user ID from auth or local storage
        return window.currentUser?.id || localStorage.getItem('userId') || 'anonymous';
    }

    getCollaborationWebSocketUrl() {
        // Generate WebSocket URL for collaboration
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/collaboration`;
    }

    sendCollaborationMessage(message) {
        const ws = this.connections.get('collaboration');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    showBrowserNotification(notification) {
        const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/icons/icon-192x192.png',
            tag: notification.id
        });
        
        browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => browserNotification.close(), 5000);
    }

    getLastSyncTimestamp() {
        const timestamps = Array.from(this.lastSyncTimestamp.values());
        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
    }

    updateLastSyncTimestamp() {
        this.lastSyncTimestamp.set('global', Date.now());
    }

    // Get sync status
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            connected: this.connections.size > 0,
            syncInProgress: this.syncInProgress,
            pendingSyncItems: this.syncQueue.size,
            conflicts: this.conflicts.size,
            lastSync: this.getLastSyncTimestamp(),
            rooms: Array.from(this.rooms.keys()),
            connections: Array.from(this.connections.keys())
        };
    }

    // Cleanup resources
    cleanup() {
        try {
            // Clear intervals
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }
            
            // Close connections
            for (const [name, ws] of this.connections) {
                ws.close();
            }
            
            // Clear data
            this.connections.clear();
            this.rooms.clear();
            this.syncQueue.clear();
            this.conflicts.clear();
            this.eventListeners.clear();
            this.lastSyncTimestamp.clear();
            
            console.log('Real-Time Sync Manager cleaned up');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Export for use in backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealTimeSyncManager;
} else {
    window.RealTimeSyncManager = RealTimeSyncManager;
}
