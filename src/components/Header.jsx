import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Container from "./containers/Container.jsx";
import Logo from "./Logo.jsx";
import PopoverMenu from "./PopoverMenu.jsx";

function Header() {
  const navigate = useNavigate();
  const authStatus = useSelector((state) => state.auth.status);
  const [buttonPath, setButtonPath] = useState(true);
  useEffect(() => {
    const currentPath = window.location.pathname;
    console.log("currentPath", currentPath);
    if (currentPath === "/videocall") {
      setButtonPath(false);
    } else {
      setButtonPath(true);
    }
  }, [window.location.pathname]);
  const navItems = [
    {
      name: "Home",
      path: "/",
      active: true,
    },
    {
      name: "Login",
      path: "/login",
      active: !authStatus,
    },
    {
      name: "Signup",
      path: "/signup",
      active: !authStatus,
    },
    { name: "Meetings", path: "/meetings", active: authStatus && buttonPath },
  ];
  const clickHandler = (path) => {
    console.log(`clicked ${path}`);
    navigate(path);
  };

  return (
    <header className="py-3 shadow  border-b border-gray-200">
      <Container>
        <nav className="grid grid-cols-2">
          <div className="mr-4 ">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <ul className="flex flex-row items-center justify-end gap-4">
            {navItems.map((item) =>
              item.active ? (
                <li className="mr-4" key={item.name}>
                  <button
                    onClick={() => clickHandler(item.path)}
                    className="inline-block px-6 py-2 duration-200 bg-gradient-to-r from-[#e6dada] to-[#274046] hover:bg-gradient-to-r hover:from-[#deeced] hover:to-[#09667d] hover:text-white hover:shadow-sm hover:border-1 hover:border-white  rounded-full"
                  >
                    {item.name}
                  </button>
                </li>
              ) : null
            )}
            <li>
              <PopoverMenu />
            </li>
          </ul>
        </nav>
      </Container>
    </header>
  );
}

export default Header;
