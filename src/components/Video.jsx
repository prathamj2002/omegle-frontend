import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "../styles.css";

const socket = io("https://omegle-backend-sq4d.onrender.com", { transports: ["websocket"], secure: true });

const Video = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const [partnerId, setPartnerId] = useState(null);

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

        return () => {
            socket.off("connect");
            socket.off("match_found");
        };
    }, []);

    const startCall = async (partner) => {
        console.log(`📞 Starting call with ${partner}`);
        peerConnection.current = await createPeerConnection(partner);

        if (!peerConnection.current) return;

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
        console.log(`🔗 Fetching ICE Servers from backend`);

        let iceServers = [];

        try {
            const response = await fetch("https://omegle-backend-sq4d.onrender.com/getIceServers");
            const data = await response.json();
            if (Array.isArray(data)) {
                iceServers = data;
            } else {
                console.error("⚠️ Invalid ICE Server response:", data);
                return null;
            }

            console.log("✅ ICE Servers:", iceServers);
        } catch (error) {
            console.error("🚨 Failed to fetch ICE Servers:", error);
            return null;
        }

        const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "relay" });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("📤 Sending ICE Candidate:", event.candidate);
                socket.emit("ice-candidate", { candidate: event.candidate, target: partner });
            }
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
