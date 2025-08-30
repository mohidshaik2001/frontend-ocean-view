import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  roomId: null,
  callActive: false,
  minimized: false,
  cameraEnabled: false,
  micEnabled: false,
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    startCall: (state, action) => {
      state.callActive = true;
    },
    endCall: (state, action) => {
      state.callActive = false;
    },
    minimizeCall: (state, action) => {
      state.minimized = true;
    },
    restoreCall: (state, action) => {
      state.minimized = false;
    },
    setRoomId: (state, action) => {
      state.roomId = action.payload;
    },
    setCameraEnabled: (state, action) => {
      state.cameraEnabled = action.payload;
    },
    setMicEnabled: (state, action) => {
      state.micEnabled = action.payload;
    },
  },
});

export const { startCall, endCall, minimizeCall, restoreCall, setRoomId, setCameraEnabled, setMicEnabled } =
  callSlice.actions;
export default callSlice.reducer;
