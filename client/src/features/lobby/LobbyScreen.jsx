import { useState } from 'react';
import { Link } from 'react-router-dom';

const getInitials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function LobbyScreen({ rooms = [], onCreateRoom }) {
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreateRoom = () => {
    const trimmed = newRoomName.trim();
    if (!trimmed) return;
    onCreateRoom?.(trimmed);
    setNewRoomName('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[28px] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Pick a room from the right or create a new one below.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-sm font-semibold text-white shadow-md">
            WS
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="New room name"
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            onKeyDown={(event) =>
              event.key === 'Enter' && handleCreateRoom()
            }
          />
          <button
            onClick={handleCreateRoom}
            className="rounded-2xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600"
          >
            Create Room
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rooms.map((room) => (
          <Link
            key={room.id}
            to={`/room/${room.id}`}
            className="group rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                {getInitials(room.name)}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {room.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {room.description}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {rooms.length === 0 && (
          <div className="rounded-[24px] bg-white p-6 text-sm text-slate-500 shadow-sm">
            No rooms yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
