import React from 'react'
import { useEffect, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

const exampleQuestions = [
  'How are research teams using AI in due diligence?',
  'What is changing in enterprise knowledge management?',
  'How should leaders evaluate AI copilots for analysts?',
]

export default function SearchBar({
  onSearch,
  loading,
  compact = false,
  initialQuestion = '',
  initialDepth = 'standard',
  initialMode = 'auto',
}) {
  const [question, setQuestion] = useState(initialQuestion)
  const [depth, setDepth] = useState(initialDepth)
  const [mode, setMode] = useState(initialMode)

  useEffect(() => {
    // Sync externally-provided starter values into local draft state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestion(initialQuestion)
  }, [initialQuestion])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDepth(initialDepth)
  }, [initialDepth])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initialMode)
  }, [initialMode])

  const submit = () => {
    const trimmed = question.trim()
    if (!trimmed || loading) {
      return
    }
    onSearch({ question: trimmed, depth, mode })
  }

  return (
    <div className="space-y-4">
      <div className={`field-shell ${compact ? 'p-3' : 'p-4 md:p-5'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-2">
            <label className="label-eyebrow">Research Question</label>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  submit()
                }
              }}
              placeholder="Ask NEXUS a research question..."
              className="min-h-28 w-full resize-none bg-transparent text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              disabled={loading}
            />
          </div>

          <div className="grid gap-3 lg:w-[240px]">
            <div className="space-y-2">
              <label className="label-eyebrow">Depth</label>
              <select
                value={depth}
                onChange={(event) => setDepth(event.target.value)}
                disabled={loading}
                className="select-shell"
              >
                <option value="standard">Standard</option>
                <option value="deep">Deep</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label-eyebrow">Mode</label>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                disabled={loading}
                className="select-shell"
              >
                <option value="auto">Auto</option>
                <option value="live">Live Groq</option>
                <option value="demo">Demo</option>
              </select>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={submit}
              disabled={loading || !question.trim()}
              className="action-button"
            >
              {loading ? 'Research Running...' : 'Start Research'}
            </motion.button>
          </div>
        </div>
      </div>

      {!compact && !loading ? (
        <div className="flex flex-wrap gap-2">
          {exampleQuestions.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuestion(example)}
              className="pill pill-muted"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

