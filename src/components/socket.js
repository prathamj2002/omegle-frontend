import { io } from "socket.io-client";

// ✅ Use a single WebSocket connection for the entire app
const socket = io("https://omegle-backend-sq4d.onrender.com", {
    transports: ["websocket"],
    secure: true,
});

export default socket;
