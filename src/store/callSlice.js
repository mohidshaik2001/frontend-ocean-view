import { createSlice } from "@reduxjs/toolkit";

// Utility to load from sessionStorage safely
const loadFromSession = (key, fallback) => {
  const value = sessionStorage.getItem(key);
  return value !== null ? JSON.parse(value) : fallback;
};

// Initial state — pull values from sessionStorage if available
const initialState = {
  roomId: loadFromSession("roomId", null),
  callActive: loadFromSession("callActive", false),
  minimized: loadFromSession("minimized", false),
  cameraEnabled: loadFromSession("cameraEnabled", false),
  micEnabled: loadFromSession("micEnabled", false),
  peerName: loadFromSession("peerName", null),
};

// Helper to save into sessionStorage whenever state changes
const saveToSession = (key, value) => {
  sessionStorage.setItem(key, JSON.stringify(value));
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    startCall: (state) => {
      state.callActive = true;
      saveToSession("callActive", true);
    },
    endCall: (state) => {
      state.callActive = false;
      saveToSession("callActive", false);
    },
    minimizeCall: (state) => {
      state.minimized = true;
      saveToSession("minimized", true);
    },
    restoreCall: (state) => {
      state.minimized = false;
      saveToSession("minimized", false);
    },
    setRoomId: (state, action) => {
      state.roomId = action.payload;
      saveToSession("roomId", action.payload);
    },
    setCameraEnabled: (state, action) => {
      state.cameraEnabled = action.payload;
      saveToSession("cameraEnabled", action.payload);
    },
    setMicEnabled: (state, action) => {
      state.micEnabled = action.payload;
      saveToSession("micEnabled", action.payload);
    },
    setPeerName: (state, action) => {
      state.peerName = action.payload;
      saveToSession("peerName", action.payload);
    },
    clearPeerName: (state) => {
      state.peerName = null;
      sessionStorage.removeItem("peerName");
    },
  },
});

export const {
  startCall,
  endCall,
  minimizeCall,
  restoreCall,
  setRoomId,
  setCameraEnabled,
  setMicEnabled,
  setPeerName,
  clearPeerName,
} = callSlice.actions;

export default callSlice.reducer;
