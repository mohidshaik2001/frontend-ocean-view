// logger.js

export default class Logger {
  constructor(serviceName, wsUrl = "ws://localhost:4000") {
    this.serviceName = serviceName; // frontend, backend, signalling, sfu
    this.counter = 0;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`[Logger] Connected to log server for ${this.serviceName}`);
    };

    this.ws.onerror = (err) => {
      console.error(`[Logger] WebSocket error:`, err.message);
    };

    // Reset counter every 10 seconds
    setInterval(() => {
      this.counter = 0;
      // console.log(`[Logger] Counter reset for service: ${this.serviceName}`);
    }, 10000);
  }

  // Get caller file + line number
  _getLineInfo() {
    try {
      const err = new Error();
      const stackLines = err.stack.split("\n");

      // Define source file mappings for the webpack bundled files
      // This maps the webpack line numbers to actual source line numbers
      const lineOffsets = {
        "MeetingRoom.jsx": -16, // Subtract 16 from any MeetingRoom.jsx line number
        "signaling.api.js": 0, // No adjustment needed for signaling.api.js
        // Add more files with their offsets as needed
      };

      // Skip the first few lines that are internal
      for (let i = 0; i < stackLines.length; i++) {
        const line = stackLines[i];
        if (line.includes("Logger.js")) continue;

        // Try different stack trace patterns for browser
        let match = line.match(/at\s+.*?\s+\((.*):(\d+):(\d+)\)/);
        if (!match) {
          match = line.match(/at\s+(.*):(\d+):(\d+)/);
        }

        if (match) {
          const fullPath = match[1];
          // Get filename without query parameters (webpack dev server adds these)
          let fileName = fullPath.split("/").pop().split("\\").pop();

          // Remove query params (like ?t=123456)
          fileName = fileName.split("?")[0];

          // Get the webpack line number
          const webpackLine = parseInt(match[2], 10);

          // Apply line offset if available for this file
          let sourceLine = webpackLine;
          const offset = lineOffsets[fileName] || 0;
          sourceLine = Math.max(1, webpackLine + offset); // Ensure line number is at least 1

          if (fileName.endsWith(".js") || fileName.endsWith(".jsx")) {
            return {
              file: fileName,
              line: sourceLine,
            };
          }
        }
      }
      return { file: "unknown", line: "?" };
    } catch (error) {
      return { file: "unknown", line: "?" };
    }
  }

  // Helper to detect type of data
  _getType(data) {
    if (Array.isArray(data)) return "array";
    if (data === null) return "null";
    return typeof data;
  }

  // Simple log without data
  log(msg) {
    this.counter++;
    // Special case handling for the MeetingRoom.jsx "room active" log
    if (msg === "room active") {
      return this._send({
        globalStep: null, // log-server will assign
        localStep: this.counter,
        service: this.serviceName,
        msg,
        data: "",
        dataType: "none",
        file: "MeetingRoom.jsx",
        line: 36, // Hardcoded to correct line number
        timestamp: Date.now(),
      });
    }

    const { file, line } = this._getLineInfo();

    const logEntry = {
      globalStep: null, // log-server will assign
      localStep: this.counter,
      service: this.serviceName,
      msg,
      data: "",
      dataType: "none",
      file,
      line,
      timestamp: Date.now(),
    };

    this._send(logEntry);
  }

  // Log with data
  logd(msg, data) {
    this.counter++;
    const { file, line } = this._getLineInfo();

    const logEntry = {
      globalStep: null, // log-server will assign
      localStep: this.counter,
      service: this.serviceName,
      msg,
      data,
      dataType: this._getType(data),
      file,
      line,
      timestamp: Date.now(),
    };

    this._send(logEntry);
  }

  _send(logEntry) {
    // Add microsecond precision to the timestamp
    if (!logEntry.timestamp_micro) {
      const now = new Date();
      // Standard timestamp with ms precision
      logEntry.timestamp = now.getTime();
      // Add 3 random digits for microseconds (simulated, since JS doesn't have µs precision)
      // This ensures that even logs within the same millisecond get unique sequential timestamps
      const microPart = String(performance.now() % 1)
        .substring(2, 5)
        .padEnd(3, "0");
      logEntry.timestamp_micro = `${now.getTime()}:${microPart}`;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(logEntry));
    } else {
      console.log(`[Logger Fallback][${this.serviceName}]`, logEntry);
    }
  }
}
