import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('')

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          WebSocket Chat App
        </h1>
        
        <div className="space-y-4">
          <div className="border rounded p-4">
            {/* Messages will go here */}
            <div className="text-gray-600">Messages will appear here</div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 border rounded p-2"
              placeholder="Type a message..."
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => console.log('Send:', message)}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App