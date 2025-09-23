import React, { useEffect, useRef, useState } from "react";

function ScreenShareTile({ videoTrack, peerName }) {
  const videoRef = useRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoTrack) {
      const stream = new MediaStream([videoTrack]);
      videoRef.current.srcObject = stream;
    }
    
    // Add a slight delay to trigger the entry animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [videoTrack]);

  return (
    <div className={`screen-share-tile ${isVisible ? 'visible' : ''}`}>
      <video ref={videoRef} autoPlay playsInline />
      <div className="screen-share-info">
        <span>{peerName || 'Screen Share'}</span>
      </div>
    </div>
  );
}

export default ScreenShareTile;
