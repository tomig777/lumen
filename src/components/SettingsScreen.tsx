import React, { useId, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, Download, Info, Monitor, RefreshCw } from 'lucide-react'
import { APP_RELEASE } from '../appRelease'
import { updateStatusText } from '../offlineUpdates'
import { setAppTheme, useAppTheme } from '../theme'
import type { SaveState } from '../hooks/useAppStorage'
import type { OfflineShell } from '../hooks/useOfflineShell'
import { ScreenLayoutCheck } from './ScreenLayoutCheck'

type Section = 'main' | 'updates' | 'diagnostics' | 'identity'
const titles: Record<Section, string> = { main: 'Settings', updates: 'App & updates', diagnostics: 'Diagnostics', identity: 'App identity' }

export function AppearancePanel() {
  const theme = useAppTheme()
  const name = useId()
  const [saved, setSaved] = useState(true)
  return <section className="settings-panel" aria-label="Appearance">
    <fieldset className="settings-appearance">
      <legend>Appearance</legend>
      <p>One theme for all of Lumen. Your choice stays on this device when storage is available.</p>
      <div className="settings-theme-options">
        {(['dark', 'light'] as const).map(value => <label key={value} className={theme === value ? 'is-selected' : ''}>
          <input type="radio" name={name} value={value} checked={theme === value} onChange={() => setSaved(setAppTheme(value))} />
          <span>{value === 'dark' ? 'Dark' : 'Light'}</span>
        </label>)}
      </div>
    </fieldset>
    {!saved && <p className="settings-preference-warning" role="status">This theme is active, but this device could not save your choice. It may reset when you reopen Lumen. Your notes and other records are unchanged.</p>}
  </section>
}

export function AppUpdatesPanel({ saveState, offlineShell }: { saveState: SaveState; offlineShell: OfflineShell }) {
  return <section className="backup-panel backup-release-panel" aria-label="App version and updates">
    <span className="eyebrow">LUMEN</span><h2>App & updates</h2>
    <div className="backup-status-row"><span>App version</span><strong>{APP_RELEASE.version}</strong></div>
    <div className="backup-status-row"><span>Build</span><strong>{APP_RELEASE.build === 'local' ? 'Local preview' : APP_RELEASE.build}</strong></div>
    <p>This is the version currently open on this device.</p>
    <div className="backup-update-status" role="status" aria-live="polite">{updateStatusText[offlineShell.status]}</div>
    {offlineShell.lastCheckedAt && <p className="backup-update-time">Last checked {new Date(offlineShell.lastCheckedAt).toLocaleString()}</p>}
    <button className="backup-secondary" type="button" disabled={['checking', 'downloading'].includes(offlineShell.status)} onClick={offlineShell.checkForUpdates}>{offlineShell.status === 'checking' ? 'Checking…' : offlineShell.status === 'downloading' ? 'Downloading…' : 'Check for updates'}</button>
    {offlineShell.updateAvailable && <button className="backup-primary" type="button" disabled={saveState.kind !== 'saved'} onClick={() => { if (saveState.kind === 'saved') offlineShell.applyUpdate() }}>Update Lumen now</button>}
    {offlineShell.updateAvailable && saveState.kind !== 'saved' && <p>Finish saving your changes before updating.</p>}
  </section>
}

export function AppIdentityPanel() {
  return <section className="backup-panel backup-icon-panel" aria-label="Home Screen icon artwork">
    <span className="eyebrow">APP IDENTITY</span><h2>Home Screen icon</h2>
    <div className="backup-icon-preview"><img src="./lumen-icon-v2-180.png" width="72" height="72" alt="Lumen’s amber glass loop on dark brown" /><div><strong>Lumen · Glass loop</strong><span>The icon supplied by this version.</span></div></div>
    <p>iOS controls the installed icon. An older Home Screen icon may stay unchanged after an app update.</p>
    <p>To check the new artwork, open Lumen’s website in Safari and inspect Share → Add to Home Screen. You can cancel without installing. Keep your existing Lumen installation and data.</p>
  </section>
}

export function SettingsScreen({ onBack, onOpenBackup, saveState, offlineShell }: { onBack: () => void; onOpenBackup: () => void; saveState: SaveState; offlineShell: OfflineShell }) {
  const [section, setSection] = useState<Section>('main')
  const heading = useRef<HTMLHeadingElement>(null)
  const scroll = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    scroll.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [section])
  const entries = [
    { title: 'Data & backup', detail: 'Local storage, export and restore', Icon: Download, open: onOpenBackup },
    { title: 'App & updates', detail: `Version ${APP_RELEASE.version} · check for updates`, Icon: RefreshCw, open: () => setSection('updates') },
    { title: 'Diagnostics', detail: 'Screen layout and troubleshooting', Icon: Monitor, open: () => setSection('diagnostics') },
    { title: 'App identity', detail: 'Home Screen icon and installation', Icon: Info, open: () => setSection('identity') },
  ]
  return <main ref={scroll} className="screen-scroll backup-screen settings-screen">
    <header className="page-header has-back">
      <button className="back-button" type="button" aria-label={section === 'main' ? 'Back to Lumen' : 'Back to Settings'} onClick={section === 'main' ? onBack : () => setSection('main')}><ArrowLeft size={18} /></button>
      <div className="page-header-copy"><span className="eyebrow">LUMEN</span><h1 ref={heading} tabIndex={-1}>{titles[section]}</h1>{section === 'main' && <p>A little space for your preferences.</p>}</div>
    </header>
    {section === 'main' && <>
      <AppearancePanel />
      <nav className="settings-links" aria-label="Settings sections">
        {entries.map(({ title, detail, Icon, open }) => <button className="settings-link" type="button" key={title} onClick={open}><Icon size={19} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={17} aria-hidden="true" /></button>)}
      </nav>
      <p className="settings-local-note">Your data stays on this device. Appearance changes do not edit your notes, images or backups.</p>
    </>}
    {section === 'updates' && <AppUpdatesPanel saveState={saveState} offlineShell={offlineShell} />}
    {section === 'diagnostics' && <ScreenLayoutCheck canLeave={saveState.kind === 'saved'} />}
    {section === 'identity' && <AppIdentityPanel />}
  </main>
}
