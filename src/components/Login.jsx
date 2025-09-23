import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import Input from "./Input.jsx";
import authService from "../api/user.api.js";
import { login } from "../store/authSlice.js";
import Logo from "./Logo.jsx";

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm();

  const loginHandler = async ({ email, password }) => {
    console.log("loginin handler");
    setError("");
    try {
      const userData = await authService.loginUser({
        email,
        password,
      });
      console.log("userData", userData);
      if (userData) {
        console.log("userData in Logincomponent", userData);
        dispatch(login({ userData }));
        navigate("/");
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center w-full  h-screen ">
      <div
        className={`mx-auto w-full max-w-lg bg-gradient-to-br from-[#bdc3c7] to-[#2c3e50] rounded-3xl p-10 border border-black/50`}
      >
        <div className="mb-2 flex justify-center">
          <span className="inline-block w-full max-w-[100px]">
            <Logo width="100%" className="h-25 w-25" />
          </span>
        </div>
        <h2 className="text-center text-2xl font-bold leading-tight  ">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-base text-black/60">
          Don&apos;t have any account?&nbsp;
          <Link
            to="/signup"
            className="font-medium text-primary transition-all duration-200 hover:underline"
          >
            Signup
          </Link>
        </p>
        {error && <p className="text-red-600 mt-8 text-center">{error}</p>}

        <form onSubmit={handleSubmit(loginHandler)} className="mt-8">
          <div className="space-y-5 flex flex-col justify-between items-center">
            <Input
              label="Email: "
              palceholder="Enter your email"
              type="email"
              {...register("email", {
                required: true,
                validate: {
                  matchPattern: (value) =>
                    /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value) ||
                    "Email address must be a valid address",
                },
              })}
            />

            <Input
              label="Password"
              type="password"
              palceholder="Enter Password"
              {...register("password", {
                required: true,
              })}
            />
            <div className="items-center justify-between  rounded-md">
              <button
                type="submit"
                className="btn-grad btn-grad:hover w-full  "
              >
                Sign in
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
