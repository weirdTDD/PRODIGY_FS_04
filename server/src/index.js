import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { db } from "./database.js";
import { verifyAuthToken } from "./auth/auth.js";
import authRoutes from "./auth/authRoutes.js";
import { authenticate } from "./middleware/authMiddleware.js";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Basic security middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);

const getRoomById = (roomId) =>
  db
    .prepare(
      `
    SELECT id, name, description, is_public 
    FROM rooms 
    WHERE id = ?
  `,
    )
    .get(roomId);

const listRooms = () =>
  db
    .prepare(
      `
    SELECT id, name, description, is_public 
    FROM rooms 
    ORDER BY id ASC
  `,
    )
    .all();

const listUserRooms = (userId) =>
  db
    .prepare(
      `
    SELECT rooms.id, rooms.name, rooms.description 
    FROM memberships 
    JOIN rooms ON rooms.id = memberships.room_id 
    WHERE memberships.user_id = ?
    ORDER BY rooms.id ASC
  `,
    )
    .all(userId);

const listRoomMessages = (roomId, limit = 50) =>
  db
    .prepare(
      `
    SELECT messages.id,
           messages.content AS text,
           messages.created_at AS createdAt,
           messages.user_id AS userId,
           users.email AS userEmail
    FROM messages
    JOIN users ON users.id = messages.user_id
    WHERE messages.room_id = ?
    ORDER BY messages.id DESC
    LIMIT ?
  `,
    )
    .all(roomId, limit)
    .reverse();

const addMembership = (userId, roomId) =>
  db
    .prepare(
      `
    INSERT OR IGNORE INTO memberships (user_id, room_id) 
    VALUES (?, ?)
  `,
    )
    .run(userId, roomId);

const isMember = (userId, roomId) => {
  const row = db
    .prepare(
      `
    SELECT 1 
    FROM memberships 
    WHERE user_id = ? AND room_id = ?
  `,
    )
    .get(userId, roomId);
  return Boolean(row);
};

const insertMessage = (roomId, userId, text) => {
  const result = db
    .prepare(
      `
    INSERT INTO messages (room_id, user_id, content) 
    VALUES (?, ?, ?)
  `,
    )
    .run(roomId, userId, text);

  return result.lastInsertRowid;
};

const sendToSocket = (ws, payload) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

const roomSockets = new Map();
const socketMeta = new Map();

const addSocketToRoom = (roomId, ws) => {
  if (!roomSockets.has(roomId)) {
    roomSockets.set(roomId, new Set());
  }
  roomSockets.get(roomId).add(ws);
};

const removeSocketFromRoom = (roomId, ws) => {
  const sockets = roomSockets.get(roomId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) {
    roomSockets.delete(roomId);
  }
};

const broadcastToRoom = (roomId, payload, options = {}) => {
  const { exclude } = options;
  const sockets = roomSockets.get(roomId);
  if (!sockets) return;
  sockets.forEach((client) => {
    if (exclude && client === exclude) return;
    sendToSocket(client, payload);
  });
};

