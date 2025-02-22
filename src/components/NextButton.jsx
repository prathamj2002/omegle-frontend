import React from "react";
import socket from "../socket"; // ✅ Use the shared socket
import "../styles.css";

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
