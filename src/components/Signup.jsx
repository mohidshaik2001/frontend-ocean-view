import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { set, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import authService from "../api/user.api";
import { login } from "../store/authSlice.js";
import Logo from "./Logo.jsx";
import Input from "./Input.jsx";

function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = React.useState("");
  const { register, handleSubmit } = useForm();
  const create = async ({ fullName, email, password }) => {
    setError("");
    try {
      const user = await authService.registerUser({
        email,
        password,
        fullName,
      });
      console.log("user", user);
      if (user) {
        const user = await authService.loginUser({ email, password });
        dispatch(login({ user }));
        navigate("/");
      } else {
        setError("User already exists");
      }
    } catch (error) {
      setError(error.response.data.message);
    }
  };
  return (
    <div className="flex items-center justify-center h-screen  w-full bg-gradient-to-br from-[#076585] to-[#fff] ">
      <div
        className={`mx-auto w-full max-w-lg  bg-gradient-to-l from-[#076585] to-[#fff] rounded-lg  p-10  border border-black/10`}
      >
        <div className="mb-2 flex justify-center">
          <span className="inline-block w-full max-w-[100px]">
            <Logo width="100%" className="h-25 w-25" />
          </span>
        </div>
        <h2 className="text-center text-2xl font-bold leading-tight">
          Sign up to create account
        </h2>
        <p className="mt-2 text-center text-base text-black/60">
          Already have an account?&nbsp;
          <Link
            to="/login"
            className="font-medium text-primary transition-all duration-200 hover:underline"
          >
            Sign In
          </Link>
        </p>
        {error && <p className="text-red-600 mt-8 text-center">{error}</p>}
        <form onSubmit={handleSubmit(create)} className="mt-8">
          <div className="space-y-5 flex flex-col justify-between items-center">
            <Input
              label="Full Name"
              palceholder="Enter your full name"
              {...register("fullName", {
                required: true,
              })}
            />

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
            <div className="items-center justify-between rounded-md ">
              <button type="submit" className="btn-grad btn-grad:hover w-full ">
                SignUp
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;
