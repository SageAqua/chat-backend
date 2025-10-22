import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://growliochat.vercel.app"], // your frontend URL
    methods: ["GET", "POST"]
  }
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 🔹 Try to pair immediately
  if (waitingUser && waitingUser.id !== socket.id) {
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

  // 🔹 Handle message sending
  socket.on("message", (msg) => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  // 🔹 Handle skip event
  socket.on("skip", () => {
    console.log(`User ${socket.id} skipped`);

    // Notify partner (if exists)
    if (socket.partner) {
      socket.partner.emit("partner_disconnected");
      socket.partner.partner = null;

      // Re-add the partner to waiting queue
      waitingUser = socket.partner;
      socket.partner = null;
    }

    // Re-add the current socket to waiting queue
    socket.partner = null;
    if (!waitingUser || waitingUser.disconnected) waitingUser = socket;
    else {
      const partner = waitingUser;
      waitingUser = null;

      socket.partner = partner;
      partner.partner = socket;

      socket.emit("matched");
      partner.emit("matched");

      console.log(`Rematched ${socket.id} with ${partner.id}`);
    }
  });

  // 🔹 Handle disconnects
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (waitingUser && waitingUser.id === socket.id) waitingUser = null;
    if (socket.partner) {
      socket.partner.emit("partner_disconnected");
      socket.partner.partner = null;
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
