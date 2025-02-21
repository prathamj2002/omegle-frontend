import React from "react";
import io from "socket.io-client";
import "../styles.css";

const socket = io("https://omegle-backend-sq4d.onrender.com", { transports: ["websocket"], secure: true });



const NextButton = () => {
    const handleNext = () => {
        socket.emit("next"); // Notify server to find a new match
        window.location.reload(); // Refresh to reset the chat and video
    };

    return (
        <button className="next-button" onClick={handleNext}>
            Next
        </button>
    );
};

export default NextButton;
