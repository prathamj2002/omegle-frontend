import React, { useState, useEffect } from "react";
import socket from "../socket"; // ✅ Use the shared socket
import "../styles.css";

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    useEffect(() => {
        socket.on("message", (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        return () => {
            socket.off("message"); // ✅ Clean up the event listener
        };
    }, []);

    const sendMessage = () => {
        if (input.trim() !== "") {
            socket.emit("message", input);
            setMessages((prevMessages) => [...prevMessages, `You: ${input}`]);
            setInput("");
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-box">
                {messages.map((msg, index) => (
                    <p key={index} className="chat-message">{msg}</p>
                ))}
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
};

export default Chat;
