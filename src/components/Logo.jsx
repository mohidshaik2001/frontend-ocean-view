import React from "react";
import pageLogo from "../assets/water.svg";

function Logo({ className = "" }) {
  return (
    <div className="w-full ">
      <img src={pageLogo} alt="logo" className={`w-2/20 h-1/20 ${className}`} />
    </div>
  );
}

export default Logo;
