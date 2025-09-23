import React, { useEffect, useRef, useState } from "react";
import "./Meeting.css";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/solid";

function VideoTile({ peer, audioTrack, videoTrack, showAvatar, isLocal }) {
  const videoRef = useRef();
  const audioRef = useRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Add a slight delay to trigger the entry animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (videoRef.current && videoTrack) {
      const stream = new MediaStream([videoTrack]);
      videoRef.current.srcObject = stream;
    }
  }, [videoTrack]);

  useEffect(() => {
    if (audioRef.current && audioTrack) {
      const stream = new MediaStream([audioTrack]);
      audioRef.current.srcObject = stream;
    }
  }, [audioTrack]);

  return (
    <div className={`video-tile ${isVisible ? "visible" : ""}`}>
      {videoTrack ? (
        <video ref={videoRef} autoPlay playsInline />
      ) : (
        showAvatar && <div className="avatar">{peer.name?.[0] || "?"}</div>
      )}
      <audio ref={audioRef} autoPlay muted={isLocal} />
      {/* over lay of speaker icon*/}
      <div className="absolute bottom-2 right-2 p-1 bg-black/50 rounded-full">
        {audioTrack ? (
          <SpeakerWaveIcon className="w-6 h-6 text-green-500" />
        ) : (
          <SpeakerXMarkIcon className="w-6 h-6 text-red-500" />
        )}
      </div>

      <div className="peer-name absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
        {peer.name || "Unknown"}
      </div>
      {/* <div className="peer-name">{peer.name || "Unknown"}</div> */}
    </div>
  );
}

export default VideoTile;
