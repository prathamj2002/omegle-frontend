import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "../styles.css";

// ✅ Ensure WebSocket is created only once
let socket;
if (!window.socket) {
    window.socket = io("https://omegle-backend-sq4d.onrender.com", { transports: ["websocket"], secure: true });
}
socket = window.socket;

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

        socket.on("offer", async ({ sdp, sender }) => {
            console.log(`📩 Offer received from ${sender}`);
            peerConnection.current = await createPeerConnection(sender);
            if (!peerConnection.current) return;
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("answer", { sdp: answer, target: sender });
        });

        socket.on("answer", async ({ sdp }) => {
            console.log(`📩 Answer received`);
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        });

        socket.on("ice-candidate", ({ candidate }) => {
            console.log(`📩 ICE Candidate received`);
            if (peerConnection.current) {
                peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        socket.on("disconnect", () => {
            console.log("❌ WebSocket Disconnected");
        });

        return () => {
            console.log("❌ Cleaning up WebSocket...");
            if (socket) {
                socket.disconnect();
            }
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

    const fetchIceServers = async () => {
        console.log("🔗 Fetching ICE Servers from backend");

        try {
            const response = await fetch("https://omegle-backend-sq4d.onrender.com/getIceServers");
            const iceServers = await response.json();

            if (Array.isArray(iceServers)) {
                console.log("✅ ICE Servers:", iceServers);
                return iceServers;
            } else {
                console.error("⚠️ Invalid ICE Server response:", iceServers);
                return [];
            }
        } catch (error) {
            console.error("🚨 Failed to fetch ICE Servers:", error);
            return [];
        }
    };

    const createPeerConnection = async (partner) => {
        console.log(`🔗 Fetching ICE Servers for ${partner}`);
        const iceServers = await fetchIceServers();

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
            if (pc.iceConnectionState === "failed") {
                console.error("🚨 ICE Connection Failed! The connection could not be established.");
            }
            if (pc.iceConnectionState === "connected") {
                console.log("✅ ICE Connection Successful!");
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
