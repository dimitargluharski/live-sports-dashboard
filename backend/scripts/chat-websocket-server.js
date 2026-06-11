const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.CHAT_PORT || "8081");
const MAX_MESSAGE_LENGTH = Number(process.env.CHAT_MAX_MESSAGE_LENGTH || "280");
const ROOM_HISTORY_LIMIT = Number(process.env.CHAT_ROOM_HISTORY_LIMIT || "100");
const MIN_MESSAGE_INTERVAL_MS = Number(
  process.env.CHAT_MIN_MESSAGE_INTERVAL_MS || "1000",
);

const rooms = new Map();
const clientMeta = new WeakMap();

process.on("unhandledRejection", (reason) => {
  if (reason?.message?.includes("onResponseError")) return;
  console.error("Unhandled Rejection:", reason);
});

function sanitizeText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function createRoomIfMissing(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      clients: new Set(),
      history: [],
      nextSeq: 1,
    });
  }

  return rooms.get(roomId);
}

function broadcastToRoom(roomId, payload) {
  const room = rooms.get(roomId);
  if (!room) return;

  const serialized = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client.readyState === client.OPEN) {
      client.send(serialized);
    }
  }
}

function sendPresence(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  broadcastToRoom(roomId, {
    type: "presence",
    roomId,
    online: room.clients.size,
  });
}

function sendReadReceipt(roomId, nickname, lastSeenSeq) {
  broadcastToRoom(roomId, {
    type: "read",
    roomId,
    nickname,
    lastSeenSeq,
  });
}

function cleanupRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.clients.size === 0) {
    rooms.delete(roomId);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  if (url.pathname !== "/chat") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, url);
  });
});

wss.on("connection", (ws, req, url) => {
  const roomId = sanitizeText(url.searchParams.get("room"));
  const nickname = sanitizeText(url.searchParams.get("nick")) || "Guest";

  if (!roomId) {
    ws.close(1008, "Missing room");
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const room = createRoomIfMissing(roomId);
  room.clients.add(ws);

  clientMeta.set(ws, {
    roomId,
    nickname,
    ip,
    lastMessageAt: 0,
    lastSeenSeq: 0,
  });

  ws.send(
    JSON.stringify({
      type: "history",
      roomId,
      messages: room.history,
    }),
  );

  sendPresence(roomId);

  ws.on("message", (rawMessage) => {
    let parsed;
    try {
      parsed = JSON.parse(rawMessage.toString("utf8"));
    } catch {
      ws.send(JSON.stringify({ type: "error", text: "Invalid JSON payload" }));
      return;
    }

    if (parsed?.type === "read") {
      const meta = clientMeta.get(ws);
      if (!meta) return;

      const nextSeenSeq = Number(parsed.lastSeenSeq) || 0;
      if (nextSeenSeq <= meta.lastSeenSeq) return;

      meta.lastSeenSeq = nextSeenSeq;
      sendReadReceipt(meta.roomId, meta.nickname, meta.lastSeenSeq);
      return;
    }

    if (parsed?.type !== "message") return;

    const meta = clientMeta.get(ws);
    if (!meta) return;

    const now = Date.now();
    if (now - meta.lastMessageAt < MIN_MESSAGE_INTERVAL_MS) {
      ws.send(
        JSON.stringify({
          type: "error",
          text: `Slow down. You can send one message every ${MIN_MESSAGE_INTERVAL_MS} ms.`,
        }),
      );
      return;
    }

    const text = sanitizeText(parsed.text).slice(0, MAX_MESSAGE_LENGTH);
    if (!text) {
      ws.send(JSON.stringify({ type: "error", text: "Message is empty." }));
      return;
    }

    meta.lastMessageAt = now;

    const targetRoom = rooms.get(meta.roomId);
    if (!targetRoom) return;

    const message = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      seq: targetRoom.nextSeq++,
      roomId: meta.roomId,
      nickname: meta.nickname,
      text,
      createdAt: new Date(now).toISOString(),
    };

    targetRoom.history.push(message);
    if (targetRoom.history.length > ROOM_HISTORY_LIMIT) {
      targetRoom.history.splice(
        0,
        targetRoom.history.length - ROOM_HISTORY_LIMIT,
      );
    }

    broadcastToRoom(meta.roomId, {
      type: "message",
      roomId: meta.roomId,
      message,
    });
  });

  ws.on("close", () => {
    const meta = clientMeta.get(ws);
    if (!meta) return;

    const targetRoom = rooms.get(meta.roomId);
    if (!targetRoom) return;

    targetRoom.clients.delete(ws);
    sendPresence(meta.roomId);
    cleanupRoomIfEmpty(meta.roomId);
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }
}, 30_000);

wss.on("close", () => {
  clearInterval(heartbeat);
});

server.listen(PORT, () => {
  console.log(`Chat WebSocket server listening on http://0.0.0.0:${PORT}`);
  console.log(
    `WebSocket endpoint: ws://0.0.0.0:${PORT}/chat?room=<roomId>&nick=<nickname>`,
  );
});
