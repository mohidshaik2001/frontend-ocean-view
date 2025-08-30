import wsService from "./wsService.js";
import { startCall } from "../store/callSlice.js";
import { logger } from "../main.jsx"; // Make sure this path is correct and logger exists

class WebRTCService {
  constructor() {
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.loccalScreenStream = null;
    this.remoteScreenStream = null;
    this.onRemoteStreamChange = null;
    this.onRemoteScreenStreamChange = null;
  }

  async startCall() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    logger.log("peer connection established");
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsService.send("candidate", e.candidate);
      }
    };
    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream);
    });
    this.pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!this.remoteStream) {
        this.remoteStream = stream;
        if (this.onRemoteStreamChange) {
          this.onRemoteStreamChange(this.remoteStream);
        }
      }
    };

    wsService.on("offer", (payload) => this.handleOffer(payload));
    wsService.on("answer", (payload) => this.handleAnswer(payload));
    wsService.on("candidate", (payload) => this.handleCandidate(payload));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    wsService.send("offer", offer);
  }
  async shareScreen() {
    this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    if (this.pc) {
      this.localScreenStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localScreenStream);
      });
    }
  }

  isPeerConnected() {
    return (
      this.remoteStream &&
      this.remoteStream.getTracks().some((t) => t.readyState === "live")
    );
  }

  async stopCall() {
    this.pc.close();
    this.localStream.getTracks().forEach((track) => track.stop());
    this.remoteStream.getTracks().forEach((track) => track.stop());
    logger.log("peer connection closed");
    wsService.removeAllListeners();
  }
  async handleOffer(offer) {
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    wsService.send("answer", answer);
  }

  async handleAnswer(answer) {
    await this.pc.setRemoteDescription(answer);
  }

  async handleCandidate(candidate) {
    await this.pc.addIceCandidate(candidate);
  }
  async getStreams() {
    return {
      localStream: this.localStream,
      remoteStream: this.remoteStream,
    };
  }
}

export default new WebRTCService();
