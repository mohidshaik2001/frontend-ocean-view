import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  status: true,
  userData: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      // Accepts either {userData: ...} or a full API response with .data
      let user =
        action.payload.userData || action.payload.data || action.payload;
      state.status = true;
      state.userData = user;
    },
    logout: (state) => {
      state.status = false;
      state.userData = null;
    },
  },
});

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;
