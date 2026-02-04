import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';

const getInitials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function RoomScreen({ rooms = [] }) {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const roomKey = useMemo(() => String(roomId), [roomId]);
  const bottomRef = useRef(null);

  const activeRoom = useMemo(
    () => rooms.find((room) => String(room.id) === roomKey),
    [rooms, roomKey],
  );

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'message:new') {
      const incoming = lastMessage.payload;
      if (!incoming || String(incoming.roomId) !== roomKey) return;

      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (msg) => msg.tempId && msg.tempId === incoming.tempId,
        );

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            id: incoming.id,
            status: 'delivered',
            content: incoming.text,
          };
          return next;
        }

        return [
          ...prev,
          {
            id: incoming.id,
            tempId: incoming.tempId,
            content: incoming.text,
            status: 'delivered',
            direction: 'in',
          },
        ];
      });
    }

    if (lastMessage.type === 'message:ack') {
      const ack = lastMessage.payload;
      if (!ack?.tempId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === ack.tempId
            ? { ...msg, id: ack.id, status: 'delivered' }
            : msg,
        ),
      );
    }
  }, [lastMessage, roomKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    const tempId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      {
        tempId,
        content: newMessage,
        status: 'sending',
        direction: 'out',
      },
    ]);

    try {
      await sendMessage({
        type: 'message:send',
        payload: {
          roomId,
          text: newMessage,
          tempId,
        },
      });
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: 'failed' } : msg,
        ),
      );
    }

    setNewMessage('');
    setIsSending(false);
  };

  const roomTitle = activeRoom?.name || `Room ${roomId}`;
  const roomSubtitle =
    activeRoom?.description || 'Real-time chat room';
  const roomInitials = activeRoom ? getInitials(activeRoom.name) : 'RM';

  return (
    <div className="flex min-h-[560px] flex-col">
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600">
            {roomInitials}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {roomTitle}
            </h1>
            <p className="text-xs text-slate-500">{roomSubtitle}</p>
          </div>
        </div>
        <div
          className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
            isConnected
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="rounded-3xl bg-white px-6 py-8 text-center text-sm text-slate-500 shadow-sm">
            Start the conversation. Messages will appear here.
          </div>
        )}
        {messages.map((message) => {
          const isOutgoing = message.direction === 'out';
          const isFailed = message.status === 'failed';
          const bubbleStyles = isFailed
            ? 'bg-rose-100 text-rose-700'
            : isOutgoing
            ? 'bg-blue-500 text-white'
            : 'bg-white text-slate-700';

          return (
            <div
              key={message.id || message.tempId}
              className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[78%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${bubbleStyles}`}
                >
                  {message.content}
                </div>
                {isOutgoing && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    {message.status === 'sending'
                      ? 'Sending...'
                      : message.status === 'failed'
                      ? 'Failed to send'
                      : 'Delivered'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

        {/*Message Input Area*/}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message here"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none rounded-md border border-slate-200"
            onKeyDown={(event) =>
              event.key === 'Enter' && !isSending && handleSendMessage()
            }
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition hover:bg-blue-600 disabled:bg-slate-300"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22l-4-9-9-4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
