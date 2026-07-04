import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useEvents } from './useEvents'
import FleetView from './fleet/FleetView'
import TravelerDetail from './traveler/TravelerDetail'
import OpsView from './ops/OpsView'
import DemoPanel from './demo/DemoPanel'
import GuidedDemo from './demo/GuidedDemo'
import TripReport from './traveler/TripReport'
import ThemeToggle from './ThemeToggle'
import { Wordmark } from './Logo'
import { APP_TAGLINE } from './config'

export default function App() {
  const { state, connected, reload } = useEvents()

  return (
    <>
      <a className="skip-link" href="#main">
        Aller au contenu principal
      </a>
      <header className="app-header">
        <Wordmark />
        <span className="muted app-tagline" aria-hidden="true">
          {APP_TAGLINE}
        </span>
        <nav className="app-nav" aria-label="Vues">
          <NavLink to="/" end>
            Flotte
          </NavLink>
          <NavLink to="/traveler/camille">Expérience voyageur</NavLink>
          <NavLink to="/ops">Centre de contrôle</NavLink>
          <NavLink to="/rapport">Rapport</NavLink>
          <NavLink to="/demo">Démo</NavLink>
        </nav>
        <ThemeToggle />
        <span className="conn-status muted" role="status" aria-live="polite">
          {connected ? '● en direct' : '○ hors ligne'}
        </span>
      </header>

      <main id="main">
        {!state ? (
          <p className="page">Chargement…</p>
        ) : (
          <Routes>
            <Route path="/" element={<FleetView state={state} />} />
            <Route path="/traveler/:id" element={<TravelerDetail state={state} />} />
            <Route path="/ops" element={<OpsView state={state} reload={reload} />} />
            <Route path="/rapport" element={<TripReport state={state} />} />
            <Route path="/demo" element={<DemoPanel state={state} reload={reload} />} />
          </Routes>
        )}
      </main>

      {/* Guided-demo narration overlay (Sprint 4), visible on any view when running */}
      <GuidedDemo reload={reload} />
    </>
  )
}
