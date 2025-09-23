import React from "react";
import { signalingService } from "../api/signaling.api";
import { logger } from "../main";
import "./JoinRequest.css";

function JoinRequest({ request, onClose }) {
  const { callerDetails, requestId, roomId } = request;

  const handleAccept = async () => {
    try {
      // Get the current peer ID from local storage or some other source
      const acceptingPeerId = localStorage.getItem("peerId") || "unknown-peer";

      const success = await signalingService.acceptJoinRequest({
        roomId,
        requestId,
        acceptingPeerId,
      });

      if (success) {
        logger.log(`Join request ${requestId} accepted`);
      } else {
        logger.logd(`Failed to accept join request ${requestId}`);
      }

      onClose();
    } catch (error) {
      logger.logd("Error accepting join request", error);
      onClose();
    }
  };

  const handleReject = async () => {
    try {
      // Get the current peer ID
      const rejectingPeerId = localStorage.getItem("peerId") || "unknown-peer";

      const success = await signalingService.rejectJoinRequest({
        roomId,
        requestId,
        rejectingPeerId,
      });

      if (success) {
        logger.log(`Join request ${requestId} rejected`);
      } else {
        logger.logd(`Failed to reject join request ${requestId}`);
      }

      onClose();
    } catch (error) {
      logger.logd("Error rejecting join request", error);
      onClose();
    }
  };

  return (
    <div className="join-request-overlay">
      <div className="join-request-modal">
        <div className="join-request-header">
          <h3>Join Request</h3>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="join-request-content">
          <p>
            <strong>{callerDetails?.name || "Someone"}</strong> wants to join
            the meeting.
          </p>
          {callerDetails?.email && (
            <p className="caller-email">Email: {callerDetails.email}</p>
          )}
        </div>
        <div className="join-request-actions">
          <button className="reject-button" onClick={handleReject}>
            Decline
          </button>
          <button className="accept-button" onClick={handleAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default JoinRequest;
