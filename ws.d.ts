declare module 'ws' {
    class WebSocket {
      constructor(address: string, protocols?: string | string[], options?: any);
      on(event: string, listener: (...args: any[]) => void): this;
      send(data: any, callback?: (err?: Error) => void): void;
      close(): void;
      static OPEN: number;
      static CONNECTING: number;
      static CLOSING: number;
      static CLOSED: number;
      readyState: number;
    }
    
    // Only export the named export, not both default and named
    export { WebSocket };
  }