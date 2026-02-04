import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const getInitials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function RoomScreen({ rooms = [], currentUser, socket }) {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const { isConnected, lastMessage, sendMessage } = socket || {};
  const roomKey = useMemo(() => String(roomId), [roomId]);
  const bottomRef = useRef(null);
  const typingTimeoutsRef = useRef(new Map());
  const localTypingRef = useRef({ active: false, timeoutId: null });

  const activeRoom = useMemo(
    () => rooms.find((room) => String(room.id) === roomKey),
    [rooms, roomKey],
  );

  const currentUserId = currentUser?.id ? String(currentUser.id) : null;

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

        const isOutgoing =
          currentUserId && String(incoming.userId) === currentUserId;

        return [
          ...prev,
          {
            id: incoming.id,
            tempId: incoming.tempId,
            content: incoming.text,
            status: 'delivered',
            direction: isOutgoing ? 'out' : 'in',
            userId: incoming.userId,
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

    if (lastMessage.type === 'message:history') {
      const payload = lastMessage.payload || {};
      if (String(payload.roomId) !== roomKey) return;
      const history = Array.isArray(payload.messages)
        ? payload.messages
        : [];

      setMessages((prev) => {
        const normalized = history.map((item) => ({
          id: item.id,
          content: item.text ?? item.content,
          status: 'delivered',
          direction:
            currentUserId && String(item.userId) === currentUserId
              ? 'out'
              : 'in',
          userId: item.userId,
          userEmail: item.userEmail,
          createdAt: item.createdAt,
        }));

        const existingIds = new Set(
          normalized.map((item) => item.id).filter(Boolean),
        );

        const pending = prev.filter(
          (message) =>
            message.status === 'sending' || message.status === 'failed',
        );

        const pendingFiltered = pending.filter(
          (message) => !message.id || !existingIds.has(message.id),
        );

        return [...normalized, ...pendingFiltered];
      });
    }
  }, [currentUserId, lastMessage, roomKey]);

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'typing:update') return;
    const payload = lastMessage.payload || {};
    if (String(payload.roomId) !== roomKey) return;
    if (currentUserId && String(payload.userId) === currentUserId) return;

    const name = payload.userEmail
      ? payload.userEmail.split('@')[0]
      : `User ${payload.userId}`;
    const timeouts = typingTimeoutsRef.current;

    if (payload.isTyping) {
      setTypingUsers((prev) => {
        const exists = prev.some((user) => user.userId === payload.userId);
        if (exists) return prev;
        return [...prev, { userId: payload.userId, name }];
      });

      if (timeouts.has(payload.userId)) {
        clearTimeout(timeouts.get(payload.userId));
      }

      const timeoutId = setTimeout(() => {
        setTypingUsers((prev) =>
          prev.filter((user) => user.userId !== payload.userId),
        );
        timeouts.delete(payload.userId);
      }, 2500);

      timeouts.set(payload.userId, timeoutId);
    } else {
      if (timeouts.has(payload.userId)) {
        clearTimeout(timeouts.get(payload.userId));
        timeouts.delete(payload.userId);
      }
      setTypingUsers((prev) =>
        prev.filter((user) => user.userId !== payload.userId),
      );
    }
  }, [currentUserId, lastMessage, roomKey]);

  useEffect(() => {
    if (!sendMessage || !isConnected) return;
    setMessages([]);
    setTypingUsers([]);
    sendMessage({
      type: 'room:join',
      payload: { roomId },
    }).catch(() => {});

    sendMessage({
      type: 'room:enter',
      payload: { roomId, limit: 50 },
    }).catch(() => {});

    return () => {
      if (localTypingRef.current.active) {
        localTypingRef.current.active = false;
        sendTypingState(false);
      }

      sendMessage({
        type: 'room:leave',
        payload: { roomId },
      }).catch(() => {});
    };
  }, [isConnected, roomId, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      typingTimeoutsRef.current.forEach((timeoutId) =>
        clearTimeout(timeoutId),
      );
      if (localTypingRef.current.timeoutId) {
        clearTimeout(localTypingRef.current.timeoutId);
      }
    };
  }, []);

  const sendTypingState = (isTyping) => {
    if (!sendMessage || !isConnected) return;
    sendMessage({
      type: isTyping ? 'typing:start' : 'typing:stop',
      payload: { roomId },
    }).catch(() => {});
  };

  const scheduleTypingStop = () => {
    if (localTypingRef.current.timeoutId) {
      clearTimeout(localTypingRef.current.timeoutId);
    }

    localTypingRef.current.timeoutId = setTimeout(() => {
      if (localTypingRef.current.active) {
        localTypingRef.current.active = false;
        sendTypingState(false);
      }
    }, 1400);
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setNewMessage(value);

    if (!sendMessage || !isConnected) return;
    if (!value.trim()) {
      if (localTypingRef.current.active) {
        localTypingRef.current.active = false;
        sendTypingState(false);
      }
      return;
    }

    if (!localTypingRef.current.active) {
      localTypingRef.current.active = true;
      sendTypingState(true);
    }

    scheduleTypingStop();
  };

  const handleInputBlur = () => {
    if (localTypingRef.current.active) {
      localTypingRef.current.active = false;
      sendTypingState(false);
    }
  };

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
        userId: currentUser?.id,
        userEmail: currentUser?.email,
      },
    ]);

    if (!sendMessage) {
      setIsSending(false);
      return;
    }

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

    if (localTypingRef.current.active) {
      localTypingRef.current.active = false;
      sendTypingState(false);
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
          const displayName = isOutgoing
            ? 'You'
            : message.userEmail
            ? message.userEmail.split('@')[0]
            : `User ${message.userId ?? ''}`.trim();
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
                  className={`mb-1 text-[11px] font-semibold ${
                    isOutgoing ? 'text-slate-500 text-right' : 'text-slate-500'
                  }`}
                >
                  {displayName}
                </div>
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

      {typingUsers.length > 0 && (
        <div className="pb-3 text-xs text-slate-500">
          {typingUsers.length === 1
            ? `${typingUsers[0].name} is typing...`
            : `${typingUsers.length} people are typing...`}
        </div>
      )}

      {/*Message Input Area*/}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message here"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none border-none rounded-lg"
            onBlur={handleInputBlur}
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
