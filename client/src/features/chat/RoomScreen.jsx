import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';

export function RoomScreen() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { sendMessage } = useWebSocket();

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    const tempId = Date.now().toString();
    
    // Optimistic update
    setMessages(prev => [...prev, {
      tempId,
      content: newMessage,
      status: 'sending'
    }]);
    
    try {
      await sendMessage({
        type: 'message:send',
        payload: {
          roomId,
          text: newMessage
        }
      });
      
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? {...msg, status: 'delivered'} : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? {...msg, status: 'failed'} : msg
      ));
    }
    
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4 bg-white">
        <h1 className="text-xl font-bold">Room {roomId}</h1>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map(message => (
          <div key={message.id || message.tempId} 
            className={`p-3 rounded-lg max-w-md ${message.status === 'failed' 
              ? 'bg-red-100' 
              : 'bg-blue-100'}`}>
            <p className="text-gray-800">{message.content}</p>
            {message.status === 'sending' && (
              <span className="text-xs text-gray-500">Sending...</span>
            )}
          </div>
        ))}
      </div>
      
      <div className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2"
            onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg
              hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}