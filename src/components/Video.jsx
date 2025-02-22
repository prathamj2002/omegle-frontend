import React, { useEffect, useRef, useState } from "react";
import socket from "../socket"; // ✅ Use the shared socket
import "../styles.css";

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
            peerConnection.current = createPeerConnection(sender);
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
                    urls: "turn:global.turn.twilio.com:3478",
                    username: "your_twilio_username",
                    credential: "your_twilio_credential"
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
