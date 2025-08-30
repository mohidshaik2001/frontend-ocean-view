import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import callReducer from "./callSlice.js";
const store = configureStore({
  reducer: { auth: authReducer, call: callReducer },
});

export default store;
