import React, { useEffect, useRef, useState } from "react";
import socket from "../components/socket"; 

import "../styles.css";


const Video = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    window.peerConnection = peerConnection;
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

            if (!peerConnection.current) {
                peerConnection.current = createPeerConnection(sender);
            }

            try {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                socket.emit("answer", { sdp: answer, target: sender });
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

    const startCall = async (partner) => {
        console.log(`📞 Starting call with ${partner}`);
        peerConnection.current = createPeerConnection(partner);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

        console.log("📤 Sending offer...");
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit("offer", { sdp: offer, target: partner });
    };

    const createPeerConnection = (partner) => {
        console.log(`🔗 Creating PeerConnection with ${partner}`);

        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                },
                {
                    urls: "turn:relay.backups.cz",
                    username: "webrtc",
                    credential: "webrtc"
                }
            ],
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
