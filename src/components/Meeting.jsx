import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { SFUService } from "../api/sfu.api";

function Meeting() {
  const roomId = useSelector((state) => state.call.roomId);
  const userData = useSelector((state) => state.auth.userData);
  const cameraEnabled = useSelector((state) => state.call.cameraEnabled);
  const micEnabled = useSelector((state) => state.call.micEnabled);
  const videoRef = useRef();

  useEffect(() => {
    const sfuService = new SFUService({
      roomId,
      peerId: userData._id,
      initialCamera: cameraEnabled,
      initialMic: micEnabled,
    });

    sfuService.joinRoom().then(() => {
      // Only get user media if either camera or mic is enabled
      if (cameraEnabled || micEnabled) {
        sfuService.userMediaDevices().then((stream) => {
          // If camera is disabled, remove video track
          if (!cameraEnabled) {
            stream.getVideoTracks().forEach((track) => track.stop());
          }
          // If mic is disabled, remove audio track
          if (!micEnabled) {
            stream.getAudioTracks().forEach((track) => track.stop());
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        });
      }
    });

    return () => {
      // Cleanup
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, userData._id, cameraEnabled, micEnabled]);

  return (
    <div className="meeting-container">
      <div className="video-container">
        {cameraEnabled || micEnabled ? (
          <video ref={videoRef} autoPlay playsInline />
        ) : (
          <div className="dummy-video">
            <div className="avatar">{userData.name?.[0] || "?"}</div>
            <div className="status-icons">
              {!cameraEnabled && <span className="icon">🚫📷</span>}
              {!micEnabled && <span className="icon">🚫🎤</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Meeting;
