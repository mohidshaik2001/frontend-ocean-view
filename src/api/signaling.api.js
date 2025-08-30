import EventEmitter from "eventemitter3";
import { conf } from "../conf.js";
import { logger } from "../main.jsx";
import axios from "axios";

export class SignalingService extends EventEmitter {
  constructor() {
    super();

    this.signalingurl = `${conf.signal_url}/signal/v1`;
    this.signalingApiUrl = `${conf.signalapi_url}/signalapi/v1`;
    this.ws = null;
    this.pending = new Map();
    this.nextId = 1;
  }
  async checkRoomIsActive(roomId) {
    try {
      const res = await axios.get(
        `${this.signalingApiUrl}/checkRoomIsActive/${roomId}`,
        {
          withCredentials: "include",
        }
      );
      return res.data;
    } catch (error) {
      logger.logd("Error in checkRoomIsActive", error);
    }
  }

  async connect() {
    try {
      if (this.ws) return;
      this.ws = new WebSocket(this.signalingurl);
      this.ws.onopen = () => {
        console.log("WebSocket connection opened");
        this.emit("open");
      };
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && (msg.ok === true || msg.ok === false)) {
          const p = pending.get(msg.id);
          if (p) {
            pending.delete(msg.id);
            return msg.ok
              ? p.resolve(msg.data)
              : p.reject(new Error(msg.error || "error"));
          }
        }
        this.emit(msg.type, msg.payload);
      };
      this.ws.onclose = () => {
        console.log("WebSocket connection closed from server");
        this.emit("close");
        this.ws = null;
      };
    } catch (error) {
      logger.logd("Error in  connect  to signaling server", error);
    }
  }

  async sendRequest(type, data = {}) {
    const id = (nextId++).toString();
    const payload = { id, type, data };
    socket.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error("signaling timeout"));
        }
      }, 10000);
    });
  }
}

export const signalingService = new SignalingService();
