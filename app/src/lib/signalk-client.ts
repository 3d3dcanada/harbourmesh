export type SignalKConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SignalKDelta {
  context?: string;
  updates?: Array<{
    source?: unknown;
    timestamp?: string;
    values?: Array<{ path: string; value: unknown }>;
  }>;
}

export interface SignalKClientOptions {
  subscribe?: string[];
  reconnectMaxDelay?: number;
  healthTimeout?: number;
}

type DeltaCallback = (delta: SignalKDelta) => void;
type ConnectionCallback = (state: SignalKConnectionState) => void;

export class SignalKClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private state: SignalKConnectionState = 'disconnected';
  private deltaCallbacks: DeltaCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private lastDeltaTime = 0;
  private subscribePaths: string[];
  private maxDelay: number;
  private healthTimeout: number;
  private intentionalClose = false;

  constructor(baseUrl: string, options: SignalKClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.subscribePaths = options.subscribe ?? ['navigation.*', 'environment.*', 'propulsion.*'];
    this.maxDelay = options.reconnectMaxDelay ?? 30000;
    this.healthTimeout = options.healthTimeout ?? 30000;
  }

  getConnectionState(): SignalKConnectionState {
    return this.state;
  }

  onDelta(callback: DeltaCallback): () => void {
    this.deltaCallbacks.push(callback);
    return () => { this.deltaCallbacks = this.deltaCallbacks.filter((cb) => cb !== callback); };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => { this.connectionCallbacks = this.connectionCallbacks.filter((cb) => cb !== callback); };
  }

  async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') return;
    this.intentionalClose = false;

    this.setState('connecting');

    let streamUrl: string;
    try {
      const disco = await fetch(`${this.baseUrl}/signalk`);
      if (disco.ok) {
        const info = await disco.json();
        const wsEndpoint = info?.endpoints?.v1?.['signalk-ws'];
        streamUrl = wsEndpoint ?? this.buildDefaultWsUrl();
      } else {
        streamUrl = this.buildDefaultWsUrl();
      }
    } catch {
      streamUrl = this.buildDefaultWsUrl();
    }

    this.openWebSocket(streamUrl);
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
    this.reconnectAttempt = 0;
  }

  subscribe(paths: string[]): void {
    this.subscribePaths = paths;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription();
    }
  }

  private buildDefaultWsUrl(): string {
    const proto = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = this.baseUrl.replace(/^https?:\/\//, '');
    return `${proto}://${host}/signalk/v1/stream?subscribe=none`;
  }

  private openWebSocket(url: string): void {
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.setState('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.setState('connected');
      this.reconnectAttempt = 0;
      this.lastDeltaTime = Date.now();
      this.sendSubscription();
      this.startHealthMonitor();
    };

    this.ws.onmessage = (event) => {
      this.lastDeltaTime = Date.now();
      try {
        const delta = JSON.parse(event.data as string) as SignalKDelta;
        for (const cb of this.deltaCallbacks) cb(delta);
      } catch { /* skip malformed */ }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.stopHealthMonitor();
      if (!this.intentionalClose) {
        this.setState('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.setState('error');
    };
  }

  private sendSubscription(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = {
      context: 'vessels.self',
      subscribe: this.subscribePaths.map((path) => ({ path, period: 1000 })),
    };
    this.ws.send(JSON.stringify(msg));
  }

  private startHealthMonitor(): void {
    this.stopHealthMonitor();
    this.healthTimer = setInterval(() => {
      if (Date.now() - this.lastDeltaTime > this.healthTimeout) {
        this.ws?.close();
      }
    }, this.healthTimeout / 2);
  }

  private stopHealthMonitor(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), this.maxDelay);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHealthMonitor();
  }

  private setState(state: SignalKConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    for (const cb of this.connectionCallbacks) cb(state);
  }
}
