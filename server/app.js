// app.js
import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const app = express();
const port = 3000;
const server = createServer(app);

const JWT_SECRET = "super_secret_key_change_me"; // use env in real app

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Chat server is running");
});

app.post("/api/login", (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username is required" });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ token, username });
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// in-memory state
const onlineUsers = new Map(); // socket.id -> username
const usernameToSocket = new Map(); // username -> socket.id
const messageHistory = []; // only public messages

// auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error: no token"));

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { username: payload.username };
    next();
  } catch (err) {
    console.error("JWT verify failed:", err.message);
    next(new Error("Authentication error: invalid token"));
  }
});

io.on("connection", (socket) => {
  const username = socket.user?.username || "Unknown";

  console.log("User connected:", username, "socket:", socket.id);
  onlineUsers.set(socket.id, username);
  usernameToSocket.set(username, socket.id);

  // send public history and current online users
  socket.emit("welcome", `Welcome, ${username}!`);
  socket.emit("chat:history", messageHistory);
  io.emit("chat:users", Array.from(new Set(onlineUsers.values())));

  // PUBLIC MESSAGE
  socket.on("chat:message", (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    const msg = {
      id: socket.id,
      username,
      text: trimmed,
      time: new Date().toISOString(),
      type: "public",
    };

    messageHistory.push(msg);
    if (messageHistory.length > 100) messageHistory.shift();

    io.emit("chat:message", msg);
  });

  // PRIVATE MESSAGE
  socket.on("chat:private", ({ to, text }) => {
    const trimmed = (text || "").trim();
    if (!to || !trimmed) return;

    const targetSocketId = usernameToSocket.get(to);
    if (!targetSocketId) {
      console.log(`User ${to} not online, cannot send DM.`);
      return;
    }

    const msg = {
      id: socket.id,
      username,
      to,
      text: trimmed,
      time: new Date().toISOString(),
      type: "private",
    };

    // send to receiver
    io.to(targetSocketId).emit("chat:private", msg);
    // send back to sender so they see their own DM
    socket.emit("chat:private", msg);
  });

  socket.on("disconnect", (reason) => {
    console.log("User disconnected:", username, "reason:", reason);

    onlineUsers.delete(socket.id);

    // if this was the stored socket for that username, clear mapping
    const current = usernameToSocket.get(username);
    if (current === socket.id) {
      usernameToSocket.delete(username);
    }

    io.emit("chat:users", Array.from(new Set(onlineUsers.values())));
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
