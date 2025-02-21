import React from "react";
import io from "socket.io-client";
import "../styles.css";

const socket = io("http://localhost:5001"); // Connect to backend server

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
