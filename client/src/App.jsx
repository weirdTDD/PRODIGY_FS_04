import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { LobbyScreen } from './features/lobby/LobbyScreen'
import { RoomScreen } from './features/chat/RoomScreen'
import { AuthScreen } from './features/auth/AuthScreen'
import { useAuth } from './hooks/useAuth'
import { useWebSocket } from './hooks/useWebSocket'
import { api } from './services/api'

const getInitials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function AppLayout() {
  const location = useLocation()
  const { token, user, status, error, login, register, logout } = useAuth()
  const { isConnected, lastMessage, sendMessage } = useWebSocket({
    token,
    enabled: Boolean(token),
  })
  const [rooms, setRooms] = useState([])
  const [search, setSearch] = useState('')
  const [notifications, setNotifications] = useState({})

  const activeRoomId = useMemo(() => {
    const match = location.pathname.match(/^\/room\/([^/]+)/)
    return match ? match[1] : null
  }, [location.pathname])

  useEffect(() => {
    let isMounted = true
    api
      .getRooms()
      .then((data) => {
        if (isMounted) {
          setRooms(data.rooms || [])
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'notification:new') {
      const roomId = String(lastMessage.payload?.roomId ?? '')
      if (!roomId || roomId === activeRoomId) return
      setNotifications((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || 0) + 1,
      }))
    }
  }, [activeRoomId, lastMessage])

  useEffect(() => {
    if (lastMessage?.type === 'auth:error') {
      logout()
    }
  }, [lastMessage, logout])

  useEffect(() => {
    if (!activeRoomId) return
    setNotifications((prev) => ({
      ...prev,
      [activeRoomId]: 0,
    }))
  }, [activeRoomId])

  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms
    const query = search.toLowerCase()
    return rooms.filter((room) => room.name.toLowerCase().includes(query))
  }, [rooms, search])

  const handleCreateRoom = async (name) => {
    const trimmed = name.trim()
    if (!trimmed || !token) return
    try {
      const data = await api.createRoom({ name: trimmed }, token)
      setRooms((prev) => [...prev, data.room])
    } catch {
      // handled in UI via auth error banner if needed
    }
  }

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8 lg:px-8 lg:py-12">


        <main className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex items-center gap-3 text-sm text-white/80">
              {token ? (
                <>
                  <span>{user?.email}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-white/60 sm:block" />
                  <span>{isConnected ? 'Live' : 'Offline'}</span>
                  <button
                    onClick={logout}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <span>Sign in to join rooms and chat</span>
              )}
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-100/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.28)] backdrop-blur">
            {token ? (
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
                  element={
                    <RoomScreen
                      rooms={rooms}
                      currentUser={user}
                      socket={{ isConnected, lastMessage, sendMessage }}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
              <AuthScreen
                onLogin={login}
                onRegister={register}
                isLoading={status === 'loading'}
                error={error}
              />
            )}
          </div>
        </main>

        <aside className="w-full shrink-0 lg:w-72">
          <div className="h-full rounded-[32px] bg-blue-500 text-white shadow-[0_24px_60px_rgba(15,23,42,0.3)]">
            <div className="border-b border-white/20 px-5 py-4 text-lg font-semibold">
              Rooms
            </div>
            <div className="flex flex-col gap-4 p-5">
              {filteredRooms.map((room) => {
                const badge = notifications[String(room.id)] || 0
                return (
                  <Link
                    key={room.id}
                    to={`/room/${room.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3 transition hover:bg-white/20"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-sm font-semibold">
                      {getInitials(room.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {room.name}
                      </div>
                      <div className="text-xs text-white/70">
                        {room.description}
                      </div>
                    </div>
                    {badge > 0 && (
                      <span className="ml-auto rounded-full bg-white px-2 py-1 text-xs font-semibold text-blue-600">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
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
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
