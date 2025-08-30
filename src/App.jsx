import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import "./App.css";
import authService from "./api/user.api.js";
import { login, logout } from "./store/authSlice.js";
import Header from "./components/Header.jsx";
import { Outlet } from "react-router-dom";
function App() {
  const [loading, setLoadig] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((userData) => {
        // console.log("userData", userData);
        if (userData) {
          dispatch(login({ userData }));
        } else {
          dispatch(logout());
        }
      })
      .finally(() => setLoadig(false));
  }, []);

  return !loading ? (
    <div className="min-h-screen flex flex-wrap content-between bg-white">
      <div className="w-full h-screen block bg-gradient-to-br from-[#000000] to-[#434343]">
        <Header />
        <main className="w-full h-175">
          <Outlet />
        </main>
      </div>
    </div>
  ) : null;
}

export default App;
