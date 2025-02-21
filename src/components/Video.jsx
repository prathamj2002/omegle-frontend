import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "../styles.css";

const socket = io("https://omegle-backend-sq4d.onrender.com", { transports: ["websocket"], secure: true });

const Video = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const [partnerId, setPartnerId] = useState(null);

    // Attach peerConnection to window for debugging
    window.peerConnection = peerConnection;

    useEffect(() => {
        console.log("🔗 Connecting to WebSocket...");

        socket.on("connect", () => {
            console.log("✅ WebSocket Connected:", socket.id);
        });

        socket.emit("find_match");

        socket.on("match_found", async (partner) => {
            console.log(`✅ Matched with ${partner}`);
            setPartnerId(partner);
            await startCall(partner);
        });

        socket.on("offer", async ({ sdp, sender }) => {
            console.log(`📩 Offer received from ${sender}`);
            peerConnection.current = await createPeerConnection(sender);
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("answer", { sdp: answer, target: sender });
        });

        socket.on("answer", async ({ sdp }) => {
            console.log(`📩 Answer received`);
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on("ice-candidate", ({ candidate }) => {
            console.log(`📩 ICE Candidate received`);
            peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on("disconnect", () => {
            console.log("❌ WebSocket Disconnected");
        });

        return () => {
            socket.off("connect");
            socket.off("match_found");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("disconnect");
        };
    }, []);

    const startCall = async (partner) => {
        console.log(`📞 Starting call with ${partner}`);
        peerConnection.current = await createPeerConnection(partner);

        if (!peerConnection.current) {
            console.error("❌ Failed to create PeerConnection!");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideoRef.current.srcObject = stream;
            stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

            console.log("📤 Sending offer...");
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            socket.emit("offer", { sdp: offer, target: partner });
        } catch (error) {
            console.error("🚨 Error accessing media devices:", error);
        }
    };

    const createPeerConnection = async (partner) => {
        console.log(`🔗 Fetching Xirsys ICE Servers for ${partner}`);

        let iceServers = [];

        try {
            const response = await fetch("https://global.xirsys.net/_turn/MyFirstApp", {
                method: "PUT",
                headers: {
                    "Authorization": "Basic " + btoa("prathamlakhani:07a7695a-f0a6-11ef-8d7c-0242ac150003"),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ format: "urls" }) // Force Xirsys to return only URLs
            });

            const iceData = await response.json();
            iceServers = iceData?.v?.iceServers || [];

            if (iceServers.length === 0) {
                console.error("⚠️ Xirsys did not return any ICE servers. Check API credentials or Xirsys status.");
                return null;
            }

            console.log("✅ Xirsys ICE Servers:", iceServers);

        } catch (error) {
            console.error("🚨 Xirsys API Request Failed:", error);
            return null;
        }

        const pc = new RTCPeerConnection({
            iceServers: iceServers,
            iceTransportPolicy: "relay" // Forces TURN usage
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("📤 Sending ICE Candidate:", event.candidate);
                socket.emit("ice-candidate", { candidate: event.candidate, target: partner });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`🔄 ICE Connection State: ${pc.iceConnectionState}`);
        };

        pc.ontrack = (event) => {
            console.log("📡 Received track");
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        return pc;
    };

    return (
        <div className="video-container">
            <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
            <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
        </div>
    );
};

export default Video;
