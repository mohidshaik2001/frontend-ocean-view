import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import webrtcService from "../api/webrtcService.js";
import wsService from "../api/wsService";
import { endCall, startCall } from "../store/callSlice.js";
import { logger } from "../main.jsx";

function Call2() {
  const remoteVideoRef = React.useRef(null);
  const localVideoRef = React.useRef(null);
  const remoteScreenRef = React.useRef(null);
  const callActive = useSelector((state) => state.call.callActive);
  const [isRemoteMain, setIsRemoteMain] = React.useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [remoteStream, setRemoteStream] = React.useState(null);
  const [isPeerConnected, setIsPeerConnected] = React.useState(false);

  logger.logd("call active", callActive);

  useEffect(() => {
    if (callActive) {
      (async () => {
        const { localStream, remoteStream } = await webrtcService.getStreams();

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      })();
    } else {
      (async () => {
        await wsService.connect();

        await webrtcService.startCall();
        const { localStream, remoteStream } = await webrtcService.getStreams();

        localVideoRef.current.srcObject = localStream;
        remoteVideoRef.current.srcObject = remoteStream;

        dispatch(startCall());
      })();
    }
  }, []);
  function hasActiveTracks(stream) {
    if (!stream) return false;
    const tracks = stream.getTracks();
    return tracks && tracks.some((track) => track.readyState !== "ended");
  }

  useEffect(() => {
    setIsPeerConnected(webrtcService.isPeerConnected());

    webrtcService.onRemoteScreenStreamChange = (stream) => {
      if (remoteScreenRef.current && stream) {
        remoteScreenRef.current.srcObject = stream;
      }
    };

    webrtcService.onRemoteStreamChange = (stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
        setIsPeerConnected(hasActiveTracks(stream));
      }
    };

    return () => {
      webrtcService.onRemoteStreamChange = null;
    };
  }, []);

  //className

  const localClassNoPeer = "w-full h-full object-cover";
  const remoteClassNoPeer = "hidden";

  const localClassStandard = isRemoteMain
    ? "absolute bottom-4 right-4 h-1/3 w-1/3 rounded-lg border-2 border-white object-cover z-50 hover:cursor-pointer hover:border-green-400"
    : "w-full h-full object-cover";

  const remoteClassStandard = isRemoteMain
    ? "w-full h-full object-cover"
    : "absolute bottom-4 right-4 h-1/3 w-1/3 rounded-lg border-2 border-white object-cover z-50 hover:cursor-pointer hover:border-green-400";
  return (
    <div className="relative w-18/20 h-18/20 bg-black">
      <video
        ref={remoteVideoRef}
        className={isPeerConnected ? remoteClassStandard : remoteClassNoPeer}
        onClick={() => {
          if (!isRemoteMain) setIsRemoteMain(true);
        }}
        autoPlay
        playsInline
      ></video>
      {/* {isPeerConnected && <video ref={remoteVideoRef} autoPlay></video>} */}
      <video
        ref={remoteScreenRef}
        className="absolute top-0 left-0 w-1/2 h-1/2 object-cover z-40 border-2 border-white hover:border-amber-100"
        autoPlay
        playsInline
      />
      <video
        ref={localVideoRef}
        className={isPeerConnected ? localClassStandard : localClassNoPeer}
        onClick={() => {
          if (isRemoteMain) setIsRemoteMain(false);
        }}
        playsInline
        autoPlay
      ></video>
      <button
        className="btn-glossy btn-glossy::before btn-glossy:hover::before"
        onClick={() => {
          // stop local video + close peer + close websocket

          console.log("end call clciked");
          webrtcService.stopCall();
          wsService.stopCall();
          dispatch(endCall());

          navigate("/meetings");
        }}
      >
        End
      </button>
      <button
        className="btn2-glossy btn2-glossy::before btn2-glossy:hover::before"
        onClick={() => {
          // stop local video + close peer + close websocket

          console.log("share screen clciked");
          webrtcService.shareScreen();
        }}
      >
        shareScreen
      </button>
    </div>
  );
}

export default Call2;
