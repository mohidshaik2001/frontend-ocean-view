import { signalingService } from "./signaling.api.js";
import { EventEmitter } from "eventemitter3";
import * as mediaSoupClient from "mediasoup-client";
import { logger } from "../main.jsx";

export class SFUService extends EventEmitter {
  constructor({
    roomId,
    peerId,
    initialCamera = true,
    initialMic = true,
    peerName,
  }) {
    super();
    this.peers = new Map();
    this.screenSharer = new Map();
    this.sendTransport = null;
    this.recvTransport = null;
    this.device = null;
    this.roomId = roomId;
    this.peerId = peerId;
    this.cameraEnabled = initialCamera;
    this.micEnabled = initialMic;
    this.screenSharing = false;
    this.peerName = peerName;

    this.setSelfPeerId();
  }
  async setSelfPeerId() {
    if (!this.peers.has(this.peerId)) {
      this.peers.set(this.peerId, new Map());
    }
    const selfObj = this.peers.get(this.peerId);
    selfObj.set("isLocal", true);
    logger.logd("self name", this.peerName);
    selfObj.set("peerName", this.peerName);
  }

  async joinRoom() {
    try {
      // 1. STEP 1: Initialize connection and load RTP capabilities
      logger.logd("peer name in joinRoom", this.peerName);
      const joinRes = await signalingService.sendRequest("join", {
        roomId: this.roomId,
        peerId: this.peerId,
        peerName: this.peerName,
      });
      const routerRtpCapabilities = joinRes.routerRtpCapabilities;

      // create device
      this.device = new mediaSoupClient.Device();
      await this.device.load({ routerRtpCapabilities });

      // Set RTP capabilities
      await signalingService.sendRequest("setRtpCapabilities", {
        roomId: this.roomId,
        peerId: this.peerId,
        rtpCapabilities: this.device.rtpCapabilities,
      });

      // 2. STEP 2: Create and set up receive transport FIRST
      logger.log("Setting up receive transport...");
      await this.setupReceiveTransport();

      // 3. STEP 3: Consume existing producers in the room
      logger.log("Consuming existing streams...");
      await this.consumeExistingProducers();

      // 4. STEP 4: Set up send transport and produce local media
      logger.log("Setting up send transport...");
      await this.setupSendTransport();

      // 5. STEP 5: Set up event listeners for new producers, peers joining/leaving
      this.setupEventListeners();

      logger.log("Room join complete");
    } catch (error) {
      logger.logd("joinRoom error", error.stack);
      throw error; // Re-throw to allow caller to handle the error
    }
  }

