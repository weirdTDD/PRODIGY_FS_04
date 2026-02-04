import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function LobbyScreen() {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');

  // TODO: Fetch rooms from server via WebSocket
  useEffect(() => {
    // Temporary mock data
    setRooms([
      { id: 1, name: 'General', memberCount: 5 },
      { id: 2, name: 'Developers', memberCount: 3 }
    ]);
  }, []);

  const handleCreateRoom = () => {
    if (!newRoomName) return;
    // TODO: Send room creation request via WS
    setRooms(prev => [...prev, { id: Date.now(), name: newRoomName, memberCount: 0 }]);
    setNewRoomName('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Chat Rooms</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="New room name"
            className="border rounded px-3 py-2 w-48"
          />
          <button
            onClick={handleCreateRoom}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Room
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rooms.map(room => (
          <Link
            key={room.id}
            to={`/room/${room.id}`}
            className="block p-4 border rounded hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{room.name}</span>
              <span className="text-gray-500">{room.memberCount} members</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}