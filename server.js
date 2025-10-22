import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://growliochat.vercel.app/",
        methods: ["GET", "POST"]
    }
});

let waitingUser = null;

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    if (waitingUser) {
        const partner = waitingUser;
        waitingUser = null;

        socket.partner = partner;
        partner.partner = socket;

        socket.emit("matched");
        partner.emit("matched");

        console.log(`Matched ${socket.id} with ${partner.id}`);
    } else {
        waitingUser = socket;
        socket.emit("waiting");
    }

    socket.on("message", (msg) => {
        if (socket.partner) socket.partner.emit("message", msg);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        if (waitingUser === socket) waitingUser = null;
        if (socket.partner) {
            socket.partner.emit("partner_disconnected");
            socket.partner.partner = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
