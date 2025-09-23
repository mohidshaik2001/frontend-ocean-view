import EventEmitter from "eventemitter3";
import { conf } from "../conf.js";
import { logger } from "../main.jsx";
import axios from "axios";

export class SignalingService extends EventEmitter {
  constructor() {
    super();

    this.signalingurl = `${conf.signal_url}`;
    this.signalingApiUrl = `${conf.signalapi_url}/signalapi/v1`;
    this.ws = null;
    this.pending = new Map();
    this.nextId = 1;
  }

  async checkRoomIsActive(roomId) {
    try {
      logger.log("checkRoomIsActive is called");
      const res = await axios.get(
        `${this.signalingApiUrl}/checkRoomIsActive/${roomId}`,
        {
          withCredentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      logger.logd("checkRoomIsActive", res.data);
      return res.data.isActive;
    } catch (error) {
      console.error("Error in checkRoomIsActive", error);
    }
  }

  async joinCall({ roomId, callerDetails }) {
    try {
      logger.log("joinCall is called");
      const res = await axios.post(
        `${this.signalingApiUrl}/joinCall`,
        { roomId, callerDetails },
        {
          withCredentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      logger.logd("joinCall", res.data);
      return res.data.isAllowed;
    } catch (error) {
      console.error("Error in joinCall", error);
      return false;
    }
  }
  
  async acceptJoinRequest({ roomId, requestId, acceptingPeerId }) {
    try {
      logger.log("acceptJoinRequest is called");
      const res = await axios.post(
        `${this.signalingApiUrl}/acceptJoinRequest`,
        { roomId, requestId, acceptingPeerId },
        {
          withCredentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      logger.logd("acceptJoinRequest", res.data);
      return res.data.success;
    } catch (error) {
      console.error("Error in acceptJoinRequest", error);
      return false;
    }
  }
  
  async rejectJoinRequest({ roomId, requestId, rejectingPeerId }) {
    try {
      logger.log("rejectJoinRequest is called");
      const res = await axios.post(
        `${this.signalingApiUrl}/rejectJoinRequest`,
        { roomId, requestId, rejectingPeerId },
        {
          withCredentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      logger.logd("rejectJoinRequest", res.data);
      return res.data.success;
    } catch (error) {
      console.error("Error in rejectJoinRequest", error);
      return false;
    }
  }

  async connect() {
    if (this.ws) return Promise.resolve(); // Already connected

    // Return a promise that resolves when the connection is open
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.signalingurl);

        // Set a timeout to reject the promise if connection takes too long
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, 5000); // 5 second timeout

        this.ws.onopen = () => {
          logger.log("Ws connected to signaling server");
          this.emit("open");
          clearTimeout(timeout);
          resolve(); // Resolve the promise when connection is established
        };

        this.ws.onerror = (error) => {
          logger.log("WebSocket connection error");
          clearTimeout(timeout);
          reject(error);
        };

        // Handle messages from signaling
        this.ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);

          if (msg.id && (msg.ok === true || msg.ok === false)) {
            logger.logd("message from signaling server", {
              id: msg.id,
              ok: msg.ok,
              data: msg.ok ? undefined : msg.data, // Log error data but not success data (too verbose)
            });
            let p = this.pending.get(msg.id);
            if (p) {
              this.pending.delete(msg.id);
              return msg.ok
                ? p.resolve(msg.data)
                : p.reject(
                    new Error(
                      msg.error ||
                        msg.data ||
                        "Unknown error from signaling server"
                    )
                  );
            }
          }
          if (msg.type) {
            logger.logd("message from signaling server", {
              type: msg.type,
            });
            this.emit(msg.type, msg.data);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket connection closed from server");
          this.emit("close");
          this.ws = null;
        };
      } catch (error) {
        reject(error);
        console.error("Error in connect to signaling server", error);
      }
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async sendRequest(type, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const id = (this.nextId++).toString();
    const payload = { id, type, data };
    this.ws.send(JSON.stringify(payload));
    logger.logd("message to signaling server", { id, type });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("signaling timeout"));
        }
      }, 10000);
    });
  }
}

export const signalingService = new SignalingService();
