import { useMemo, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { LobbyScreen } from './features/lobby/LobbyScreen'
import { RoomScreen } from './features/chat/RoomScreen'

const seedRooms = [
  {
    id: 'dogs',
    name: 'Dog Lovers',
    description:
      'A community for dog lovers to share stories, tips, and photos.',
  },
  {
    id: 'devs',
    name: 'Developers',
    description: 'Share code, ideas, and debugging wins together.',
  },
  {
    id: 'foodies',
    name: 'Foodies',
    description: 'For people who love recipes, reviews, and cooking tips.',
  },
  {
    id: 'bookworms',
    name: 'Bookworms',
    description: 'Discuss books, series, and reading goals.',
  },
  {
    id: 'movies',
    name: 'Movie Buffs',
    description: 'Trailers, reviews, and watch party planning.',
  },
]

const getInitials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function App() {
  const [rooms, setRooms] = useState(seedRooms)
  const [search, setSearch] = useState('')

  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms
    const query = search.toLowerCase()
    return rooms.filter((room) => room.name.toLowerCase().includes(query))
  }, [rooms, search])

  const handleCreateRoom = (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const slug =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || Date.now().toString()

    setRooms((prev) => [
      ...prev,
      {
        id: slug,
        name: trimmed,
        description: 'New room created just now.',
      },
    ])
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen text-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8 lg:px-8 lg:py-12">
          <aside className="hidden h-[640px] w-20 flex-col items-center gap-6 rounded-[28px] bg-zinc-900 py-6 shadow-2xl lg:flex">
            <div className="flex h-12 px-2 w-16 items-center justify-center rounded-2xl bg-blue-500 text-sm font-semibold text-white shadow-lg">
              Vibely
            </div>
            <nav className="flex flex-col gap-4">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 11l9-7 9 7" />
                  <path d="M9 22V12h6v10" />
                </svg>
              </NavLink>
            </nav>
            <div className="mt-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M4.93 4.93l2.83 2.83" />
                <path d="M16.24 16.24l2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="M4.93 19.07l2.83-2.83" />
                <path d="M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              {/*Search Iput Area*/}
              <div className="flex w-full max-w-md items-center gap-3 rounded-full bg-white px-4 py-3 shadow-sm">
                <input
                  type="text"
                  placeholder="Search rooms"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none border-none rounded-full"
                />
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition hover:bg-blue-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </button>
              </div>
              <div className="text-sm text-white/80">
                Choose a room and start chatting
              </div>
            </div>

            <div className="rounded-[32px] bg-slate-100/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.28)] backdrop-blur">
              <Routes>
                <Route
                  path="/"
                  element={
                    <LobbyScreen
                      rooms={filteredRooms}
                      onCreateRoom={handleCreateRoom}
                    />
                  }
                />
                <Route
                  path="/room/:roomId"
                  element={<RoomScreen rooms={rooms} />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>

          <aside className="w-full shrink-0 lg:w-72">
            <div className="h-full rounded-[32px] bg-blue-500 text-white shadow-[0_24px_60px_rgba(15,23,42,0.3)]">
              <div className="border-b border-white/20 px-5 py-4 text-lg font-semibold">
                Rooms
              </div>
              <div className="flex flex-col gap-4 p-5">
                {filteredRooms.map((room) => (
                  <Link
                    key={room.id}
                    to={`/room/${room.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3 transition hover:bg-white/20"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-sm font-semibold">
                      {getInitials(room.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {room.name}
                      </div>
                      <div className="text-xs text-white/70">
                        {room.description}
                      </div>
                    </div>
                  </Link>
                ))}
                {filteredRooms.length === 0 && (
                  <div className="rounded-2xl bg-white/10 px-3 py-4 text-sm text-white/80">
                    No rooms match that search.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
