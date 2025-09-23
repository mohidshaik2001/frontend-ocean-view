import React from "react";

function ToggleSwitch({ label, Icon, isOn, onChange }) {
  return (
    <label className="flex items-center cursor-pointer">
      <span className="mr-2 relative">
        <span
          className={`flex items-center justify-center w-10 h-10 rounded-full text-2xl transition-colors duration-300 ${
            isOn ? "bg-green-400 text-white" : "bg-gray-400 text-gray-700"
          }`}
        >
          <Icon className="w-6 h-6" />
          {!isOn && (
            <span
              className="absolute left-1.5 top-1/2 w-7 h-0.5 bg-red-500"
              style={{
                transform: "translateY(-50%) rotate(-20deg)",
              }}
            ></span>
          )}
        </span>
      </span>
      <div className="relative ml-2">
        <input
          type="checkbox"
          checked={isOn}
          onChange={onChange}
          className="sr-only"
        />
        {/* <div
          className={`w-12 h-6 rounded-full shadow-inner transition-colors duration-300 ${
            isOn ? "bg-green-400" : "bg-gray-400"
          }`}
        ></div>
        <div
          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
            isOn ? "translate-x-6" : ""
          }`}
        ></div> */}
      </div>
      <span className="ml-4 text-sm">
        {label}
        {isOn ? "\nEnabled" : "\nDisabled"}
      </span>
    </label>
  );
}

export default ToggleSwitch;
