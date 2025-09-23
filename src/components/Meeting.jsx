import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { configureSFU, getSFUInstance, resetSFU } from "../api/sfu.api.js";
import { signalingService } from "../api/signaling.api.js";
import VideoTile from "./VideoTile.jsx";
import ScreenShareTile from "./ScreenShareTile.jsx";
import JoinRequest from "./JoinRequest.jsx";
import "./Meeting.css";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { logger } from "../main.jsx";
import {
  startCall,
  endCall,
  setMicEnabled,
  setCameraEnabled,
  setRoomId,
  setPeerName,
} from "../store/callSlice.js";
// Import icons from Heroicons
import {
  MicrophoneIcon,
  NoSymbolIcon,
  VideoCameraIcon,
  ArrowsPointingOutIcon,
  TvIcon,
  XMarkIcon,
  Cog6ToothIcon,
  PhoneXMarkIcon,
  Squares2X2Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";

function Meeting() {
  const dispatch = useDispatch();
  const roomId = useSelector((state) => state.call.roomId);

  const peerName = useSelector((state) => state.call.peerName);
  const cameraEnabled = useSelector((state) => state.call.cameraEnabled);
  const micEnabled = useSelector((state) => state.call.micEnabled);
  const [sfuService, setSfuService] = useState(null);
  const callActive = useSelector((state) => state.call.callActive);
  // Add a peersVersion state to trigger re-renders
  const [peersVersion, setPeersVersion] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [layout, setLayout] = useState("grid");
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef(null);
  const layoutButtonRef = useRef(null);
  // State for join requests
  const [joinRequests, setJoinRequests] = useState([]);
  const navigate = useNavigate();
  console.log("cameraEnabled", cameraEnabled);
  console.log("micEnabled", micEnabled);
  useEffect(() => {
    // sessionStorage.removeItem("peerName");
    // sessionStorage.removeItem("roomId");
    // sessionStorage.removeItem("cameraEnabled");
    // sessionStorage.removeItem("micEnabled");
    // dispatch(setRoomId(roomId));
    // dispatch(setPeerName(peerName));
    // dispatch(setCameraEnabled(cameraEnabled));
    // dispatch(setMicEnabled(micEnabled));
    console.log("this useEffect is running");

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "Are you sure you want to leave the meeting?";
      dispatch(endCall());
      // sessionStorage.setItem("peerName", peerName);
      // sessionStorage.setItem("roomId", roomId);
      console.log("cameraEnabled in useeffect", cameraEnabled);
      // sessionStorage.setItem("cameraEnabled", cameraEnabled);
      console.log("micEnabled in useeffect", micEnabled);
      // sessionStorage.setItem("micEnabled", micEnabled);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (callActive) {
      const sfu = getSFUInstance();
      logger.log("Getting existing SFU instance");
      if (!sfu) {
        navigate("/");
      }
      setSfuService(sfu); // Using the state setter function instead of direct assignment
    } else {
      const setupSFU = async () => {
        try {
          // Ensure WebSocket is connected before proceeding
          await signalingService.connect();
          logger.log("WebSocket connected successfully");

          const peerId = uuidv4();
          logger.logd("peer name ", peerName);
          const sfu = configureSFU({
            roomId,
            peerId: peerId,
            initialCamera: cameraEnabled,
            initialMic: micEnabled,
            peerName,
          });
          setIsScreenSharing(sfu.screenSharing);
          // Join room first to consume existing streams
          await sfu.joinRoom();

          // Then produce local media if needed
          if (cameraEnabled || micEnabled) {
            await sfu.produceLocalMedia();
          }

          // Listen for events that modify the peers map
          sfu.on("newConsumer", () => {
            setPeersVersion((v) => v + 1);
          });

          sfu.on("producerClosed", () => {
            setPeersVersion((v) => v + 1);
          });

          sfu.on("peerLeft", () => {
            setPeersVersion((v) => v + 1);
          });

          sfu.on("peerJoined", () => {
            setPeersVersion((v) => v + 1);
          });
          sfu.on("consumerPaused", () => {
            setPeersVersion((v) => v + 1);
          });
          sfu.on("consumerResumed", () => {
            setPeersVersion((v) => v + 1);
          });

          sfu.on("producerPaused", () => {
            setPeersVersion((v) => v + 1);
          });
          sfu.on("producerResumed", () => {
            setPeersVersion((v) => v + 1);
          });

          setSfuService(sfu);
          dispatch(startCall());
        } catch (error) {
          logger.logd("Error setting up SFU", error.stack);
          console.error("Failed to setup WebRTC connection:", error);
          // Optionally navigate back or show error to user
          // navigate("/");
        }
      };
      setupSFU();
    }
  }, [roomId]);

  // Log when re-renders happen due to peers changes
  useEffect(() => {
    if (sfuService) {
      setIsScreenSharing(sfuService.screenSharing);
      setScreenShareVisible(sfuService.screenSharing);
      sfuService.off("screenShareStopped");
      sfuService.on("screenShareStopped", () => {
        setScreenShareVisible(false);
        setTimeout(() => {
          setIsScreenSharing(false);
        }, 300);
      });
    }
    console.log("Peers updated, version:", peersVersion);
  }, [peersVersion]);

  // Handle join requests from other peers
  useEffect(() => {
    // Save the peer ID to localStorage for use in join request handlers
    const peerId = localStorage.getItem("peerId");
    if (!peerId) {
      localStorage.setItem("peerId", uuidv4());
    }

    // Listen for join requests
    const handleJoinRequest = (data) => {
      logger.log("Received join request", data);
      const { callerDetails, requestId } = data;

      // Add the new request to our state
      setJoinRequests((prev) => [
        ...prev,
        {
          id: requestId,
          callerDetails,
          requestId,
          roomId,
          timestamp: Date.now(),
        },
      ]);
    };

    // Listen for accepted join requests (to update UI)
    const handleJoinRequestAccepted = (data) => {
      logger.log("Join request accepted", data);
      const { requestId } = data;

      // Remove this request from our list
      setJoinRequests((prev) =>
        prev.filter((req) => req.requestId !== requestId)
      );
    };

    signalingService.on("event:peerWishToJoinRoom", handleJoinRequest);
    signalingService.on("event:joinRequestAccepted", handleJoinRequestAccepted);

    return () => {
      signalingService.off("event:peerWishToJoinRoom", handleJoinRequest);
      signalingService.off(
        "event:joinRequestAccepted",
        handleJoinRequestAccepted
      );
    };
  }, [roomId]);

  // Handle click outside to close layout menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isLayoutMenuOpen &&
        layoutMenuRef.current &&
        !layoutMenuRef.current.contains(event.target) &&
        layoutButtonRef.current &&
        !layoutButtonRef.current.contains(event.target)
      ) {
        setIsLayoutMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLayoutMenuOpen]);

  const handleEndCall = () => {
    if (sfuService) {
      sfuService.close();
      resetSFU();
    }
    if (signalingService) {
      signalingService.disconnect();
    }
    dispatch(endCall());

    navigate("/meetings");
  };
  const handleCameraToggle = () => {
    if (sfuService) {
      if (!cameraEnabled) {
        sfuService.toggleCamera(true);
      } else {
        sfuService.toggleCamera(false);
      }
    }
    dispatch(setCameraEnabled(!cameraEnabled));
    setPeersVersion((v) => v + 1);
  };

  const handleMicToggle = () => {
    if (sfuService) {
      if (!micEnabled) {
        sfuService.toggleMic(true);
      } else {
        sfuService.toggleMic(false);
      }
      dispatch(setMicEnabled(!micEnabled));
      setPeersVersion((v) => v + 1);
    }
  };

  const [isLocalScreenShare, setIsLocalScreenShare] = useState(false);
  const [screenShareVisible, setScreenShareVisible] = useState(false);

  const handleScreenShare = () => {
    logger.log("handleScreenShare called");
    if (isScreenSharing && !isLocalScreenShare) {
      return;
    }

    if (!isScreenSharing) {
      try {
        sfuService
          .screenShare()
          .then(() => {
            setIsScreenSharing(true);
            setIsLocalScreenShare(true);

            setTimeout(() => {
              setScreenShareVisible(true);
            }, 50);

            sfuService.off("screenShareStopped");
            sfuService.on("screenShareStopped", () => {
              logger.log("Screen share stopped event received");
              setScreenShareVisible(false);
              setTimeout(() => {
                setIsScreenSharing(false);
                setIsLocalScreenShare(false);
              }, 300);
            });
          })
          .catch((error) => {
            logger.error("Failed to start screen sharing:", error);
            setIsScreenSharing(false);
            setIsLocalScreenShare(false);
            setScreenShareVisible(false);
          });
      } catch (error) {
        logger.error("Error in handleScreenShare:", error);
        setIsScreenSharing(false);
        setIsLocalScreenShare(false);
        setScreenShareVisible(false);
      }
    } else {
      // Start the exit animation
      setScreenShareVisible(false);
      setTimeout(() => {
        try {
          sfuService.stopScreenShare();
          setIsScreenSharing(false);
          setIsLocalScreenShare(false);
        } catch (error) {
          logger.error("Error stopping screen share:", error);

          setIsScreenSharing(false);
          setIsLocalScreenShare(false);
        }
      }, 300);
    }
  };

  const toggleLayoutMenu = () => {
    setIsLayoutMenuOpen(!isLayoutMenuOpen);
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    setIsLayoutMenuOpen(false);
  };

  const renderScreenshare = () => {
    if (!sfuService) return null;

    let videoTrack = null;
    let peerId = null;

    if (sfuService.screenSharing) {
      videoTrack = sfuService.screenSharer.get(
        sfuService.screenSharer.keys().next().value
      )?.track;
      peerId = sfuService.screenSharer.keys().next().value;
    }

    return (
      <div
        className={`screen-share-panel ${screenShareVisible ? "visible" : ""}`}
      >
        <ScreenShareTile key={`screen-${peerId}`} videoTrack={videoTrack} />
      </div>
    );
  };
  const renderPeers = ({ isScreenSharing }) => {
    logger.log("renderPeers called");
    if (!sfuService) return null;

    const regularPeers = [];

    // Iterate through all peers
    sfuService.peers.forEach((peerState, peerId) => {
      // Skip if it's just a flag like "isLocal"
      if (!(peerState instanceof Map)) return;

      let hasScreen = false;
      let videoTrack = null;
      let audioTrack = null;
      const isLocal = peerState.get("isLocal");
      const peerName = peerState.get("peerName");
      const no_of_peerProducers = peerState.size;

      // Check each producer/consumer for this peer
      peerState.forEach((mediaState, key) => {
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
        } else if (mediaState.kind === "audio") {
          if (mediaState.producer?.paused || mediaState.consumer?.paused) {
            logger.log("Audio track is paused");
            audioTrack = null;
          } else {
            audioTrack = mediaState.track;
          }
        }
      });

      // If peer has regular audio/video (not just screen share)
      regularPeers.push(
        <VideoTile
          key={peerId}
          peer={{ name: peerName }}
          audioTrack={audioTrack}
          videoTrack={videoTrack}
          showAvatar={!videoTrack}
          isLocal={isLocal}
        />
      );
    });

    return (
      <>
        <div
          className={`video-grid ${
            isScreenSharing ? "with-screen-share" : ""
          } layout-${layout} ${
            regularPeers.length === 1
              ? "grid-cols-1"
              : regularPeers.length === 2
              ? "grid-cols-2"
              : regularPeers.length === 3
              ? "grid-cols-2" // Force 2 columns for 3 peers
              : regularPeers.length === 4
              ? "grid-cols-2"
              : regularPeers.length <= 6
              ? "grid-cols-3"
              : regularPeers.length <= 9
              ? "grid-cols-3"
              : "grid-cols-4"
          }`}
        >
          {regularPeers}
        </div>
      </>
    );
  };

  return (
    <div className="meeting-container">
      {layout === "grid" && (
        <>
          {isScreenSharing ? (
            <div className="screen-share-container">
              {renderScreenshare()}
              <div className="video-column">
                {renderPeers({ isScreenSharing: true })}
              </div>
            </div>
          ) : (
            renderPeers({ isScreenSharing: false })
          )}
        </>
      )}

      {/* Render join request dialogs */}
      {joinRequests.map((request) => (
        <JoinRequest
          key={request.requestId}
          request={request}
          onClose={() => {
            setJoinRequests((prev) =>
              prev.filter((req) => req.requestId !== request.requestId)
            );
          }}
        />
      ))}

      <div className="controls-overlay">
        <div className="controls-bar">
          <button
            className={`control-btn ${
              micEnabled ? "active" : ""
            } relative group`}
            onClick={handleMicToggle}
            // disabled={isScreenSharing && !isLocalScreenShare}
          >
            <span className="control-icon">
              {micEnabled ? (
                <MicrophoneIcon className="w-6 h-6" />
              ) : (
                <div className="relative">
                  <MicrophoneIcon className="w-6 h-6" />
                  <NoSymbolIcon className="w-6 h-6 text-red-500 absolute top-0 left-0" />
                </div>
              )}
            </span>
            <span
              className="absolute bottom-10 left-1/2 -translate-x-1/2 
                         bg-gray-800 text-white text-xs px-2 py-1 rounded 
                         opacity-0 group-hover:opacity-100 transition"
            >
              {micEnabled ? "Mute" : "Unmute"}
            </span>
          </button>

          <button
            className={`control-btn ${
              cameraEnabled ? "active" : ""
            } relative group`}
            onClick={handleCameraToggle}
            // disabled={isScreenSharing && !isLocalScreenShare}
          >
            <span className="control-icon">
              {cameraEnabled ? (
                <VideoCameraIcon className="w-6 h-6" />
              ) : (
                <div className="relative">
                  <VideoCameraIcon className="w-6 h-6" />
                  <NoSymbolIcon className="w-6 h-6 text-red-500 absolute top-0 left-0" />
                </div>
              )}
            </span>
            <span
              className="absolute bottom-10 left-1/2 -translate-x-1/2 
                         bg-gray-800 text-white text-xs px-2 py-1 rounded 
                         opacity-0 group-hover:opacity-100 transition"
            >
              {cameraEnabled ? "Stop Camera" : "Start Camera"}
            </span>
          </button>

          <button
            className={`control-btn ${
              isScreenSharing && isLocalScreenShare ? "active" : ""
            }`}
            onClick={handleScreenShare}
            disabled={isScreenSharing && !isLocalScreenShare}
          >
            <span className="control-icon">
              {isScreenSharing && isLocalScreenShare ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <TvIcon className="w-6 h-6" />
              )}
            </span>
            <span
              className="absolute bottom-10 left-1/2 -translate-x-1/2 
                         bg-gray-800 text-white text-xs px-2 py-1 rounded 
                         opacity-0 group-hover:opacity-100 transition"
            >
              {isScreenSharing && isLocalScreenShare
                ? "Stop Screen Share"
                : "Start Screen Share"}
            </span>
          </button>

          <div className="layout-selector">
            <button
              className={`control-btn ${
                isLayoutMenuOpen ? "layout-active" : ""
              }`}
              onClick={toggleLayoutMenu}
              ref={layoutButtonRef}
              disabled={isScreenSharing && !isLocalScreenShare}
            >
              <span className="control-icon">
                <Squares2X2Icon className="w-6 h-6" />
              </span>
            </button>
            {isLayoutMenuOpen && (
              <div className="layout-menu" ref={layoutMenuRef}>
                <div
                  className={`layout-option ${
                    layout === "grid" ? "selected" : ""
                  }`}
                  onClick={() => handleLayoutChange("grid")}
                >
                  <span className="layout-icon">
                    <Squares2X2Icon className="w-5 h-5" />
                  </span>
                  <span className="layout-name">Grid</span>
                  {layout === "grid" && <span className="layout-check">✓</span>}
                </div>
                <div
                  className={`layout-option ${
                    layout === "speaker-left" ? "selected" : ""
                  }`}
                  onClick={() => handleLayoutChange("speaker-left")}
                >
                  <span className="layout-icon">
                    <ChevronLeftIcon className="w-5 h-5" />
                  </span>
                  <span className="layout-name">Speaker Left</span>
                  {layout === "speaker-left" && (
                    <span className="layout-check">✓</span>
                  )}
                </div>
                <div
                  className={`layout-option ${
                    layout === "speaker-right" ? "selected" : ""
                  }`}
                  onClick={() => handleLayoutChange("speaker-right")}
                >
                  <span className="layout-icon">
                    <ChevronRightIcon className="w-5 h-5" />
                  </span>
                  <span className="layout-name">Speaker Right</span>
                  {layout === "speaker-right" && (
                    <span className="layout-check">✓</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            className="control-btn"
            disabled={isScreenSharing && !isLocalScreenShare}
          >
            <span className="control-icon">
              <Cog6ToothIcon className="w-6 h-6" />
            </span>
          </button>

          <button className="control-btn end-call" onClick={handleEndCall}>
            <span className="control-icon">
              <PhoneXMarkIcon className="w-6 h-6" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Meeting;
