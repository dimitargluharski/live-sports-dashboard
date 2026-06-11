import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  seq: number;
  roomId: string;
  nickname: string;
  text: string;
  createdAt: string;
};

type ChatPayload = {
  type?: "history" | "message" | "presence" | "read" | "error";
  messages?: ChatMessage[];
  message?: ChatMessage;
  online?: number;
  nickname?: string;
  lastSeenSeq?: number;
  text?: string;
};

const NICKNAME_STORAGE_KEY = "live-sports-chat-nickname";
const SOUND_ENABLED_STORAGE_KEY = "live-sports-chat-sound-enabled";

function getDefaultSocketUrl() {
  if (typeof window === "undefined") return "ws://localhost:8081/chat";

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8081/chat`;
}

function buildSocketUrl(roomId: string, nick: string) {
  const baseUrl = import.meta.env.VITE_CHAT_WS_URL || getDefaultSocketUrl();
  const url = new URL(baseUrl);
  if (!url.pathname || url.pathname === "/") {
    url.pathname = "/chat";
  }

  url.searchParams.set("room", roomId);
  url.searchParams.set("nick", nick);
  return url.toString();
}

export function useMatchChatRoom(roomId: string, isVisible: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readReceipts, setReadReceipts] = useState<Record<string, number>>({});
  const [inputValue, setInputValue] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
    return stored !== "0";
  });
  const [nickname, setNickname] = useState(() => {
    if (typeof window === "undefined") return "Guest";
    const existing = window.localStorage.getItem(NICKNAME_STORAGE_KEY);
    if (existing && existing.trim()) return existing.trim();

    const generated = `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    window.localStorage.setItem(NICKNAME_STORAGE_KEY, generated);
    return generated;
  });
  const [nickDraft, setNickDraft] = useState(nickname);
  const [showNickEditor, setShowNickEditor] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(NICKNAME_STORAGE_KEY);
    return !(stored && stored.trim());
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const prevOnlineCountRef = useRef<number | null>(null);

  const playSound = (kind: "join" | "message") => {
    if (!soundEnabled || typeof window === "undefined") return;

    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = kind === "join" ? 540 : 740;
    const duration = kind === "join" ? 0.13 : 0.16;

    osc.type = kind === "join" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  };

  useEffect(() => {
    if (!roomId) return;

    setErrorText(null);
    setUnreadCount(0);
    setMessages([]);

    const ws = new WebSocket(buildSocketUrl(roomId, nickname));
    wsRef.current = ws;

    ws.onopen = () => {
      setErrorText(null);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatPayload;

        if (payload.type === "history") {
          const historyMessages = Array.isArray(payload.messages)
            ? payload.messages
            : [];
          setMessages(historyMessages);

          if (payload.lastSeenSeq !== undefined && !isVisible) {
            const unread = historyMessages.filter(
              (m) => m.seq > (payload.lastSeenSeq ?? 0),
            ).length;
            setUnreadCount(unread);
          }
          return;
        }

        if (payload.type === "message" && payload.message) {
          setMessages((prev) => [...prev, payload.message as ChatMessage]);

          // ОПРАВЕНО: Свири ВИНАГИ, когато съобщението е от друг (независимо дали виждаш чата)
          if (payload.message.nickname !== nickname) {
            playSound("message");

            // Но вдигаме визуалния брояч (+1) САМО ако чатът е затворен/скрит
            if (!isVisible) {
              setUnreadCount((prev) => prev + 1);
            }
          }
          return;
        }

        if (
          payload.type === "read" &&
          payload.nickname &&
          typeof payload.lastSeenSeq === "number"
        ) {
          setReadReceipts((prev) => {
            const next = Math.max(
              prev[payload.nickname!] || 0,
              payload.lastSeenSeq || 0,
            );
            return {
              ...prev,
              [payload.nickname!]: next,
            };
          });
          return;
        }

        if (payload.type === "presence") {
          const nextOnline = Number(payload.online) || 0;
          // Остава изключено пищенето при влизане/излизане
          prevOnlineCountRef.current = nextOnline;
          setOnlineCount(nextOnline);
          return;
        }

        if (payload.type === "error") {
          const serverError = payload.text || "Chat error";
          setErrorText(serverError);
        }
      } catch {
        setErrorText("Invalid chat payload received.");
      }
    };

    ws.onerror = () => {
      setErrorText(
        "Unable to connect to chat server. Run `pnpm dev` inside frontend.",
      );
    };

    ws.onclose = () => {
      setErrorText((prev) => prev || "Chat disconnected.");
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomId, nickname, isVisible]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SOUND_ENABLED_STORAGE_KEY,
        soundEnabled ? "1" : "0",
      );
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (
      !isVisible ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    )
      return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    wsRef.current.send(
      JSON.stringify({ type: "read", lastSeenSeq: lastMessage.seq }),
    );

    setUnreadCount(0);
  }, [isVisible, messages.length]);

  const sendMessage = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setErrorText("Chat connection is not ready.");
      return;
    }

    const text = inputValue.trim();
    if (!text) return;

    ws.send(JSON.stringify({ type: "message", text }));
    setInputValue("");
    setErrorText(null);
  };

  const saveNickname = () => {
    const next = nickDraft.trim().slice(0, 20);
    if (!next) {
      setErrorText("Nickname cannot be empty.");
      return;
    }

    setNickname(next);
    setShowNickEditor(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NICKNAME_STORAGE_KEY, next);
    }
    setErrorText(null);
  };

  return {
    messages,
    onlineCount,
    unreadCount,
    readReceipts,
    nickname,
    inputValue,
    setInputValue,
    errorText,
    soundEnabled,
    setSoundEnabled,
    nickDraft,
    setNickDraft,
    showNickEditor,
    setShowNickEditor,
    sendMessage,
    saveNickname,
  };
}

export type { ChatMessage };
