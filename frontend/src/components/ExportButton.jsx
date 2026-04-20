import React from 'react'
import { useState } from 'react'

function sanitizeFilename(question) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'research'
}

const COLORS = {
  text: [24, 31, 46],
  soft: [70, 84, 112],
  muted: [120, 132, 156],
  accent: [179, 120, 44],
  border: [222, 228, 238],
  panelBg: [248, 250, 253],
  accentBg: [253, 246, 228],
}

const PAGE = { width: 210, height: 297, margin: 18 }

function createPdfBuilder(pdf) {
  const contentWidth = PAGE.width - PAGE.margin * 2
  let cursorY = PAGE.margin

  const ensureSpace = (needed) => {
    if (cursorY + needed > PAGE.height - PAGE.margin) {
      pdf.addPage()
      cursorY = PAGE.margin
    }
  }

  const setColor = ([r, g, b]) => pdf.setTextColor(r, g, b)
  const setFill = ([r, g, b]) => pdf.setFillColor(r, g, b)
  const setDraw = ([r, g, b]) => pdf.setDrawColor(r, g, b)

  const drawText = (text, { size = 10, font = 'helvetica', style = 'normal', color = COLORS.text, lineHeight = 1.45, indent = 0 } = {}) => {
    if (!text) return
    pdf.setFont(font, style)
    pdf.setFontSize(size)
    setColor(color)
    const lines = pdf.splitTextToSize(String(text), contentWidth - indent)
    const lineSpacing = (size / pdf.internal.scaleFactor) * lineHeight
    lines.forEach((line) => {
      ensureSpace(lineSpacing)
      pdf.text(line, PAGE.margin + indent, cursorY + lineSpacing * 0.78)
      cursorY += lineSpacing
    })
  }

  const addSpace = (mm) => {
    cursorY += mm
  }

  const drawEyebrow = (label) => {
    ensureSpace(6)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    setColor(COLORS.accent)
    pdf.text(label.toUpperCase(), PAGE.margin, cursorY + 3.5)
    cursorY += 5
  }

  const drawHeading = (text, size = 18) => {
    drawText(text, { size, style: 'bold', color: COLORS.text, lineHeight: 1.25 })
    addSpace(1.5)
  }

  const drawSubheading = (text) => {
    drawText(text, { size: 12, style: 'bold', color: COLORS.text, lineHeight: 1.3 })
    addSpace(1)
  }

  const drawBody = (text, opts = {}) => {
    drawText(text, { size: 10, color: COLORS.soft, lineHeight: 1.55, ...opts })
  }

  const drawDivider = () => {
    ensureSpace(4)
    setDraw(COLORS.border)
    pdf.setLineWidth(0.2)
    pdf.line(PAGE.margin, cursorY + 1, PAGE.width - PAGE.margin, cursorY + 1)
    cursorY += 4
  }

  const drawCallout = (items, { numbered = false, color = COLORS.panelBg } = {}) => {
    items.forEach((raw, index) => {
      const text = String(raw).trim()
      if (!text) return
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      const prefix = numbered ? `${index + 1}.  ` : '•  '
      const wrapped = pdf.splitTextToSize(prefix + text, contentWidth - 8)
      const lineSpacing = 4.8
      const blockHeight = wrapped.length * lineSpacing + 4
      ensureSpace(blockHeight + 2)

      setFill(color)
      pdf.roundedRect(PAGE.margin, cursorY, contentWidth, blockHeight, 2.5, 2.5, 'F')

      setColor(COLORS.text)
      wrapped.forEach((line, i) => {
        pdf.text(line, PAGE.margin + 4, cursorY + 5 + i * lineSpacing)
      })
      cursorY += blockHeight + 2
    })
  }

  const drawCoverHeader = (question, meta) => {
    setFill(COLORS.accentBg)
    pdf.roundedRect(PAGE.margin, cursorY, contentWidth, 34, 3, 3, 'F')
    const innerX = PAGE.margin + 6

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    setColor(COLORS.accent)
    pdf.text('NEXUS RESEARCH BRIEF', innerX, cursorY + 7)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    setColor(COLORS.text)
    const wrapped = pdf.splitTextToSize(question || 'Research Report', contentWidth - 12)
    const shown = wrapped.slice(0, 2)
    shown.forEach((line, i) => {
      pdf.text(line, innerX, cursorY + 14 + i * 6)
    })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    setColor(COLORS.muted)
    pdf.text(meta, innerX, cursorY + 30)

    cursorY += 40
  }

  const addPageFooters = (title) => {
    const total = pdf.internal.getNumberOfPages()
    for (let i = 1; i <= total; i += 1) {
      pdf.setPage(i)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      setColor(COLORS.muted)
      pdf.text(title, PAGE.margin, PAGE.height - 8)
      pdf.text(`${i} / ${total}`, PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' })
    }
  }

  return {
    addSpace,
    drawEyebrow,
    drawHeading,
    drawSubheading,
    drawBody,
    drawDivider,
    drawCallout,
    drawCoverHeader,
    addPageFooters,
  }
}

function buildReportPdf({ question, report, sources }) {
  // Lazy-load jsPDF so the initial bundle stays small.
  return import('jspdf').then(({ jsPDF }) => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const b = createPdfBuilder(pdf)

    const now = new Date()
    const dateLabel = now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const metaLine = `Generated ${dateLabel} · ${sources?.length || 0} sources cited`

    b.drawCoverHeader(question, metaLine)

    const textSections = [
      ['Executive Summary', report?.executive_summary],
      ['Background', report?.background],
      ['Analysis', report?.analysis],
      ['Critical Perspectives', report?.critical_perspectives],
      ['Conclusion', report?.conclusion],
    ]

    textSections.forEach(([label, content]) => {
      const text = (content || '').trim()
      if (!text) return
      b.drawEyebrow(label)
      b.drawBody(text)
      b.addSpace(4)
      b.drawDivider()
    })

    if (report?.key_findings?.length) {
      b.drawEyebrow('Key Findings')
      b.drawCallout(report.key_findings, { numbered: true })
      b.addSpace(4)
      b.drawDivider()
    }

    if (report?.recommendations?.length) {
      b.drawEyebrow('Recommendations')
      b.drawCallout(report.recommendations)
      b.addSpace(4)
      b.drawDivider()
    }

    if (sources?.length) {
      b.drawEyebrow('Cited Sources')
      sources.forEach((source, index) => {
        b.drawSubheading(`${String(index + 1).padStart(2, '0')}. ${source.title || 'Untitled source'}`)
        if (source.url) {
          b.drawBody(source.url, { color: COLORS.accent, size: 9 })
        }
        if (source.snippet) {
          b.drawBody(source.snippet, { size: 9 })
        }
        b.addSpace(2)
      })
    }

    b.addPageFooters('NEXUS Research · Multi-Agent Brief')
    return pdf
  })
}

export default function ExportButton({ question, report, sources, ready = false }) {
  const [exporting, setExporting] = useState(false)
  const [errorLabel, setErrorLabel] = useState(null)

  const handleExport = async () => {
    if (!ready || !report || exporting) {
      return
    }
    setExporting(true)
    setErrorLabel(null)
    try {
      const pdf = await buildReportPdf({ question, report, sources: sources || [] })
      pdf.save(`nexus-report-${sanitizeFilename(question)}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF', error)
      setErrorLabel('Export failed')
      setTimeout(() => setErrorLabel(null), 2500)
    } finally {
      setExporting(false)
    }
  }

  const label = errorLabel || (exporting ? 'Exporting…' : 'Export PDF')

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!ready || exporting || !report}
      className="ghost-button inline-flex items-center gap-2"
      title={ready ? 'Download the report as a PDF' : 'Report not ready yet'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      {label}
    </button>
  )
}
