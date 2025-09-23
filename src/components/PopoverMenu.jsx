import React from "react";
import { PopoverButton, PopoverPanel, Popover } from "@headlessui/react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import authService from "../api/user.api.js";
import { logout } from "../store/authSlice.js";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

function PopoverMenu() {
  const authStatus = useSelector((state) => state.auth.status);
  // console.log("auth status", authStatus);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const navItems = [
    {
      name: "Signup",
      slug: "/signup",
      active: !authStatus,
    },
    {
      name: "Login",
      slug: "/login",
      active: !authStatus,
    },

    // {
    //   name: "Logout",
    //   slug: "/",
    //   active: authStatus,
    // },
  ];
  const logoutHandler = async () => {
    console.log("logout");
    authService.logoutUser().then(() => {
      dispatch(logout());
      navigate("/login");
    });
  };
  return (
    <div className="w-full max-w-sm mx-auto text-right">
      <Popover className="relative">
        {({ open }) => (
          <>
            <PopoverButton
              className={`inline-block px-6 py-2 duration-200 bg-gradient-to-r from-[#e6dada] to-[#274046] hover:bg-gradient-to-r hover:from-[#503e3e] hover:to-[#228098] rounded-full text-white `}
            >
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </PopoverButton>

            <PopoverPanel className="absolute right-0 z-10 mt-2 w-44 bg-white rounded-lg shadow-lg ring-1 ring-black/5">
              <div className="p-2 space-y-1">
                {authStatus &&
                  navItems.map(
                    (item) =>
                      item.active && (
                        <button
                          key={item.name}
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-md"
                        >
                          <Link to={item.slug}>{item.name}</Link>
                        </button>
                      )
                  )}
                {!authStatus &&
                  navItems.map(
                    (item) =>
                      !item.active && (
                        <button
                          key={item.name}
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-md"
                        >
                          <Link to={item.slug}>{item.name}</Link>
                        </button>
                      )
                  )}
                {authStatus && (
                  <button
                    key={"Logout"}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={logoutHandler}
                  >
                    Logout
                  </button>
                )}
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>
    </div>
  );
}

export default PopoverMenu;
