import WebSocket from 'ws';

/**
 * Home Assistant WebSocket Connection Manager
 * Manages persistent WebSocket connections to Home Assistant instances
 * with automatic reconnection, message queuing, and request/response handling
 */

interface HAMessage {
  id?: number;
  type: string;
  [key: string]: any;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface SubscriptionCallback {
  callback: (event: any) => void;
  subscriptionId: number;
}

export class HAConnection {
  private ws: WebSocket | null = null;
  private haUrl: string;
  private haToken: string;
  private messageId = 1;
  private authenticated = false;
  private pendingRequests = new Map<number, PendingRequest>();
  private messageQueue: HAMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscriptions = new Map<number, SubscriptionCallback>();
  private isConnecting = false;

  constructor(haUrl: string, haToken: string) {
    this.haUrl = haUrl.replace(/\/$/, ''); // Remove trailing slash
    this.haToken = haToken;
  }

  /**
   * Connect to Home Assistant WebSocket API
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.authenticated) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.authenticated) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.isConnecting) {
            clearInterval(checkInterval);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const wsUrl = this.haUrl.replace(/^http/, 'ws') + '/api/websocket';
      
      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        this.isConnecting = false;
        reject(new Error(`Failed to create WebSocket: ${error}`));
        return;
      }

      const timeout = setTimeout(() => {
        if (this.ws) {
          this.ws.close();
        }
        this.isConnecting = false;
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        console.log('[HA] WebSocket connected');
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as HAMessage;
          this.handleMessage(message, resolve, reject, timeout);
        } catch (error) {
          console.error('[HA] Failed to parse message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('[HA] WebSocket error:', error);
        this.isConnecting = false;
        clearTimeout(timeout);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[HA] WebSocket closed');
        this.authenticated = false;
        this.handleReconnect();
      });
    });
  }

  private handleMessage(
    message: HAMessage,
    connectResolve?: (value: void) => void,
    connectReject?: (error: Error) => void,
    connectTimeout?: NodeJS.Timeout
  ) {
    console.log('[HA] Received message type:', message.type);

    // Handle authentication flow
    if (message.type === 'auth_required') {
      this.sendAuthMessage();
    } else if (message.type === 'auth_ok') {
      this.authenticated = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      if (connectTimeout) clearTimeout(connectTimeout);
      if (connectResolve) connectResolve();
      this.processMessageQueue();
    } else if (message.type === 'auth_invalid') {
      this.isConnecting = false;
      if (connectTimeout) clearTimeout(connectTimeout);
      if (connectReject) {
        connectReject(new Error(`Authentication failed: ${message.message || 'Invalid token'}`));
      }
    }

    // Handle command responses
    else if (message.type === 'result' && message.id) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        
        if (message.success) {
          pending.resolve(message.result);
        } else {
          pending.reject(new Error(message.error?.message || 'Command failed'));
        }
      }
    }

    // Handle event messages (for subscriptions)
    else if (message.type === 'event' && message.id) {
      const subscription = this.subscriptions.get(message.id);
      if (subscription) {
        subscription.callback(message.event);
      }
    }
  }

  private sendAuthMessage() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'auth',
        access_token: this.haToken
      }));
    }
  }

  private handleReconnect() {
    // Clear all pending requests with error
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    }
    this.pendingRequests.clear();

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      
      console.log(`[HA] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[HA] Reconnection failed:', error);
        });
      }, delay);
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private sendMessage(message: HAMessage): number {
    if (!message.id) {
      message.id = this.messageId++;
    }

    if (!this.authenticated || this.ws?.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return message.id;
    }

    this.ws.send(JSON.stringify(message));
    return message.id;
  }

  /**
   * Send a command and wait for response
   */
  private async sendCommand(message: HAMessage, timeoutMs = 30000): Promise<any> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const id = this.sendMessage(message);

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Command timeout'));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });
    });
  }

  /**
   * Call a Home Assistant service
   */
  async callService(
    domain: string,
    service: string,
    serviceData?: Record<string, any>,
    target?: {
      entity_id?: string | string[];
      device_id?: string | string[];
      area_id?: string | string[];
    },
    returnResponse = false
  ): Promise<any> {
    return this.sendCommand({
      type: 'call_service',
      domain,
      service,
      ...(serviceData && { service_data: serviceData }),
      ...(target && { target }),
      ...(returnResponse && { return_response: true })
    });
  }

  /**
   * Get all states
   */
  async getStates(): Promise<any[]> {
    return this.sendCommand({ type: 'get_states' });
  }

  /**
   * Get configuration
   */
  async getConfig(): Promise<any> {
    return this.sendCommand({ type: 'get_config' });
  }

  /**
   * Get available services
   */
  async getServices(): Promise<any> {
    return this.sendCommand({ type: 'get_services' });
  }

  /**
   * Get registered panels
   */
  async getPanels(): Promise<any> {
    return this.sendCommand({ type: 'get_panels' });
  }

  /**
   * Subscribe to events
   */
  async subscribeEvents(
    callback: (event: any) => void,
    eventType?: string
  ): Promise<number> {
    const message: HAMessage = {
      type: 'subscribe_events',
      ...(eventType && { event_type: eventType })
    };

    const result = await this.sendCommand(message);
    const subscriptionId = this.messageId - 1; // The ID of the subscribe command
    
    this.subscriptions.set(subscriptionId, { callback, subscriptionId });
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribeEvents(subscriptionId: number): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    
    return this.sendCommand({
      type: 'unsubscribe_events',
      subscription: subscriptionId
    });
  }

  /**
   * Subscribe to trigger
   */
  async subscribeTrigger(
    trigger: any,
    callback: (event: any) => void
  ): Promise<number> {
    const message: HAMessage = {
      type: 'subscribe_trigger',
      trigger
    };

    const result = await this.sendCommand(message);
    const subscriptionId = this.messageId - 1;
    
    this.subscriptions.set(subscriptionId, { callback, subscriptionId });
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from trigger
   */
  async unsubscribeTrigger(subscriptionId: number): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    
    return this.sendCommand({
      type: 'unsubscribe_events',
      subscription: subscriptionId
    });
  }

  /**
   * Fire an event
   */
  async fireEvent(eventType: string, eventData?: Record<string, any>): Promise<any> {
    return this.sendCommand({
      type: 'fire_event',
      event_type: eventType,
      ...(eventData && { event_data: eventData })
    });
  }

  /**
   * Validate config (trigger, condition, action)
   */
  async validateConfig(config: {
    trigger?: any;
    condition?: any;
    action?: any;
  }): Promise<any> {
    return this.sendCommand({
      type: 'validate_config',
      ...config
    });
  }

  /**
   * Extract entities/devices/areas from target
   */
  async extractFromTarget(
    target: {
      entity_id?: string | string[];
      device_id?: string | string[];
      area_id?: string | string[];
      label_id?: string | string[];
    },
    expandGroup = false
  ): Promise<any> {
    return this.sendCommand({
      type: 'extract_from_target',
      target,
      expand_group: expandGroup
    });
  }

  /**
   * Send ping
   */
  async ping(): Promise<void> {
    await this.sendCommand({ type: 'ping' });
  }

  /**
   * Disconnect from Home Assistant
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.authenticated = false;
    this.subscriptions.clear();
    
    // Clear all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Disconnected'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Check if connected and authenticated
   */
  isConnected(): boolean {
    return this.authenticated && this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Connection pool for managing multiple user connections
 */
class HAConnectionPool {
  private connections = new Map<string, HAConnection>();
  private lastUsed = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Periodically clean up idle connections
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Get or create a connection for a user
   */
  getConnection(userId: string, haUrl: string, haToken: string): HAConnection {
    const key = `${userId}:${haUrl}`;
    
    let connection = this.connections.get(key);
    
    if (!connection) {
      connection = new HAConnection(haUrl, haToken);
      this.connections.set(key, connection);
    }
    
    this.lastUsed.set(key, Date.now());
    
    return connection;
  }

  /**
   * Remove a connection
   */
  removeConnection(userId: string, haUrl: string) {
    const key = `${userId}:${haUrl}`;
    const connection = this.connections.get(key);
    
    if (connection) {
      connection.disconnect();
      this.connections.delete(key);
      this.lastUsed.delete(key);
    }
  }

  /**
   * Clean up idle connections
   */
  private cleanup() {
    const now = Date.now();
    
    for (const [key, lastUsedTime] of this.lastUsed) {
      if (now - lastUsedTime > this.maxIdleTime) {
        const connection = this.connections.get(key);
        if (connection) {
          console.log(`[HA Pool] Cleaning up idle connection: ${key}`);
          connection.disconnect();
          this.connections.delete(key);
          this.lastUsed.delete(key);
        }
      }
    }
  }

  /**
   * Disconnect all connections and stop cleanup
   */
  shutdown() {
    clearInterval(this.cleanupInterval);
    
    for (const connection of this.connections.values()) {
      connection.disconnect();
    }
    
    this.connections.clear();
    this.lastUsed.clear();
  }
}

// Export singleton connection pool
export const haConnectionPool = new HAConnectionPool();

