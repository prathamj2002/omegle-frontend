import React from "react";
import Chat from "./components/Chat";
import Video from "./components/Video";
import NextButton from "./components/NextButton";
import "./styles.css";

const App = () => {
    return (
        <div className="app-container">
            <h1>Random Video Chat</h1>
            <Video />
            <Chat />
            <NextButton />
        </div>
    );
};

export default App;