  async setupReceiveTransport() {
    // Create receive transport
    const recvParamsResponse = await signalingService.sendRequest(
      "createTransport",
      {
        roomId: this.roomId,
        peerId: this.peerId,
        direction: "recv",
      }
    );

    // Extract the transport parameters from the response
    const recvParams = recvParamsResponse.transportParams;
    if (!recvParams || !recvParams.id) {
      throw new Error(
        "Invalid receive transport parameters received from server"
      );
    }

    this.recvTransport = this.device.createRecvTransport({
      ...recvParams,
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: ["turns:oceanview.sfu.primedevs.online:5349"],
          username: "turnuser",
          credential: "turnpassword",
        },
      ],
    });

    // Handle receive transport connect
    this.recvTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await signalingService.sendRequest("connectTransport", {
            roomId: this.roomId,
            peerId: this.peerId,
            transportId: recvParams.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          logger.logd("Receive transport connect error", error);
          errback(error);
        }
      }
    );
  }

  async consumeExistingProducers() {
    try {
      const { producers, peers } = await signalingService.sendRequest(
        "listProducers",
        {
          roomId: this.roomId,
          peerId: this.peerId,
        }
      );

      // Log the complete response to debug
      logger.logd("Producers response", { producers, peers });

      // Check if we have producers in the response
      if (producers && Array.isArray(producers) && producers.length > 0) {
        logger.logd("Found existing producers", { count: producers.length });

        // First, set up all peer entries in our map
        for (const producer of producers) {
          // Create a map entry for each unique peer if it doesn't exist
          if (producer.peerId && !this.peers.has(producer.peerId)) {
            this.peers.set(producer.peerId, new Map());
            this.peers.get(producer.peerId).set("peerName", producer.peerName);
            this.peers.get(producer.peerId).set("isLocal", false);
            logger.log(`Added peer ${producer.peerId} to peers map`);
          }
        }

        // Then consume all producers in sequence
        for (const producer of producers) {
          if (producer.producerId) {
            logger.logd("Consuming producer", {
              producerId: producer.producerId,
              peerId: producer.peerId,
              kind: producer.kind,
            });
            await this.consumeOne(producer.producerId);
          }
        }
      } else {
        logger.log("No existing producers to consume");
      }
      if (peers && Array.isArray(peers) && peers.length > 0) {
        logger.logd("Found existing peers", { count: peers.length });
        for (const peer of peers) {
          await this.newJoiner({
            peerId: peer.peerId,
            peerName: peer.peerName,
          });
        }
      } else {
        logger.log("No existing peers to consume");
      }
    } catch (error) {
      logger.logd("Error consuming existing producers", error);
    }
  }

  async setupSendTransport() {
    // Create send transport
    const sendParamsResponse = await signalingService.sendRequest(
      "createTransport",
      {
        roomId: this.roomId,
        peerId: this.peerId,
        direction: "send",
      }
    );

    // Extract the transport parameters from the response
    const sendParams = sendParamsResponse.transportParams;
    if (!sendParams || !sendParams.id) {
      throw new Error("Invalid transport parameters received from server");
    }

    this.sendTransport = this.device.createSendTransport({
      ...sendParams,
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: ["turns:oceanview.sfu.primedevs.online:5349"],
          username: "turnuser",
          credential: "turnpassword",
        },
      ],
    });

    this.sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await signalingService.sendRequest("connectTransport", {
            roomId: this.roomId,
            peerId: this.peerId,
            transportId: sendParams.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          logger.logd("Send transport connect error", error);
          errback(error);
        }
      }
    );

    this.sendTransport.on(
      "produce",
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        logger.logd("produce", {
          kind,
          appData,
        });
        try {
          // Tell the SFU to create a producer
          const res = await signalingService.sendRequest("produce", {
            roomId: this.roomId,
            peerId: this.peerId,
            transportId: sendParams.id,
            kind,
            rtpParameters,
            appData,
          });

          // This callback is crucial - it tells MediaSoup what producer ID to use
          callback({ id: res.producerId });
        } catch (error) {
          logger.logd("Failed to create producer:", error);
          errback(error);
        }
      }
    );
  }

  async produceLocalMedia() {
    logger.log("Starting to produce local media");
    try {
      // This will be called after we've already joined the room and consumed existing streams
      if (!this.sendTransport) {
        logger.log("Send transport not set up yet, setting up now");
        await this.setupSendTransport();
      }

      // Now produce local media
      return await this.userMediaDevices();
    } catch (error) {
      logger.logd("Failed to produce local media", error);
      throw error;
    }
  }

  setupEventListeners() {
    // Handle new producer from signaling server
    signalingService.on("event:newProducer", ({ producerId, peerId }) => {
      if (peerId == this.peerId) return;

      // Make sure the peer exists in our peers map before consuming
      if (!this.peers.has(peerId)) {
        this.newJoiner(peerId);
      }

      this.consumeNewProducer(producerId);
    });

    // Handle new joiner from signaling server
    signalingService.on("event:peerJoined", ({ peerId, peerName }) => {
      this.newJoiner({ peerId, peerName });
    });

    // Handle peer left from signaling server
    signalingService.on("event:peerLeft", ({ peerId }) => {
      this.peerLeft(peerId);
    });
    // Handle producer paused from signaling server
    signalingService.on("event:producerPaused", ({ peerId, producerId }) => {
      logger.logd("Received producerPaused event", { peerId, producerId });
      this.pauseConsumer({ peerId, producerId });
    });

    // Handle producer resumed from signaling server
    signalingService.on("event:producerResumed", ({ peerId, producerId }) => {
      logger.logd("Received producerResumed event", { peerId, producerId });
      this.resumeConsumer({ peerId, producerId });
    });

    // Handle producer closed from signaling server
    signalingService.on(
      "event:producerClosed",
      ({ peerId, roomId, producerId, kind, source }) => {
        logger.logd("Received producerClosed event", {
          peerId,
          producerId,
          kind,
          source,
        });
        this.closeProducer({ producerId, peerId, kind, source });
      }
    );
  }

  async close() {
    if (this.sendTransport) {
      this.sendTransport.close();
    }
    if (this.recvTransport) {
      this.recvTransport.close();
    }

    this.peers.clear();
    logger.log("SFU service closed");
  }

  async peerLeft(peerId) {
    if (this.peers.has(peerId)) {
      this.peers.delete(peerId);
      this.emit("peerLeft", { peerId });
    }
  }

  async closeProducer({ producerId, peerId, kind, source }) {
    logger.logd("Closing producer/consumer", {
      producerId,
      peerId,
      kind,
      source,
    });

    // Handle screen sharing producers specifically
    if (source === "screen") {
      logger.logd("Handling screen share producer closure", {
        producerId,
        peerId,
      });

      // If it's our own screen share
      if (peerId === this.peerId) {
        // We're the producer, clean up our side
        for (const [id, mediaState] of this.screenSharer.entries()) {
          if (mediaState.producer && mediaState.producer.id === producerId) {
            if (mediaState.track) {
              mediaState.track.stop();
            }
            this.screenSharer.delete(id);
          }
        }
        this.screenSharer.clear();
        this.screenSharing = false;
        this.emit("screenShareStopped");
      }
      // It's someone else's screen share
      else {
        // We're the consumer, clean up our side
        for (const [id, mediaState] of this.screenSharer.entries()) {
          if (
            mediaState.consumer &&
            mediaState.consumer.producerId === producerId
          ) {
            if (mediaState.consumer) {
              mediaState.consumer.close();
            }
            this.screenSharer.delete(id);
          }
        }
        this.screenSharer.clear();
        this.screenSharing = false;
        this.emit("screenShareStopped");
      }

      return;
    }

    // Handle regular audio/video producers
    if (peerId === this.peerId) {
      // We're the producer
      const selfPeer = this.peers.get(this.peerId);
      if (selfPeer?.has(producerId)) {
        const mediaState = selfPeer.get(producerId);

        // Clean up and remove
        if (mediaState.track) {
          mediaState.track.stop();
        }
        if (mediaState.producer) {
          mediaState.producer.close();
        }

        selfPeer.delete(producerId);

        this.emit("producerClosed", {
          peerId: this.peerId,
          producerId,
          kind: mediaState.kind,
          source: mediaState.source,
        });
      }
    } else {
      // We're the consumer
      if (this.peers.has(peerId)) {
        const remotePeer = this.peers.get(peerId);

        // Find and close all consumers related to this producer
        for (const [consumerId, mediaState] of remotePeer.entries()) {
          if (
            mediaState.consumer &&
            mediaState.consumer.producerId === producerId
          ) {
            logger.logd("Closing consumer for closed producer", {
              consumerId,
              producerId,
            });

            if (mediaState.consumer) {
              mediaState.consumer.close();
            }

            remotePeer.delete(consumerId);

            this.emit("producerClosed", {
              peerId,
              producerId,
              kind: mediaState.kind || kind,
              source: mediaState.source || source || "unknown",
            });
          }
        }
      }
    }
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
          try {
            logger.log("Starting video producer creation");
            // produce() will trigger our "produce" event handler
            // and wait for the callback to be called with the ID
            const videoProducer = await this.sendTransport.produce({
              track: videoTrack,
              appData: { mediaType: "video", source: "camera" },
            });
            logger.logd("Video producer created:", videoProducer.id);

            // Store the producer in peers map
            const selfPeer = this.peers.get(this.peerId);
            selfPeer.set(videoProducer.id, {
              producer: videoProducer,
              kind: "video",
              track: videoTrack,
              source: "camera",
            });

            // Listen for producer closure
          } catch (error) {
            console.error("Failed to produce video:", error);
            videoTrack.stop(); // Clean up the track if produce fails
            throw error;
          }
        }
      }

      if (this.micEnabled) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          try {
            logger.log("Starting audio producer creation");
            const audioProducer = await this.sendTransport.produce({
              track: audioTrack,
              appData: { mediaType: "audio" },
            });
            logger.logd("Audio producer created:", audioProducer.id);

            // Store the producer in peers map
            const selfPeer = this.peers.get(this.peerId);
            selfPeer.set(audioProducer.id, {
              producer: audioProducer,
              kind: "audio",
              track: audioTrack,
              source: "microphone",
            });

            // Listen for producer closure
          } catch (error) {
            console.error("Failed to produce audio:", error);
            audioTrack.stop(); // Clean up the track if produce fails
            throw error;
          }
        }
      }
    }

    return stream;
  }

  async consumeOne(producerId) {
    try {
      logger.logd("Requesting to create consumer for producer", { producerId });

      const response = await signalingService.sendRequest("createConsumer", {
        roomId: this.roomId,
        peerId: this.peerId,
        producerId,
      });

      logger.logd("Create consumer response", response);

      // The consumer data might be directly in the response or in response.data
      // depending on how signaling server sends it
      const consumerFromServer = response.data || response;

      if (!consumerFromServer || consumerFromServer.error) {
        logger.logd("Consumer error", {
          error: consumerFromServer?.error || "Invalid consumer data",
          producerId,
        });
        return;
      }

      // Ensure we have the producer's peer ID
      if (!consumerFromServer.producerPeerId) {
        logger.logd(
          "Error creating consumer: Missing producerPeerId in response",
          consumerFromServer
        );
        return;
      }

      // Log what we're about to consume
      logger.logd("Consuming producer", {
        id: consumerFromServer.id,
        producerId: consumerFromServer.producerId,
        kind: consumerFromServer.kind,
        fromPeerId: consumerFromServer.producerPeerId,
      });

      // Create the consumer with the parameters from the server
      const consumer = await this.recvTransport.consume({
        id: consumerFromServer.id,
        producerId: consumerFromServer.producerId,
        kind: consumerFromServer.kind,
        rtpParameters: consumerFromServer.rtpParameters,
      });
      logger.logd("Consumer created", {
        consumerId: consumer.id,
        producerId: consumer.producerId,
      });

      // Make sure we have a place to store this consumer
      if (!this.peers.has(consumerFromServer.producerPeerId)) {
        logger.logd("Creating peer map entry for producer peer", {
          peerId: consumerFromServer.producerPeerId,
        });
        this.peers.set(consumerFromServer.producerPeerId, new Map());
        this.peers.get(consumerFromServer.producerPeerId).set("isLocal", false);
      }

      // Determine the source of the stream
      const source =
        consumerFromServer.appData?.source ||
        consumerFromServer.source ||
        "camera"; // Default to camera if not specified
      logger.logd("Consumer source", { source });
      // Add track to peers
      const peer = this.peers.get(consumerFromServer.producerPeerId);
      if (peer && source !== "screen") {
        peer.set(consumer.id, {
          consumer,
          kind: consumerFromServer.kind,
          source: source,
          track: consumer.track,
        });

        // Emit an event so UI can handle different sources differently
        this.emit("newConsumer", {
          peerId: consumerFromServer.producerPeerId,
          consumerId: consumer.id,
          kind: consumerFromServer.kind,
          source: source,
        });

        logger.logd("Consumer created successfully", {
          consumerId: consumer.id,
          producerId: consumerFromServer.producerId,
          peerId: consumerFromServer.producerPeerId,
        });
      } else if (peer && source === "screen") {
        this.screenSharing = true;

        this.screenSharer.set(consumer.id, {
          consumer,
          kind: consumerFromServer.kind,
          source: source,
          track: consumer.track,
        });
        this.emit("newConsumer", {
          peerId: consumerFromServer.producerPeerId,
          consumerId: consumer.id,
          kind: consumerFromServer.kind,
          source: source,
        });
      }
    } catch (error) {
      logger.logd("Error creating consumer", error);
    }
  }

  async consumeNewProducer(producerId) {
    logger.log(`Consuming new producer ${producerId}`);
    await this.consumeOne(producerId);
  }
  async screenShare() {
    try {
      if (!this.screenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        const videoTrack = stream.getVideoTracks()[0];
        const screenProducer = await this.sendTransport.produce({
          track: videoTrack,
          appData: { mediaType: "video", source: "screen" },
        });

        logger.logd("Screen share producer created:", screenProducer.id);
        // Store the producer in peers map
        this.screenSharing = true;
        this.screenSharer.set(screenProducer.id, {
          producer: screenProducer,
          kind: "video",
          track: videoTrack,
          source: "screen",
        });

        // Handle screen share stop
        videoTrack.onended = () => {
          logger.logd("Screen share stopped");
          screenProducer.close();
          this.screenSharing = false;
          this.screenSharer.clear(); // Use clear() instead of setting to null
          this.emit("screenShareStopped");
        };
      }
    } catch (error) {
      console.error("Failed to produce screen share:", error);
      // Don't reference videoTrack here as it might not be defined
      this.screenSharing = false;
      throw error;
    }
  }

  async stopScreenShare() {
    try {
      // First check if we have screen share tracks in the screenSharer map
      if (this.screenSharer.size > 0) {
        for (const [id, mediaState] of this.screenSharer.entries()) {
          if (mediaState.track) {
            mediaState.track.stop();
          }
          if (mediaState.producer) {
            // First, notify the signaling server that we're closing this producer
            if (mediaState.producer.id) {
              try {
                await signalingService.sendRequest("closeProducer", {
                  roomId: this.roomId,
                  peerId: this.peerId,
                  producerId: mediaState.producer.id,
                });
                logger.logd("Sent closeProducer request to signaling server");
              } catch (error) {
                logger.error("Failed to send closeProducer request:", error);
              }
            }

            // Then close the producer locally
            mediaState.producer.close();
            logger.logd(
              "Screen share producer closed:",
              mediaState.producer.id
            );
          }
        }
        this.screenSharer.clear();
      }

      // Also check the peers map for any screen share tracks
      const selfPeer = this.peers.get(this.peerId);
      if (selfPeer) {
        for (const [producerId, mediaState] of selfPeer.entries()) {
          if (mediaState.kind === "video" && mediaState.source === "screen") {
            if (mediaState.track) {
              mediaState.track.stop();
            }
            if (mediaState.producer) {
              // First, notify the signaling server that we're closing this producer
              try {
                await signalingService.sendRequest("closeProducer", {
                  roomId: this.roomId,
                  peerId: this.peerId,
                  producerId: producerId,
                });
                logger.logd("Sent closeProducer request to signaling server");
              } catch (error) {
                logger.error("Failed to send closeProducer request:", error);
              }

              // Then close the producer locally
              mediaState.producer.close();
            }
            selfPeer.delete(producerId);
          }
        }
      }

      this.screenSharing = false;
    } catch (error) {
      console.error("Error stopping screen share:", error);
      // Even if there's an error, mark screen sharing as stopped
      this.screenSharing = false;
    }
  }
  async newJoiner({ peerId, peerName }) {
    // Only create a new entry if one doesn't already exist
    if (!this.peers.has(peerId)) {
      logger.log(`New joiner ${peerId} added to peers map`);
      this.peers.set(peerId, new Map());
      const joiner = this.peers.get(peerId);
      joiner.set("isLocal", false);
      logger.logd("New joiner", { peerId, peerName });
      joiner.set("peerName", peerName);
      this.emit("peerJoined", { peerId });
    }
  }

  async toggleMic(value) {
    const selfPeer = this.peers.get(this.peerId);
    let producer = null;
    for (const [producerId, mediaState] of selfPeer.entries()) {
      if (mediaState.kind === "audio") {
        producer = mediaState.producer;
      }
    }
    if (value) {
      try {
        if (producer) {
          if (producer.paused) {
            producer.resume();

            this.micEnabled = true;
            this.emit("producerResumed");
            await signalingService.sendRequest("resumeProducer", {
              roomId: this.roomId,
              peerId: this.peerId,
              producerId: producer.id,
            });
            return;
          }
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const audioTrack = stream.getAudioTracks()[0];

          const audioProducer = await this.sendTransport.produce({
            track: audioTrack,
            appData: { mediaType: "audio" },
          });
          selfPeer.set(audioProducer.id, {
            producer: audioProducer,
            kind: "audio",
            track: audioTrack,
            source: "microphone",
          });
          this.micEnabled = true;
          return;
        }
      } catch (error) {
        logger.log("Error toggling mic");
      }
    } else {
      try {
        if (producer) {
          if (!producer.paused) {
            producer.pause();
            this.micEnabled = false;
            this.emit("producerPaused");
            await signalingService.sendRequest("pauseProducer", {
              roomId: this.roomId,
              peerId: this.peerId,
              producerId: producer.id,
            });
            return;
          }
        }
      } catch (error) {}
    }
  }

  async toggleCamera(value) {
    const selfPeer = this.peers.get(this.peerId);
    let producer = null;
    for (const [producerId, mediaState] of selfPeer.entries()) {
      if (mediaState.kind === "video") {
        producer = mediaState.producer;
      }
    }
    if (value) {
      try {
        if (producer) {
          if (producer.paused) {
            producer.resume();
            logger.log("resuming video producer");
            this.cameraEnabled = true;
            this.emit("producerResumed");
            const response = await signalingService.sendRequest(
              "resumeProducer",
              {
                roomId: this.roomId,
                peerId: this.peerId,
                producerId: producer.id,
              }
            );

            return;
          }
        } else {
          logger.log("no camera found");
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          const videoTrack = stream.getVideoTracks()[0];
          logger.log("starting video producer");
          const videoProducer = await this.sendTransport.produce({
            track: videoTrack,
            appData: { mediaType: "video", source: "camera" },
          });
          selfPeer.set(videoProducer.id, {
            producer: videoProducer,
            kind: "video",
            track: videoTrack,
            source: "camera",
          });
          logger.logd("Video producer created:", videoProducer.id);
          this.cameraEnabled = true;
          return;
        }
      } catch (error) {
        logger.logd("Error toggling camera:", error);
      }
    } else {
      try {
        if (producer) {
          if (!producer.paused) {
            producer.pause();
            this.cameraEnabled = false;
            this.emit("producerPaused");
            const response = await signalingService.sendRequest(
              "pauseProducer",
              {
                roomId: this.roomId,
                peerId: this.peerId,
                producerId: producer.id,
              }
            );
            logger.log("pausing video producer");

            return;
          }
        }
      } catch (error) {}
    }
  }

  async pauseConsumer({ peerId, producerId }) {
    try {
      const peer = this.peers.get(peerId);
      logger.log("101");
      let mediaState = null;
      logger.log("102");
      if (!peer) {
        logger.log("105");
        return;
      }
      for (const state of peer.values()) {
        if (
          state &&
          state.consumer &&
          state.consumer.producerId === producerId
        ) {
          logger.log("103");
          mediaState = state;
          break;
        }
      }
      if (mediaState === null) {
        logger.log("104");
        return;
      }
      const consumer = mediaState.consumer;
      consumer.pause();
      this.emit("consumerPaused", { peerId, consumerId: consumer.id });
    } catch (error) {
      logger.logd("Error pausing consumer:", error);
    }
  }

  async resumeConsumer({ peerId, producerId }) {
    try {
      const peer = this.peers.get(peerId);
      let mediaState = null;
      for (const state of peer.values()) {
        if (
          state &&
          state.consumer &&
          state.consumer.producerId === producerId
        ) {
          logger.log("103");
          mediaState = state;
          break;
        }
      }
      if (!mediaState) {
        await this.consumeOne(producerId);
        return;
      }
      const consumer = mediaState.consumer;
      consumer.resume();
      this.emit("consumerResumed", { peerId, consumerId: consumer.id });
    } catch (error) {
      logger.logd("Error resuming consumer:", error);
    }
  }
}

let sfuInstance = null;

export const configureSFU = ({
  roomId,
  peerId,
  initialCamera = true,
  initialMic = true,
  peerName,
}) => {
  if (!sfuInstance) {
    sfuInstance = new SFUService({
      roomId,
      peerId,
      initialCamera,
      initialMic,
      peerName,
    });
    logger.log("SFU service configured");
  }
  return sfuInstance;
};

export const getSFUInstance = () => {
  if (!sfuInstance) {
    throw new Error("SFU service not configured. Call configureSFU first.");
  }
  return sfuInstance;
};

export const resetSFU = () => {
  sfuInstance = null;
};
