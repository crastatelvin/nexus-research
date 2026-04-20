import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useWebSocket from './useWebSocket'

vi.mock('../services/api', () => ({
  getWebSocketUrl: () => 'ws://localhost:8000/ws',
}))

class HookSocket {
  static instances = []

  constructor() {
    HookSocket.instances.push(this)
    setTimeout(() => this.onopen?.(), 0)
  }

  close() {
    this.onclose?.()
  }

  emit(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    HookSocket.instances = []
    globalThis.WebSocket = HookSocket
    window.WebSocket = HookSocket
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters events by run id and reconnects with backoff', async () => {
    const { result } = renderHook(() => useWebSocket('run-7'))

    await act(async () => {
      await vi.runAllTimersAsync()
    })
    expect(result.current.connectionState).toBe('open')

    act(() => {
      HookSocket.instances[0].emit({
        run_id: 'other-run',
        event: 'agent_started',
        agent: 'SCOUT',
        status: 'active',
        message: 'ignore me',
      })
    })
    expect(result.current.events).toHaveLength(0)

    act(() => {
      HookSocket.instances[0].emit({
        run_id: 'run-7',
        event: 'agent_started',
        agent: 'SCOUT',
        status: 'active',
        message: 'keep me',
      })
    })
    expect(result.current.events).toHaveLength(1)
    expect(result.current.agentStates.SCOUT).toBe('active')

    act(() => {
      HookSocket.instances[0].close()
      vi.advanceTimersByTime(500)
    })

    expect(HookSocket.instances.length).toBe(2)
  })
})
