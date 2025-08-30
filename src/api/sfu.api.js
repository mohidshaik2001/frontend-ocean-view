import { signalingService } from "./signaling.api.js";

import { EventEmitter } from "eventemitter3";
import { useSelector } from "react-redux";
import * as mediaSoupClient from "mediasoup-client";

const roomId = useSelector((state) => state.call.roomId);
const userData = useSelector((state) => state.auth.userData);
const peerId = userData._id;
export class SFUService extends EventEmitter {
  constructor({ roomId, peerId, initialCamera = true, initialMic = true }) {
    super();
    this.participants = new Map();
    this.sendTransport = null;
    this.recvTransport = null;
    this.device = null;
    this.roomId = roomId;
    this.peerId = peerId;
    this.cameraEnabled = initialCamera;
    this.micEnabled = initialMic;
  }

  async joinRoom() {
    // send join request
    const joinRes = await signalingService.sendRequest("join", {
      roomId: this.roomId,
      peerId: this.peerId,
    });
    const routerRtpCapabilities = joinRes.routerRtpCapabilities;
    // create device
    this.device = new mediaSoupClient.Device();
    await this.device.load({ routerRtpCapabilities });

    await signalingService.sendRequest("setRtcCapabilities", {
      roomId: this.roomId,
      peerId: this.peerId,
      rtcCapabilities: this.device.rtpCapabilities,
    });
    // create send transport
    const sendParams = await signalingService.sendRequest("createTransport", {
      roomId: this.roomId,
      peerId: this.peerId,
      direction: "send",
    });
    this.sendTransport = this.device.createSendTransport(sendParams);

    this.sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        await signalingService
          .sendRequest("connectTransport", {
            roomId: this.roomId,
            peerId: this.peerId,
            transportId: sendParams.id,
            dtlsParameters,
          })
          .then(callback)
          .catch(errback);
      }
    );
    this.sendTransport.on(
      "produce",
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const res = await signalingService.sendRequest("produce", {
            roomId: this.roomId,
            peerId: this.peerId,
            transportId: sendParams.id,
            kind,
            rtpParameters,
            appData,
          });
          callback({
            id: res.producerId,
          });
        } catch (error) {
          errback(error);
        }
      }
    );

    //get media devices and attach to send transport

    // create recv transport
    const recvParams = await signalingService.sendRequest("createTransport", {
      roomId: this.roomId,
      peerId: this.peerId,
      direction: "recv",
    });
    this.recvTransport = this.device.createRecvTransport(recvParams);
    // handle recv transport connect
    this.recvTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        await signalingService
          .sendRequest("connectTransport", {
            roomId: this.roomId,
            peerId: this.peerId,
            transportId: recvParams.id,
            dtlsParameters,
          })
          .then(callback)
          .catch(errback);
      }
    );

    //handle recv transport cosume

    // 1.handle consume when joined first time
    const producers = await signalingService.sendRequest("listProducers", {
      roomId: this.roomId,
      peerId: this.peerId,
    });
    if (producers) {
      for (const producer of producers) {
        await this.consumeOne(producer.id);
      }
    }

    //2.hanlde newproducer from signalling server
    signalingService.on("newProducer", ({ producerId }) => {
      this.consumeNewProducer(producerId);
    });

    //hanlde newjoiner from signalling server
    signalingService.on("newJoiner", ({ peerId }) => {
      this.newJoiner(peerId);
    });
  }

  async userMediaDevices() {
    if (!this.cameraEnabled && !this.micEnabled) {
      return null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: this.micEnabled,
      video: this.cameraEnabled,
    });

    // Store the tracks for later use
    if (stream) {
      if (this.cameraEnabled) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          // Produce the video track
          await this.sendTransport.produce({
            track: videoTrack,
            appData: { mediaType: "video" },
          });
        }
      }

      if (this.micEnabled) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          // Produce the audio track
          await this.sendTransport.produce({
            track: audioTrack,
            appData: { mediaType: "audio" },
          });
        }
      }
    }

    return stream;
  }

  async consumeOne(producerId) {
    try {
      const consumerFromServer = await signalingService.sendRequest(
        "createConsumer",
        {
          roomId: this.roomId,
          peerId: this.peerId,
          producerId,
        }
      );

      if (consumerFromServer.error) {
        console.warn("consumer error", consumerFromServer.error);
      }

      //handle cosume in client recvtrasport
      const consumer = await this.recvTransport.consume({
        id: consumerFromServer.id,
        producerId: consumerFromServer.producerId,
        kind: consumerFromServer.kind,
        rtpParameters: consumerFromServer.rtpParameters,
      });
      // add track to participants

      const participant = this.participants.get(
        consumerFromServer.producerPeerId
      );
      if (participant) {
        participant.set(consumer.id, consumer);
      }
    } catch (error) {
      console.log("consumer error", error);
    }
  }

  async consumeNewProducer(producerId) {
    await this.consumeOne(producerId);
  }
  async screenShare() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
  }
  async newJoiner(peerId) {
    const participant = new Map();
    this.participants.set(peerId, participant);
  }
}
