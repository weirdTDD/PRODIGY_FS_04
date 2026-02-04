# Chat App (WebSocket + REST)

**Overview**
This is a full-stack chat application with a React client and an Express + WebSocket server. It supports JWT authentication, room membership, message history, typing indicators, and room notifications.

**Features**
- Email/password authentication with JWT (access + refresh tokens).
- WebSocket real-time messaging.
- Room membership with join/leave flows.
- Message history loading on room enter.
- Typing indicators for active rooms.
- Notifications for rooms you are not currently viewing.
- SQLite storage (users, rooms, memberships, messages).

**Project Structure**
- `client/` React app (Vite + Tailwind).
- `server/` Express API + WebSocket server.
- `server/src/database.js` SQLite schema and seed data.
- `server/src/auth/` Auth logic and routes.

**Quick Start**
1. Install dependencies:
   - `cd client && npm install`
   - `cd server && npm install`
2. Create the server env file:
   - `server/.env`
3. Start the server:
   - `cd server && npm run dev`
4. Start the client:
   - `cd client && npm run dev`
5. Open the client:
   - `http://localhost:3000`

**Environment**
Create `server/.env` with:
```
JWT_SECRET=your-long-random-secret
CLIENT_URL=http://localhost:3000
```

**Scripts**
Server (`server/`):
- `npm run dev` start server with nodemon
- `npm run start` start server

Client (`client/`):
- `npm run dev` start Vite dev server
- `npm run build` build production bundle
- `npm run preview` preview build

**REST API**
Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `GET /api/auth/profile`

User:
- `GET /api/me` (requires `Authorization: Bearer <token>`)

Rooms:
- `GET /api/rooms`
- `GET /api/rooms/joined` (auth)
- `POST /api/rooms` (auth)
- `POST /api/rooms/:roomId/join` (auth)

**WebSocket Events**
Client → Server:
- `auth:token` `{ token }`
- `room:join` `{ roomId }`
- `room:enter` `{ roomId, limit }`
- `room:leave` `{ roomId }`
- `message:send` `{ roomId, text, tempId }`
- `message:history` `{ roomId, limit }`
- `typing:start` `{ roomId }`
- `typing:stop` `{ roomId }`

Server → Client:
- `auth:ok` `{ user, rooms }`
- `auth:error`
- `auth:required`
- `room:joined`
- `room:join_required`
- `message:new`
- `message:ack`
- `message:history`
- `typing:update`
- `notification:new`

**Notes**
- The server uses SQLite at `server/data/chat.db` (created automatically).
- Default rooms are seeded if the rooms table is empty.
- `.env` should remain untracked (ensure it is in `.gitignore`).

**Troubleshooting**
- If the client is blank, confirm `client/index.html` exists and `npm run dev` is running.
- If auth fails, verify `JWT_SECRET` is set and the server was restarted.
