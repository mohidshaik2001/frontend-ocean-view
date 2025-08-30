import React, { useState, useEffect } from "react";
import Container from "./containers/Container.jsx";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import {
  setRoomId,
  setCameraEnabled,
  setMicEnabled,
} from "../store/callSlice.js";

import { signalingService } from "../api/signaling.api.js";
function MeetingRoom() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();
  const roomId = useSelector((state) => state.call.roomId);
  const dispatch = useDispatch();
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [roomAvailable, setRoomAvailable] = useState(false);
  const joinHandler = ({ roomId }) => {
    dispatch(setRoomId(roomId));
  };

  const callhandler = ({ roomId }) => {
    dispatch(setRoomId(roomId));
    dispatch(setCameraEnabled(camera));
    dispatch(setMicEnabled(mic));
    navigate("/videocall");
  };
  useEffect(async () => {
    /*
send room id to signalling to find room is available
*/
    await signalingService.checkRoomIsActive(roomId).then((res) => {
      setRoomAvailable(res);
    });
  }, [roomId]);
  if (roomId == null) {
    return (
      <Container className={`h-full`}>
        <div
          className="flex flex-col justify-center  items-center w-full h-100
      bg-gradient-to-br from-[#59bcc1] to-[#547374] rounded-3xl"
        >
          <div className="text-5xl">
            <h1>Meetings</h1>
          </div>
          {/* TODO  <div>{ <h1>meetings</h1> }</div>  */}

          <div className="flex flex-row justify-center  items-center w-full h-full ">
            <form
              onSubmit={handleSubmit(joinHandler)}
              className="mt-10 space-8  h-50"
            >
              <div className="space-y-5 flex flex-col h-1/2 justify-between items-center">
                <input
                  label="roomId"
                  type="text"
                  {...register("roomId")}
                  placeholder="Enter Room Id"
                  className=" w-full max-w-xs h-full text-3xl border-2 rounded-xl border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-800 focus:border-transparent p-5"
                />
              </div>
              <div className="flex flex-col justify-center items-center w-full h-full space-y-4">
                {/* Camera and Mic Toggle Switches */}

                <button className="btn-grad2 btn-grad2:hover" type="submit">
                  join
                </button>
              </div>
            </form>
          </div>
        </div>
      </Container>
    );
  } else {
    return (
      <Container className={`h-full`}>
        <div
          className="flex flex-col justify-center  items-center w-full h-100
      bg-gradient-to-br from-[#59bcc1] to-[#547374] rounded-3xl"
        >
          <div className="text-5xl">
            <h1>Meetings</h1>
          </div>
          {/* TODO  <div>{ <h1>meetings</h1> }</div>  */}

          <div className="flex flex-row justify-center  items-center w-full h-full ">
            <div className="flex flex-row justify-center  items-center w-full h-full ">
              <div className="flex flex-row space-x-8 mb-4">
                {/* Camera Toggle */}
                <label className="flex items-center cursor-pointer">
                  <span className="mr-2 relative">
                    <span
                      className={`flex items-center justify-center w-10 h-10 rounded-full text-2xl transition-colors duration-300 ${
                        camera
                          ? "bg-green-400 text-white"
                          : "bg-gray-400 text-gray-700"
                      }`}
                    >
                      📷
                      {!camera && (
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
                      checked={camera}
                      onChange={() => setCamera((prev) => !prev)}
                      className="sr-only"
                    />
                    <div
                      className={`w-12 h-6 rounded-full shadow-inner transition-colors duration-300 ${
                        camera ? "bg-green-400" : "bg-gray-400"
                      }`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                        camera ? "translate-x-6" : ""
                      }`}
                    ></div>
                  </div>
                  <span className="ml-4 text-sm">
                    Camera {camera ? "On" : "Off"}
                  </span>
                </label>
                {/* Mic Toggle */}
                <label className="flex items-center cursor-pointer">
                  <span className="mr-2 relative">
                    <span
                      className={`flex items-center justify-center w-10 h-10 rounded-full text-2xl transition-colors duration-300 ${
                        mic
                          ? "bg-green-400 text-white"
                          : "bg-gray-400 text-gray-700"
                      }`}
                    >
                      🎤
                      {!mic && (
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
                      checked={mic}
                      onChange={() => setMic((prev) => !prev)}
                      className="sr-only"
                    />
                    <div
                      className={`w-12 h-6 rounded-full shadow-inner transition-colors duration-300 ${
                        mic ? "bg-green-400" : "bg-gray-400"
                      }`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                        mic ? "translate-x-6" : ""
                      }`}
                    ></div>
                  </div>
                  <span className="ml-4 text-sm">Mic {mic ? "On" : "Off"}</span>
                </label>
                <button
                  className="btn-grad2 btn-grad2:hover"
                  type="button"
                  onClick={callhandler}
                >
                  {roomAvailable ? "Join" : "Create room and join"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    );
  }
}

export default MeetingRoom;
