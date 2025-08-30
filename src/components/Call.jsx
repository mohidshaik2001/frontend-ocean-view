import React, { useEffect } from "react";
import Logger from "../utilities/Logger.js";

import { useNavigate } from "react-router-dom";
function Call({ clientId }) {
  const logger = new Logger();
  const localVideoRef = React.useRef();
  const remoteVideoRef = React.useRef();
  const wsRef = React.useRef();
  const pcRef = React.useRef();
  const [isRemoteMain, setIsRemoteMain] = React.useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;
    pcRef.current.ontrack = (e) => {
      const remoteStream = e.streams[0];
      remoteVideoRef.current.srcObject = remoteStream;
    };
    const ws = new WebSocket("wss://992647dbbd0c.ngrok-free.app");
    wsRef.current = ws;
    wsRef.current.onopen = () => {};
    navigator.mediaDevices
      .getUserMedia({
        video: true,
      })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => {
          pcRef.current.addTrack(track, stream);
        });
        if (wsRef.current.readyState === wsRef.current.OPEN) {
          (async () => {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            wsRef.current.send(
              JSON.stringify({ type: "offer", offer, clientId })
            );
          })();
        }
      });
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      (async () => {
        switch (msg.type) {
          case "offer":
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(msg.offer)
            );
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            wsRef.current.send(
              JSON.stringify({ type: "answer", answer, clientId })
            );
            break;
          case "answer":
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(msg.answer)
            );
            break;
          case "candidate":
            await pcRef.current.addIceCandidate(msg.candidate);
            break;
        }
      })();
    };
    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        wsRef.current.send(
          JSON.stringify({
            type: "candidate",
            candidate: e.candidate,
            clientId,
          })
        );
      }
    };
  }, [clientId]);

  return (
    <div className="relative w-18/20 h-18/20 bg-black">
      <video
        ref={remoteVideoRef}
        className={
          isRemoteMain
            ? "w-full h-full object-cover"
            : "absolute bottom-4 right-4 h-1/3 w-1/3 rounded-lg border-2 border-white object-cover z-50 hover:cursor-pointer hover:border-green-400"
        }
        onClick={() => {
          if (!isRemoteMain) setIsRemoteMain(true);
        }}
        autoPlay
        playsInline
      ></video>
      {/* {isPeerConnected && <video ref={remoteVideoRef} autoPlay></video>} */}
      <video
        ref={localVideoRef}
        className={
          isRemoteMain
            ? "absolute bottom-4 right-4 h-1/3 w-1/3 rounded-lg border-2 border-white object-cover z-50 hover:cursor-pointer hover:border-green-400"
            : "w-full h-full object-cover"
        }
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
          if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject
              .getTracks()
              .forEach((t) => t.stop());
          }
          pcRef.current?.close();
          wsRef.current?.close();

          navigate("meetings");
        }}
      >
        End
      </button>
    </div>
  );
}

export default Call;
