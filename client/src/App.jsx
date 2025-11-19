import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import LogoutIcon from "@mui/icons-material/Logout";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

const API_URL = "http://localhost:3000"; // server base URL
const EVERYONE = "Everyone";

const App = () => {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem("username") || ""
  );

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedUser, setSelectedUser] = useState(EVERYONE); // <- DM target

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ----- LOGIN HANDLER -----
  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Login failed");
        return;
      }

      const data = await res.json();
      setToken(data.token);
      setCurrentUser(data.username);
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
    } catch (error) {
      console.error("Login error:", error);
      alert("Login error");
    }
  };

  const handleLogout = () => {
    setToken("");
    setCurrentUser("");
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    setIsConnected(false);
    setMessages([]);
    setOnlineUsers([]);
    setSelectedUser(EVERYONE);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // ----- EFFECT: SOCKET SETUP / CLEANUP WHEN TOKEN EXISTS ----
  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("welcome", (msg) => {
      console.log("Welcome:", msg);
    });

    socket.on("chat:history", (history) => {
      // history only contains public messages
      setMessages(history);
    });

    socket.on("chat:users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("chat:message", (msg) => {
      // public message
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("chat:private", (msg) => {
      // private message (either sent or received)
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("welcome");
      socket.off("chat:history");
      socket.off("chat:users");
      socket.off("chat:message");
      socket.off("chat:private");
      socket.disconnect();
    };
  }, [token]);

  // ----- AUTO SCROLL TO BOTTOM WHEN MESSAGES CHANGE -----
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ----- TYPING INDICATOR (LOCAL ONLY) -----
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (!isTyping) setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000);
  };

  // ----- SEND MESSAGE (PUBLIC OR PRIVATE) -----
  const handleSendMessage = (e) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || !socketRef.current || !socketRef.current.connected) return;

    if (selectedUser && selectedUser !== EVERYONE) {
      // private DM
      socketRef.current.emit("chat:private", {
        to: selectedUser,
        text: trimmed,
      });
    } else {
      // public
      socketRef.current.emit("chat:message", trimmed);
    }

    setMessageInput("");
    setIsTyping(false);
  };

  // SIMPLE AVATAR COLOR PICKER
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // ----- LOGIN SCREEN -----
  if (!token || !currentUser) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #1e3c72 0%, #2a5298 40%, #1b1b2f 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={6}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" gutterBottom>
              Realtime Chat
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Pick a username and join the conversation instantly.
            </Typography>

            <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, py: 1.1, borderRadius: 999 }}
                disabled={!username.trim()}
              >
                Join Chat
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ----- CHAT UI -----
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1f4068 0, #1b1b2f 45%, #070b18 100%)",
      }}
    >
      {/* Top AppBar */}
      <AppBar position="static" elevation={4}>
        <Toolbar>
          <ChatBubbleOutlineIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Whisp
          </Typography>

          <Chip
            size="small"
            label={isConnected ? "Online" : "Offline"}
            color={isConnected ? "success" : "default"}
            sx={{ mr: 2 }}
          />

          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          elevation={8}
          sx={{
            p: 2,
            borderRadius: 3,
            display: "flex",
            height: "80vh",
            overflow: "hidden",
            bgcolor: "rgba(10, 10, 20, 0.9)",
          }}
        >
          {/* LEFT: Chat area */}
          <Box
            sx={{
              flex: 3,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              pr: 2,
            }}
          >
            {/* Header inside chat */}
            <Box
              sx={{
                mb: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar
                  sx={{
                    bgcolor: stringToColor(currentUser),
                    width: 36,
                    height: 36,
                    fontSize: 18,
                  }}
                >
                  {getInitials(currentUser)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" color="white">
                    {currentUser}
                  </Typography>
                  <Typography variant="caption" color="gray">
                    {isConnected ? "Connected" : "Reconnecting..."}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Sending to:
                </Typography>
                <Chip
                  size="small"
                  label={
                    selectedUser === EVERYONE
                      ? "Everyone (public)"
                      : `${selectedUser} (private)`
                  }
                  color={selectedUser === EVERYONE ? "default" : "secondary"}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mb: 1 }} />

            {/* Messages list */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                pr: 1,
                py: 1,
                "&::-webkit-scrollbar": {
                  width: 6,
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 3,
                },
              }}
            >
              <List dense>
                {messages.map((m, idx) => {
                  const isMe = m.username === currentUser;
                  const isPrivate = m.type === "private";
                  const isDMToMe =
                    isPrivate &&
                    ((m.username === currentUser && m.to) ||
                      m.to === currentUser);

                  return (
                    <ListItem
                      key={idx}
                      sx={{
                        display: "flex",
                        justifyContent: isMe ? "flex-end" : "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: "70%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMe ? "flex-end" : "flex-start",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            mb: 0.3,
                          }}
                        >
                          {m.username}
                          {isPrivate && m.to && (
                            <>
                              {" "}
                              <span style={{ opacity: 0.8 }}>
                                (to {m.to}, private)
                              </span>
                            </>
                          )}
                        </Typography>
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: 3,
                            bgcolor: isPrivate
                              ? isMe
                                ? "secondary.main"
                                : "secondary.dark"
                              : isMe
                              ? "primary.main"
                              : "grey.800",
                            color: "white",
                            boxShadow: 2,
                          }}
                        >
                          <Typography variant="body2">{m.text}</Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 0.3,
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.7rem",
                          }}
                        >
                          {new Date(m.time).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </ListItem>
                  );
                })}
                <div ref={messagesEndRef} />
              </List>
            </Box>

            {/* Typing indicator */}
            {isTyping && (
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.7)", mb: 0.5, ml: 1 }}
              >
                You are typing...
              </Typography>
            )}

            {/* Input area */}
            <Box
              component="form"
              onSubmit={handleSendMessage}
              sx={{
                display: "flex",
                gap: 1,
                mt: 1,
                alignItems: "center",
              }}
            >
              <TextField
                fullWidth
                placeholder={
                  selectedUser === EVERYONE
                    ? "Type a public message..."
                    : `DM to ${selectedUser}...`
                }
                value={messageInput}
                onChange={handleInputChange}
                disabled={!isConnected}
                variant="outlined"
                size="small"
                InputProps={{
                  sx: {
                    borderRadius: 999,
                    bgcolor: "rgba(255,255,255,0.08)",
                    color: "white",
                  },
                }}
              />
              <Tooltip title="Send">
                <span>
                  <IconButton
                    type="submit"
                    color="primary"
                    disabled={!isConnected || !messageInput.trim()}
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {/* RIGHT: Online users */}
          <Box
            sx={{
              flex: 1.1,
              pl: 2,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ mb: 1, color: "rgba(255,255,255,0.9)" }}
            >
              Online Users
            </Typography>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mb: 1 }} />

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                  width: 6,
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 3,
                },
              }}
            >
              {/* Everyone option */}
              <List dense>
                <ListItem
                  button
                  selected={selectedUser === EVERYONE}
                  onClick={() => setSelectedUser(EVERYONE)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    bgcolor:
                      selectedUser === EVERYONE
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>🌐</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Everyone"
                    secondary="Public chat"
                    primaryTypographyProps={{
                      color: "white",
                      fontWeight:
                        selectedUser === EVERYONE ? "bold" : "normal",
                    }}
                    secondaryTypographyProps={{
                      color: "rgba(255,255,255,0.6)",
                    }}
                  />
                </ListItem>

                {/* actual users */}
                {onlineUsers.map((u, idx) => (
                  <ListItem
                    key={idx}
                    button
                    disabled={u === currentUser}
                    selected={selectedUser === u}
                    onClick={() => setSelectedUser(u)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      bgcolor:
                        selectedUser === u
                          ? "rgba(25, 118, 210, 0.25)"
                          : "transparent",
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        variant="dot"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: "#44b700",
                            color: "#44b700",
                            boxShadow: `0 0 0 2px rgba(10,10,20,1)`,
                          },
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: stringToColor(u),
                          }}
                        >
                          {getInitials(u)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={u}
                      primaryTypographyProps={{
                        color: "white",
                        fontWeight: u === currentUser ? "bold" : "normal",
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default App;
