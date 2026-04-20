import { useEffect, useRef, useState } from 'react'

import { getWebSocketUrl } from '../services/api'

const initialAgentStates = {
  SCOUT: 'idle',
  ANALYST: 'idle',
  CRITIC: 'idle',
  SCRIBE: 'idle',
}

export default function useWebSocket(activeRunId) {
  const [events, setEvents] = useState([])
  const [agentStates, setAgentStates] = useState(initialAgentStates)
  const [connectionState, setConnectionState] = useState('connecting')
  const [lastEvent, setLastEvent] = useState(null)
  const socketRef = useRef(null)
  const retryRef = useRef(null)
  const retryDelayRef = useRef(500)

  const reset = () => {
    setEvents([])
    setAgentStates(initialAgentStates)
    setLastEvent(null)
  }

  useEffect(() => {
    // Reset stream state whenever the active run changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reset()
  }, [activeRunId])

  useEffect(() => {
    let disposed = false

    const connect = () => {
      if (disposed) {
        return
      }

      setConnectionState('connecting')
      const socket = new WebSocket(getWebSocketUrl())
      socketRef.current = socket

      socket.onopen = () => {
        if (disposed) {
          return
        }
        retryDelayRef.current = 500
        setConnectionState('open')
      }

      socket.onmessage = (message) => {
        if (disposed) {
          return
        }

        try {
          const payload = JSON.parse(message.data)
          if (!activeRunId || payload.run_id !== activeRunId) {
            return
          }

          setLastEvent(payload)
          setEvents((previous) => [...previous.slice(-79), { ...payload, received_at: Date.now() }])

          if (payload.agent && payload.agent !== 'NEXUS') {
            setAgentStates((previous) => ({
              ...previous,
              [payload.agent]: payload.status,
            }))
          }
        } catch {
          // Ignore malformed websocket frames.
        }
      }

      socket.onerror = () => {
        if (disposed) {
          return
        }
        setConnectionState('error')
        socket.close()
      }

      socket.onclose = () => {
        if (disposed) {
          return
        }

        setConnectionState('reconnecting')
        const nextDelay = retryDelayRef.current
        retryRef.current = window.setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 5000)
          connect()
        }, nextDelay)
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryRef.current) {
        window.clearTimeout(retryRef.current)
      }
      if (socketRef.current) {
        socketRef.current.onclose = null
        socketRef.current.close()
      }
    }
  }, [activeRunId])

  return {
    events,
    agentStates,
    connectionState,
    lastEvent,
    reset,
  }
}
