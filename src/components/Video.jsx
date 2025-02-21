import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "../styles.css";

const socket = io("https://omegle-backend-sq4d.onrender.com", { transports: ["websocket"], secure: true });

window.socket = socket;

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

        socket.on("match_found", (partner) => {
            console.log(`✅ Matched with ${partner}`);
            setPartnerId(partner);
            startCall(partner);
        });

        socket.on("disconnect", () => {
            console.log("❌ WebSocket Disconnected");
        });

        return () => {
            socket.off("connect");
            socket.off("match_found");
            socket.off("disconnect");
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
    
        // Log WebRTC Status
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("📤 Sending ICE Candidate");
                socket.emit("ice-candidate", { candidate: event.candidate, target: partner });
            }
        };
    };
    

    const createPeerConnection = (partner) => {
        console.log(`🔗 Creating PeerConnection with ${partner}`);
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "turn:relay1.expressturn.com:3478", username: "efrost", credential: "turnpassword" } // Free TURN server
            ]
        });
    
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("📤 Sending ICE Candidate");
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