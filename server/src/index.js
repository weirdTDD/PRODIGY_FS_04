import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

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

const broadcast = (payload) => {
  const serialized = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  });
};

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "message:send") {
      const { roomId, text, tempId } = message.payload || {};
      if (!roomId || !text) return;

      const outgoing = {
        type: "message:new",
        payload: {
          id: createMessageId(),
          roomId,
          text,
          tempId,
        },
      };

      broadcast(outgoing);

      ws.send(
        JSON.stringify({
          type: "message:ack",
          payload: {
            tempId,
            id: outgoing.payload.id,
          },
        }),
      );
    }
  });

  ws.send(JSON.stringify({ type: "connection", status: "connected" }));
});

// REST API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
