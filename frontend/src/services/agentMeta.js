export const AGENT_ORDER = ['SCOUT', 'ANALYST', 'CRITIC', 'SCRIBE']

export const AGENT_META = {
  SCOUT: {
    color: '#f3b44f',
    tone: 'Web reconnaissance',
    description: 'Searches the web and assembles candidate evidence.',
  },
  ANALYST: {
    color: '#5aa6ff',
    tone: 'Evidence extraction',
    description: 'Reads sources and extracts the most relevant findings.',
  },
  CRITIC: {
    color: '#ff6e66',
    tone: 'Adversarial review',
    description: 'Challenges assumptions, gaps, bias, and overreach.',
  },
  SCRIBE: {
    color: '#b189ff',
    tone: 'Report synthesis',
    description: 'Combines the research into a polished final brief.',
  },
}

export const ACTIVE_STATUSES = new Set([
  'active',
  'searching',
  'reading',
  'synthesizing',
  'challenging',
  'writing',
  'running',
])

export const COMPLETE_STATUSES = new Set(['complete'])

