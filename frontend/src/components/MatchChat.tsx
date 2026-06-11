import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from './useMatchChatRoom';

type MatchChatProps = {
  messages: ChatMessage[];
  currentNickname: string;
  onlineCount: number;
  readReceipts: Record<string, number>;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onSendMessage: () => void;
  errorText: string | null;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MatchChat: React.FC<MatchChatProps> = ({
  messages,
  currentNickname,
  onlineCount,
  readReceipts,
  inputValue,
  onInputValueChange,
  onSendMessage,
  errorText,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="h-52 overflow-y-auto px-3 py-2.5">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.nickname === currentNickname ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-md border px-2.5 py-2 ${
                    message.nickname === currentNickname
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${message.nickname === currentNickname ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {message.nickname === currentNickname ? 'You' : message.nickname}
                    </span>
                    <span className="text-[11px] text-slate-500">{formatTime(message.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-800 break-words">{message.text}</p>
                  {message.nickname === currentNickname && (
                    <p className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${getMessageStatus(message, currentNickname, onlineCount, readReceipts) === 'seen' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getMessageStatus(message, currentNickname, onlineCount, readReceipts) === 'seen' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {getMessageStatus(message, currentNickname, onlineCount, readReceipts)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <input
            value={inputValue}
            onChange={(e) => onInputValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSendMessage();
              }
            }}
            maxLength={280}
            placeholder="Type message..."
            className="flex-1 rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
          />
          <button
            onClick={onSendMessage}
            className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Send
          </button>
        </div>

        {errorText && <p className="mt-2 text-xs text-rose-600">{errorText}</p>}
      </div>
    </section>
  );
};

function getMessageStatus(
  message: ChatMessage,
  currentNickname: string,
  onlineCount: number,
  readReceipts: Record<string, number>,
) {
  if (message.nickname !== currentNickname) return '';

  const otherReaders = Object.entries(readReceipts).some(([nickname, lastSeenSeq]) => {
    return nickname !== currentNickname && lastSeenSeq >= message.seq;
  });

  if (otherReaders) return 'seen';
  if (onlineCount > 1) return 'delivered';
  return 'sent';
}
