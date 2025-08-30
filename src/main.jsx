import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import VideoCall from "./pages/videocall.jsx";
import MeetingRoom from "./pages/MeetingRoom.jsx";
import AuthLayout from "./components/containers/AuthLayout.jsx";
import { createBrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store.js";
import { RouterProvider } from "react-router-dom";
import { StrictMode } from "react";
import Logger from "./utilities/Logger.js";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/login",
        element: (
          <AuthLayout authentication={false}>
            <Login />
          </AuthLayout>
        ),
      },
      {
        path: "/videocall",
        element: (
          <AuthLayout authentication={true}>
            <VideoCall />
          </AuthLayout>
        ),
      },
      {
        path: "/meetings",
        element: (
          <AuthLayout authentication={true}>
            <MeetingRoom />
          </AuthLayout>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);

const logger = new Logger();
export { logger };
