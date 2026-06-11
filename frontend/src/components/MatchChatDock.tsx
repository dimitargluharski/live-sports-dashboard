import React, { useState } from "react";
import { createPortal } from "react-dom";
import { MatchChat } from "./MatchChat";
import { useMatchChatRoom } from "./useMatchChatRoom";

type MatchChatDockProps = {
  isOpen: boolean;
  roomId: string;
  matchId: string;
  title: string;
  onJoinRoom: (roomId: string) => void;
};

export const MatchChatDock: React.FC<MatchChatDockProps> = ({
  isOpen,
  roomId,
  matchId,
  title,
  onJoinRoom,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const chat = useMatchChatRoom(roomId, !isCollapsed);

  if (!isOpen || typeof document === "undefined") return null;

  const buildInviteUrl = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("inviteMatch", matchId);
    url.searchParams.set("inviteRoom", roomId);
    return url.toString();
  };

  const resolveJoinRoomValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";

    try {
      const url = new URL(trimmed);
      const inviteRoom = url.searchParams.get("inviteRoom");
      if (inviteRoom && inviteRoom.trim()) return inviteRoom.trim();

      const roomFromPath = url.searchParams.get("room");
      if (roomFromPath && roomFromPath.trim()) return roomFromPath.trim();
    } catch {
      // Not a URL, treat as raw room id.
    }

    return trimmed;
  };

  const copyInviteLink = async () => {
    const inviteUrl = buildInviteUrl();
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      window.prompt("Copy invite link:", inviteUrl);
    }
  };

  return createPortal(
    <aside className="fixed bottom-4 right-4 z-[70] w-[340px] max-w-[calc(100vw-1rem)]">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`flex w-full items-center justify-between border-b border-slate-200 bg-white px-3 py-2 text-left ${
            isCollapsed ? "cursor-pointer hover:bg-slate-50" : ""
          }`}
          aria-label={isCollapsed ? "Expand chat" : "Collapse chat"}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Chat
            </p>
            <p className="truncate text-[11px] text-slate-500">{title}</p>
          </div>

          {chat.unreadCount > 0 ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {chat.unreadCount}
            </div>
          ) : null}

          <svg
            className="h-5 w-5 shrink-0 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m19 14-7-7-7 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m5 10 7 7 7-7"
              />
            )}
          </svg>
        </button>

        {!isCollapsed && (
          <>
            <div className="border-b border-slate-200 bg-slate-50/60 px-3 py-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    ROOM - {roomId}
                  </p>
                  {chat.unreadCount > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {chat.unreadCount} unread
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => chat.setShowNickEditor((prev) => !prev)}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-slate-100 px-3 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                  aria-label="Edit nickname"
                  title="Edit nickname"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => chat.setSoundEnabled((prev) => !prev)}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-slate-100 px-3 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                  aria-label={
                    chat.soundEnabled
                      ? "Mute sound notifications"
                      : "Enable sound notifications"
                  }
                  title={chat.soundEnabled ? "Mute sounds" : "Enable sounds"}
                >
                  {chat.soundEnabled ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5 6 9H2v6h4l5 4V5Zm0 0v14m4.5-10.5a6 6 0 0 1 0 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5 6 9H2v6h4l5 4V5Zm0 0v14m5-10 4 4m0-4-4 4"
                      />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-slate-100 px-3 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Copy room code"
                  title="Copy room code"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2m-7 7H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2m0 0a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2m0 0h7"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setShowJoinInput((prev) => !prev)}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-slate-100 px-3 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Join room"
                  title="Join room"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 3h6v6m0-6-8.5 8.5M10 6H7a4 4 0 0 0-4 4v7a4 4 0 0 0 4 4h7a4 4 0 0 0 4-4v-3"
                    />
                  </svg>
                </button>

                <div className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-slate-100 px-3 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900">
                  <span className="text-[11px] font-semibold text-slate-700">
                    {chat.onlineCount}
                  </span>
                  <svg
                    className="h-5 w-5 text-slate-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 19c0-3 3-5 7-5s7 2 7 5v2H5v-2z" />
                  </svg>
                </div>
              </div>

              {showJoinInput && (
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={joinRoomInput}
                    onChange={(e) => setJoinRoomInput(e.target.value)}
                    placeholder="Paste room code or invite link"
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-800 outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const room = resolveJoinRoomValue(joinRoomInput);
                      if (!room) return;
                      onJoinRoom(room);
                      setShowJoinInput(false);
                    }}
                    className="inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-slate-800"
                  >
                    Join
                  </button>
                </div>
              )}

              {chat.showNickEditor && (
                <div className="mb-2 flex w-full items-center gap-2">
                  <input
                    id="chat-nick"
                    value={chat.nickDraft}
                    onChange={(e) =>
                      chat.setNickDraft(e.target.value.slice(0, 20))
                    }
                    placeholder="Nick"
                    className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={chat.saveNickname}
                    className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                  >
                    Save
                  </button>
                </div>
              )}

              <MatchChat
                messages={chat.messages}
                currentNickname={chat.nickname}
                onlineCount={chat.onlineCount}
                readReceipts={chat.readReceipts}
                inputValue={chat.inputValue}
                onInputValueChange={chat.setInputValue}
                onSendMessage={chat.sendMessage}
                errorText={chat.errorText}
              />
            </div>
          </>
        )}
      </div>
    </aside>,
    document.body,
  );
};
