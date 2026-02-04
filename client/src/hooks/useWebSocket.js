import { useCallback, useEffect, useRef, useState } from 'react'

const defaultUrl =
  import.meta.env.VITE_WS_URL || 'ws://localhost:4000'

export function useWebSocket({
  url = defaultUrl,
  token,
  enabled = true,
} = {}) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => {
      setIsConnected(true)
      if (token) {
        socket.send(
          JSON.stringify({
            type: 'auth:token',
            payload: { token },
          }),
        )
      }
    }
    socket.onclose = () => setIsConnected(false)
    socket.onerror = () => setIsConnected(false)

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        setLastMessage(parsed)
      } catch {
        setLastMessage({ type: 'message:raw', payload: event.data })
      }
    }

    return () => {
      socket.close(1000, 'component-unmount')
    }
  }, [enabled, token, url])

  const sendMessage = useCallback((message) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      socket.send(JSON.stringify(message))
      resolve()
    })
  }, [])

  return { isConnected, lastMessage, sendMessage }
}
