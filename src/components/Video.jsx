import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "../styles.css";

const socket = io("https://omegle-backend-sq4d.onrender.com", { transports: ["websocket"] });


const Video = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const [partnerId, setPartnerId] = useState(null);

    useEffect(() => {
        console.log("Requesting match...");
        socket.emit("find_match"); // Request a match once

        socket.on("match_found", (partner) => {
            console.log(`✅ Matched with ${partner}`);
            setPartnerId(partner);
            startCall(partner);
        });

        socket.on("offer", async ({ sdp, sender }) => {
            console.log(`📩 Received offer from ${sender}`);
            peerConnection.current = createPeerConnection(sender);
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("answer", { sdp: answer, target: sender });
        });

        socket.on("answer", async ({ sdp }) => {
            console.log(`📩 Received answer`);
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on("ice-candidate", ({ candidate }) => {
            console.log(`📩 Received ICE Candidate`);
            peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on("disconnect_peer", () => {
            console.log("❌ Partner disconnected");
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            peerConnection.current?.close();
            peerConnection.current = null;
            socket.emit("find_match"); // Rejoin queue
        });

        return () => {
            socket.off("match_found");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("disconnect_peer");
        };
    }, []);

    const startCall = async (partner) => {
        console.log(`📞 Starting call with ${partner}`);
        peerConnection.current = createPeerConnection(partner);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));
    };

    const createPeerConnection = (partner) => {
        console.log(`🔗 Creating PeerConnection with ${partner}`);
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`📤 Sending ICE Candidate`);
                socket.emit("ice-candidate", { candidate: event.candidate, target: partner });
            }
        };

        pc.ontrack = (event) => {
            console.log(`📡 Received track`);
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
