import { useCallback, useState } from 'react'

import { createResearchRun, getResearchRun } from '../services/api'

export default function useResearch() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [runId, setRunId] = useState('')
  const [question, setQuestion] = useState('')
  const [depth, setDepth] = useState('standard')
  const [requestedMode, setRequestedMode] = useState('auto')
  const [resolvedMode, setResolvedMode] = useState('')

  const applyRun = useCallback((run) => {
    setLoading(run.status === 'queued' || run.status === 'running')
    setResolvedMode(run.mode || '')
    setResult(run.result || null)
    setError(run.status === 'error' ? run.error || 'Research failed.' : '')
    return run
  }, [])

  const startResearch = useCallback(async ({ question: nextQuestion, depth: nextDepth, mode }) => {
    try {
      setLoading(true)
      setError('')
      setResult(null)
      setResolvedMode('')
      setRunId('')
      setQuestion(nextQuestion)
      setDepth(nextDepth)
      setRequestedMode(mode)

      const response = await createResearchRun({
        question: nextQuestion,
        depth: nextDepth,
        mode,
      })

      setRunId(response.run_id)
      return response
    } catch (requestError) {
      setLoading(false)
      setError(requestError.response?.data?.detail || 'Unable to start the research run.')
      throw requestError
    }
  }, [])

  const fetchRun = useCallback(async (targetRunId) => {
    if (!targetRunId) {
      return null
    }

    try {
      const run = await getResearchRun(targetRunId)
      return applyRun(run)
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        // Backend restarts clear in-memory runs; stop polling stale run ids.
        setLoading(false)
        setResult(null)
        setRunId('')
        setResolvedMode('')
        setError('Run no longer exists on the server. Start a new research run.')
        return null
      }
      setLoading(false)
      setError(requestError.response?.data?.detail || 'Unable to load the research run.')
      return null
    }
  }, [applyRun])

  const reset = useCallback(() => {
    setLoading(false)
    setResult(null)
    setError('')
    setRunId('')
    setQuestion('')
    setDepth('standard')
    setRequestedMode('auto')
    setResolvedMode('')
  }, [])

  return {
    loading,
    result,
    error,
    runId,
    question,
    depth,
    requestedMode,
    resolvedMode,
    startResearch,
    fetchRun,
    reset,
  }
}
