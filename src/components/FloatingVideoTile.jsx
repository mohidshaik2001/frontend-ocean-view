import React, { useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { useDispatch } from "react-redux";
import { restoreCall } from "../store/callSlice.js";
import { useNavigate } from "react-router-dom";

function FloatingVideoTile({ localVideoTrack, videoTrack, peerName }) {
  const localVideoRef = useRef();
  const videoRef = useRef();
  const isDragging = useRef(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const initialWidth = 450;
  const initialHeight = 280;
  const marginRight = 180;
  const marginBottom = 170;
  const initialX =
    window.innerWidth - initialWidth - marginRight > 0
      ? window.innerWidth - initialWidth - marginRight
      : 0;
  const initialY =
    window.innerHeight - initialHeight - marginBottom > 0
      ? window.innerHeight - initialHeight - marginBottom
      : 0;

  const handleClickNavigation = () => {
    dispatch(restoreCall());
    navigate("/meeting");
  };

  useEffect(() => {
    if (videoRef.current && videoTrack) {
      const stream = new MediaStream([videoTrack]);
      videoRef.current.srcObject = stream;
    }
  }, [videoTrack]);
  useEffect(() => {
    if (localVideoRef.current && videoTrack) {
      const stream = new MediaStream([videoTrack]);
      localVideoRef.current.srcObject = stream;
    }
  }, [localVideoTrack]);

  return (
    <Rnd
      default={{
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
      }}
      minWidth={320}
      minHeight={240}
      bounds="window"
      onDragStart={(e, d) => {
        isDragging.current = false;
      }}
      onDrag={(e, d) => {
        isDragging.current = true;
      }}
      onDragStop={(e, d) => {
        console.log("Drag stopped at: ", d);
        // Trigger navigation on drag-stop if desired.
        // You can remove this if you only want navigation on click.
        setTimeout(() => {
          isDragging.current = false;
        }, 100);
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        console.log(
          "Resize stopped. New size: ",
          ref.style.width,
          ref.style.height
        );
      }}
    >
      <div
        onClick={() => {
          if (!isDragging.current) {
            handleClickNavigation();
          }
        }}
        className="relative bg-black w-full h-full justify-end items-end cursor-pointer rounded-2xl"
      >
        <video
          ref={localVideoRef}
          className="absolute bottom-4 right-4 h-1/3 w-1/3 rounded-lg border-2 border-white object-cover z-50 hover:border-green-400"
          autoPlay
          playsInline
        />
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          playsInline
        />
      </div>
    </Rnd>
  );
}

export default FloatingVideoTile;
