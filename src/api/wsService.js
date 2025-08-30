import EventEmitter from "eventemitter3";
import { logger } from "../main.jsx";

class WSService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
  }
  async connect() {
    if (this.ws) return;
    this.ws = new WebSocket("https://4db29953408b.ngrok-free.app");
    this.ws.onopen = () => {
      logger.log("WebSocket connection opened");
      this.emit("open");
    };
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit(data.type, data.payload);
    };
    this.ws.onclose = () => {
      logger.log("WebSocket connection closed from server");
      this.emit("close");
      this.ws = null;
    };
  }
  async send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
  async stopCall() {
    this.ws?.close();
    this.ws = null;
    this.removeAllListeners();
    logger.log("WebSocket connection closed");
  }
}

export default new WSService();