const sendRoomHistory = (ws, roomId, limit = 50) => {
  const messages = listRoomMessages(roomId, limit);
  sendToSocket(ws, {
    type: "message:history",
    payload: { roomId, messages },
  });
};

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("New WebSocket connection");
  socketMeta.set(ws, {
    userId: null,
    userEmail: null,
    rooms: new Set(),
    activeRoom: null,
  });

  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "auth:token") {
      const token = message.payload?.token;
      const payload = token ? verifyAuthToken(token) : null;
      if (!payload) {
        sendToSocket(ws, { type: "auth:error", payload: "Invalid token" });
        return;
      }

      const meta = socketMeta.get(ws);
      meta.userId = payload.sub;
      meta.userEmail = payload.email;
      const userRooms = listUserRooms(payload.sub);
      meta.rooms = new Set(userRooms.map((room) => room.id));

      userRooms.forEach((room) => addSocketToRoom(room.id, ws));

      sendToSocket(ws, {
        type: "auth:ok",
        payload: {
          user: { id: payload.sub, email: payload.email },
          rooms: userRooms,
        },
      });
      return;
    }

    const meta = socketMeta.get(ws);
    if (!meta?.userId) {
      sendToSocket(ws, {
        type: "auth:required",
        payload: "Authenticate before sending messages.",
      });
      return;
    }

    if (message.type === "room:join") {
      const roomId = Number(message.payload?.roomId);
      if (!Number.isFinite(roomId)) return;
      const room = getRoomById(roomId);
      if (!room) return;

      addMembership(meta.userId, roomId);
      meta.rooms.add(roomId);
      addSocketToRoom(roomId, ws);

      sendToSocket(ws, {
        type: "room:joined",
        payload: { roomId },
      });
      return;
    }

    if (message.type === "room:enter") {
      const roomId = Number(message.payload?.roomId);
      if (!Number.isFinite(roomId)) return;
      if (!meta.rooms.has(roomId) && !isMember(meta.userId, roomId)) {
        sendToSocket(ws, {
          type: "room:join_required",
          payload: { roomId },
        });
        return;
      }
      meta.activeRoom = roomId;
      const limit = Number(message.payload?.limit) || 50;
      sendRoomHistory(ws, roomId, limit);
      return;
    }

    if (message.type === "room:leave") {
      meta.activeRoom = null;
      return;
    }

    if (message.type === "message:history") {
      const roomId = Number(message.payload?.roomId);
      if (!Number.isFinite(roomId)) return;

      if (!meta.rooms.has(roomId) && !isMember(meta.userId, roomId)) {
        sendToSocket(ws, {
          type: "room:join_required",
          payload: { roomId },
        });
        return;
      }

      const limit = Number(message.payload?.limit) || 50;
      sendRoomHistory(ws, roomId, limit);
      return;
    }

    if (message.type === "typing:start" || message.type === "typing:stop") {
      const roomId = Number(message.payload?.roomId);
      if (!Number.isFinite(roomId)) return;
      if (!meta.rooms.has(roomId) && !isMember(meta.userId, roomId)) {
        return;
      }

      broadcastToRoom(
        roomId,
        {
          type: "typing:update",
          payload: {
            roomId,
            userId: meta.userId,
            userEmail: meta.userEmail,
            isTyping: message.type === "typing:start",
          },
        },
        { exclude: ws },
      );
      return;
    }

    if (message.type === "message:send") {
      const { roomId, text, tempId } = message.payload || {};
      const roomIdNumber = Number(roomId);
      if (!Number.isFinite(roomIdNumber) || !text) return;

      if (
        !meta.rooms.has(roomIdNumber) &&
        !isMember(meta.userId, roomIdNumber)
      ) {
        sendToSocket(ws, {
          type: "room:join_required",
          payload: { roomId: roomIdNumber },
        });
        return;
      }

      addMembership(meta.userId, roomIdNumber);
      meta.rooms.add(roomIdNumber);
      addSocketToRoom(roomIdNumber, ws);

      const messageId = insertMessage(roomIdNumber, meta.userId, text);

      const outgoing = {
        type: "message:new",
        payload: {
          id: messageId,
          roomId: roomIdNumber,
          text,
          tempId,
          userId: meta.userId,
          userEmail: meta.userEmail,
          createdAt: new Date().toISOString(),
        },
      };

      broadcastToRoom(roomIdNumber, outgoing);

      roomSockets.get(roomIdNumber)?.forEach((client) => {
        const clientMeta = socketMeta.get(client);
        if (clientMeta?.activeRoom !== roomIdNumber) {
          sendToSocket(client, {
            type: "notification:new",
            payload: {
              roomId: roomIdNumber,
              messageId,
              preview: text.slice(0, 80),
            },
          });
        }
      });

      sendToSocket(ws, {
        type: "message:ack",
        payload: {
          tempId,
          id: messageId,
        },
      });
    }
  });

  ws.on("close", () => {
    const meta = socketMeta.get(ws);
    if (meta) {
      meta.rooms.forEach((roomId) => removeSocketFromRoom(roomId, ws));
    }
    socketMeta.delete(ws);
  });

  ws.send(JSON.stringify({ type: "connection", status: "connected" }));
});

// REST API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/rooms", (req, res) => {
  res.json({ rooms: listRooms() });
});

app.get("/api/rooms/joined", authenticate, (req, res) => {
  res.json({ rooms: listUserRooms(req.user.id) });
});

app.post("/api/rooms", authenticate, (req, res) => {
  const { name, description } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Room name is required" });
  }

  const result = db
    .prepare(
      `
    INSERT INTO rooms (name, description, is_public, created_by) 
    VALUES (?, ?, 1, ?)
  `,
    )
    .run(name, description || null, req.user.id);

  const room = getRoomById(result.lastInsertRowid);
  addMembership(req.user.id, room.id);
  return res.status(201).json({ room });
});

app.post("/api/rooms/:roomId/join", authenticate, (req, res) => {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) {
    return res.status(400).json({ error: "Invalid room id" });
  }

  const room = getRoomById(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  addMembership(req.user.id, roomId);
  res.json({ roomId });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
