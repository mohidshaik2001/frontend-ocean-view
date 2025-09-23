import React, { useState, useEffect } from "react";
import Container from "./containers/Container.jsx";
import MeetingComponent from "./Meeting.jsx";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import {
  setRoomId,
  setCameraEnabled,
  setMicEnabled,
  setPeerName,
} from "../store/callSlice.js";
import ToggleSwitch from "./ToggleSwitch.jsx";
import { signalingService } from "../api/signaling.api.js";
import { logger } from "../main.jsx";
import { CameraIcon, MicrophoneIcon } from "@heroicons/react/24/solid";
import { getSFUInstance } from "../api/sfu.api.js";
import FloatingVideoTile from "./FloatingVideoTile.jsx";

function MeetingRoom() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();
  const roomId = useSelector((state) => state.call.roomId);
  const peerName = useSelector((state) => state.call.peerName);
  const callActive = useSelector((state) => state.call.callActive);
  const dispatch = useDispatch();
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [roomAvailable, setRoomAvailable] = useState(false);

  const joinHandler = ({ roomId, peerName }) => {
    dispatch(setRoomId(roomId));
    dispatch(setPeerName(peerName));
  };
  const clickHandler = () => {
    navigate("/meeting");
    return;
  };

  const callhandler = async () => {
    if (!roomAvailable) {
      dispatch(setCameraEnabled(camera));
      dispatch(setMicEnabled(mic));
      navigate("/meeting");
    }
    if (roomAvailable && callActive) {
      navigate("/meeting");
      return;
    }
    // for now add some ranodm details later fix this by getting userdata
    const names = [
      "test",
      "test1",
      "test2",
      "test3",
      "test4",
      "test5",
      "test6",
      "test7",
      "test8",
      "test9",
      "test10",
    ];
    const name = names[Math.floor(Math.random() * names.length)];
    const callerDetails = {
      name,
      camera,
      mic,
    };
    const response = await signalingService.joinCall({
      roomId,
      callerDetails,
    });
    if (!response) {
      return;
    }
    if (response == true) {
      dispatch(setCameraEnabled(camera));
      dispatch(setMicEnabled(mic));
      navigate("/meeting");
    }
  };

  const resetHandler = () => {
    dispatch(setRoomId(null));
    dispatch(setPeerName(null));
  };

  useEffect(() => {
    let isMounted = true;
    const checkRoom = async () => {
      try {
        logger.log("room active");
        const isActive = await signalingService.checkRoomIsActive(roomId);
        if (isMounted) {
          setRoomAvailable(isActive);
        }
      } catch (error) {
        console.error("Failed to check room status:", error);
        if (isMounted) {
          setRoomAvailable(false);
        }
      }
    };

    if (roomId) {
      checkRoom();
    }

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Component for entering room ID
  const RoomEntryForm = () => (
    <Container className={`h-full`}>
      <div
        className="flex flex-col justify-center items-center w-full h-150
      bg-gradient-to-br from-[#bdc3c7] to-[#2c3e50] rounded-3xl my-10 p-10"
      >
        <div className="text-5xl">
          <h1>Meetings</h1>
        </div>

        <div className="flex flex-row justify-center items-center w-full h-full">
          <form
            onSubmit={handleSubmit(joinHandler)}
            className="mt-5 space-5 h-full px-2 py-10 "
          >
            <div className="space-y-5 flex flex-col h-1/2 justify-between items-center">
              <input
                label="roomId"
                type="text"
                {...register("roomId")}
                placeholder="Enter Room Id"
                className="w-full max-w-xs h-full text-3xl border-2 rounded-xl border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-800 focus:border-transparent p-5"
              />
              <input
                label="peer name"
                type="text"
                {...register("peerName")}
                placeholder="Enter your name"
                className="w-full max-w-xs h-full text-3xl border-2 rounded-xl border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-800 focus:border-transparent p-5"
              />
            </div>
            <div className="flex flex-col justify-center items-center w-full h-full space-y-5">
              <button className="btn-grad2 btn-grad2:hover" type="submit">
                join
              </button>
            </div>
          </form>
        </div>
      </div>
    </Container>
  );

  // Component for joining an existing room
  const RoomJoinOptions = () => (
    <Container className={`h-full`}>
      <div
        className="flex flex-col justify-center items-center w-full h-150
      bg-gradient-to-br from-[#bdc3c7] to-[#2c3e50] rounded-3xl my-10 p-10 space-y-2"
      >
        <div className="text-5xl">
          <h1>{roomId || "Meeting Room"}</h1>
        </div>
        <div className="text-3xl mt-2">
          {roomAvailable ? (
            <h2 className="bg-gradient-to-r from-[#39653d] via-[#211b0c] to-[#0963b1] bg-clip-text text-transparent">
              Room Available
            </h2>
          ) : (
            <h2 className="bg-gradient-to-r from-[#F7941E] via-[#211b0c] to-[#004E8F] bg-clip-text text-transparent">
              Create New Room
            </h2>
          )}
        </div>
        <div className="text-3xl ">
          {peerName && <h2>{peerName.toUpperCase()}</h2>}
        </div>

        <div className="flex flex-row justify-center items-center w-full h-full mt-10">
          <div className="flex flex-col space-y-8">
            <div className="flex flex-row space-x-16 justify-center">
              <ToggleSwitch
                label="Camera"
                Icon={CameraIcon}
                isOn={camera}
                onChange={() => setCamera((prev) => !prev)}
              />

              <ToggleSwitch
                label="Mic"
                Icon={MicrophoneIcon}
                isOn={mic}
                onChange={() => setMic((prev) => !prev)}
              />
            </div>

            <div className="flex justify-center">
              <button
                className="btn-grad2 btn-grad2:hover"
                type="button"
                onClick={callhandler}
              >
                {roomAvailable ? "Join" : "Create room and join"}
              </button>
              <button
                className="btn-grad2 btn-grad2:hover"
                type="button"
                onClick={resetHandler}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );

  if (callActive) {
    const sfuService = getSFUInstance();
    let self = null;
    let other = null;
    if (sfuService) {
      self = sfuService.peers.values().next().value;
      other = sfuService.peers.values().next().value;
    }

    let localVideoTrack = null;
    let videoTrack = null;

    if (self) {
      self.forEach((mediaState, key) => {
        if (!mediaState) {
          return;
        }
        if (mediaState.kind === "video") {
          if (mediaState.producer?.paused || mediaState.consumer?.paused) {
            logger.log("Video track is paused");
            localVideoTrack = null;
          } else {
            localVideoTrack = mediaState.track;
          }
        }
      });
    }

    if (other) {
      other.forEach((mediaState, key) => {
        if (!mediaState) {
          return;
        }
        if (mediaState.kind === "video") {
          if (mediaState.producer?.paused || mediaState.consumer?.paused) {
            logger.log("Video track is paused");
            videoTrack = null;
          } else {
            videoTrack = mediaState.track;
          }
        }
      });
    }

    return (
      <Container className={`h-full`}>
        <div className="flex flex-row justify-center items-center w-full h-100 ">
          <div className="flex flex-col justify-center items-center w-full h-full -2 space-y-2 mt-2">
            <h1 className="text-3xl text-white">Already in a Meeting</h1>
            <div className="flex flex-row justify-center items-center w-full ">
              <button
                className="btn-grad2 btn-grad2:hover"
                type="button"
                onClick={clickHandler}
              >
                go to meeting
              </button>
            </div>
          </div>
          <FloatingVideoTile
            localVideoTrack={localVideoTrack}
            videoTrack={videoTrack}
            peerName={peerName}
          />
        </div>
      </Container>
    );
  }

  // Conditional rendering based on whether we have a room ID
  return roomId ? <RoomJoinOptions /> : <RoomEntryForm />;
}

export default MeetingRoom;
