import React, { useState } from 'react'
import { APP_RELEASE } from '../appRelease'
import { formatScreenLayoutReport, readScreenLayout } from '../screenLayout'

export function ScreenLayoutCheck() {
  const [report, setReport] = useState('')
  const [message, setMessage] = useState('')
  const measure = () => {
    setMessage('')
    try {
      setReport(formatScreenLayoutReport(readScreenLayout(APP_RELEASE)))
    } catch {
      setReport('')
      setMessage('Could not read the screen layout. Nothing was changed; please send a screenshot instead.')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setMessage('Layout report copied. Paste it into our chat to help diagnose the bottom strip.')
    } catch {
      setMessage('Copy is unavailable here. Select the report text or send a screenshot of it instead.')
    }
  }
  return <section className="backup-panel backup-layout-panel" aria-label="Screen layout diagnostics">
    <span className="eyebrow">TROUBLESHOOTING</span>
    <h2>Screen layout</h2>
    <p>Read this phone’s screen sizes to investigate the bottom strip. No notes, photos, or personal records are included. Nothing is sent automatically.</p>
    <button className="backup-secondary" type="button" aria-expanded={!!report} aria-controls={report ? 'screen-layout-report' : undefined} onClick={measure}>{report ? 'Refresh screen layout' : 'Check screen layout'}</button>
    {report && <>
      <pre id="screen-layout-report" className="backup-layout-report" aria-label="Screen layout report">{report}</pre>
      <button className="backup-primary" type="button" onClick={() => void copy()}>Copy layout report</button>
    </>}
    {message && <p role="status">{message}</p>}
  </section>
}
