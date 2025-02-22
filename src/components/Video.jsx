import React, { useEffect, useRef, useState } from "react";
import socket from "../components/socket";
import "../styles.css";

const Video = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    window.peerConnection = peerConnection;
    const [partnerId, setPartnerId] = useState(null);
    const [iceServers, setIceServers] = useState([]);

    useEffect(() => {
        console.log("🔗 Connecting to WebSocket...");

        socket.on("connect", () => {
            console.log("✅ WebSocket Connected:", socket.id);
            fetchIceServers(); // Fetch ICE servers when connected
        });

        socket.emit("find_match");

        socket.on("match_found", async (partner) => {
            console.log(`✅ Matched with ${partner}`);
            setPartnerId(partner);
            await startCall(partner);
        });

        socket.on("offer", async ({ sdp, sender }) => {
            console.log(`📩 Offer received from ${sender}`);

            if (!peerConnection.current) {
                peerConnection.current = createPeerConnection(sender);
            }

            try {
                if (peerConnection.current.signalingState === "stable" || peerConnection.current.signalingState === "have-local-offer") {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);
                    socket.emit("answer", { sdp: answer, target: sender });
                } else {
                    console.error("🚨 Invalid signaling state for offer:", peerConnection.current.signalingState);
                }
            } catch (error) {
                console.error("🚨 Error setting remote description (Offer):", error);
            }
        });

        socket.on("answer", async ({ sdp }) => {
            console.log(`📩 Answer received`);

            if (peerConnection.current && peerConnection.current.signalingState === "have-local-offer") {
                try {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
                } catch (error) {
                    console.error("🚨 Error setting remote description (Answer):", error);
                }
            } else {
                console.error("🚨 Invalid signaling state for answer:", peerConnection.current?.signalingState);
            }
        });

        socket.on("ice-candidate", ({ candidate }) => {
            console.log(`📩 ICE Candidate received`);
            if (peerConnection.current) {
                peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
                    console.error("🚨 Error adding ICE candidate:", error);
                });
            }
        });

        return () => {
            socket.off("connect");
            socket.off("match_found");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
        };
    }, []);

    const fetchIceServers = async () => {
        console.log("🔗 Fetching ICE Servers from backend...");
        try {
            const response = await fetch("https://omegle-backend-sq4d.onrender.com/getIceServers");
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                setIceServers(data);
                console.log("✅ ICE Servers:", data);
            } else {
                console.error("❌ Invalid ICE Server response:", data);
            }
        } catch (error) {
            console.error("🚨 Error fetching ICE Servers:", error);
        }
    };

    const startCall = async (partner) => {
        console.log(`📞 Starting call with ${partner}`);

        peerConnection.current = createPeerConnection(partner);
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

    const createPeerConnection = (partner) => {
        console.log(`🔗 Creating PeerConnection with ${partner}`);

        if (iceServers.length === 0) {
            console.error("❌ No ICE servers available!");
            return null;
        }

        const pc = new RTCPeerConnection({
            iceServers: iceServers,
            iceTransportPolicy: "relay"
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
