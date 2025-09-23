import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Container from "../components/containers/Container.jsx";
import Logo from "../components/Logo.jsx";
import FloatingVideoTile from "../components/FloatingVideoTile.jsx";

import { getSFUInstance } from "../api/sfu.api.js";

function Home() {
  const status = useSelector((state) => state.auth.status);
  const callActive = useSelector((state) => state.call.callActive);
  const navigate = useNavigate();

  if (!status) {
    return (
      <Container className="h-full">
        <div className="grid grid-rows-4 w-full h-full rounded-3xl">
          <h1 className="text-5xl row-span-1 text-center p-10 text-gray-300">
            HI there, welcome to Ocean view ,connect via video meet
          </h1>
          <div className="row-span-3 flex flex-row justify-center items-center w-full h-full">
            <Logo className="h-100 w-100" />
          </div>
        </div>
      </Container>
    );
  }
  const clickHandler = () => {
    navigate("/meeting");
    return;
  };

  const peerName = useSelector((state) => state.call.peerName);
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

  return (
    <Container className="h-full">
      <div className="grid grid-rows-4 w-full h-full rounded-3xl p-10">
        <div className=" row-span-1 grid grid-cols-3 grid-rows-3 items-center bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-[40px] h-3/4 w-8/10 p-5 space-x-5">
          <h1 className="text-5xl row-start-1 col-start-1 text-center  text-white">
            Connect..
          </h1>
          <h1 className="text-5xl row-start-2 col-start-2 text-center  text-white ">
            Communicate..
          </h1>
          <h1 className="text-5xl row-start-3 col-start-3 text-center  text-white ">
            Collabrate..
          </h1>
        </div>

        <div className="row-span-3  flex flex-row justify-center items-center w-full h-full">
          <Logo className="h-100 w-100" />
        </div>
      </div>
    </Container>
  );
}

export default Home;
