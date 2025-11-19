# Whisp – Realtime Chat App

Whisp is a real-time chatting web application built with **React**, **Socket.IO**, **Express**, **JWT authentication**, and **Material UI**.

GitHub Link:(https://github.com/Malik-ibrahim1/Whisp.git)

It supports:

- Public global chat (everyone sees the message)
- Private 1:1 messages (DMs) between users
- Online users list with presence indicators
- Simple username-based login (JWT-backed)
- A modern, responsive chat UI

---

## ✨ Features

- 🔐 **JWT-based auth** – simple username sign-in with JSON Web Tokens  
- 💬 **Public chat** – messages broadcast to everyone in the room  
- 📩 **Private DMs** – send direct messages to a specific online user  
- 👥 **Online users list** – see who is online in real time  
- 🧑‍🎨 **Polished UI** – built with Material UI, avatars, status chips, and message bubbles  
- ⚡ **Socket.IO** – realtime, event-based communication between client and server  

---

## 🏗 Tech Stack

**Frontend**

- React (Vite or CRA)
- Socket.IO Client
- Material UI (`@mui/material`, `@mui/icons-material`, `@emotion/*`)

**Backend**

- Node.js + Express
- Socket.IO
- JSON Web Token (`jsonwebtoken`)
- CORS
- Cookie Parser (optional / future use)

---

## 📁 Project Structure

Example structure (adjust to your layout):

```bash
chatApp/
├─ server/
│  ├─ app.js
│  ├─ package.json
│  └─ ... (node_modules, etc.)
└─ client/
   ├─ src/
   │  ├─ App.jsx
   │  └─ main.jsx (or index.jsx)
   ├─ index.html
   ├─ package.json
   └─ ... (node_modules, etc.)
