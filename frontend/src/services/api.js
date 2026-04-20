import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const websocketURL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

const api = axios.create({
  baseURL,
  timeout: 120000,
})

export async function createResearchRun(payload) {
  const response = await api.post('/research', payload)
  return response.data
}

export async function getResearchRun(runId) {
  const response = await api.get(`/research/${runId}`)
  return response.data
}

export async function getLatestResearch() {
  const response = await api.get('/latest')
  return response.data
}

export function getWebSocketUrl() {
  return websocketURL
}

