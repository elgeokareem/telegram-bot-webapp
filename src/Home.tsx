import { Link } from '@tanstack/react-router'

function Home() {
  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">Bot Telegram Events</p>
        <h1>Welcome to the Web App</h1>
        <p className="subtitle">
          This frontend is the event management interface used by your Telegram bot ecosystem.
        </p>
      </header>

      <section className="card">
        <h2>Routes</h2>
        <ul className="route-list">
          <li>
            <code>/</code> - this home page with route/action references
          </li>
          <li>
            <code>/events-new</code> - create event form (event + recurrence + reminders)
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Actions</h2>
        <ul className="route-list">
          <li>Create events with all required fields for your database schema</li>
          <li>Create recurrence rules for each event</li>
          <li>Create one or multiple reminders per event</li>
          <li>Send payload to server endpoint <code>/api/v1/events</code></li>
          <li>Track page views with <code>/api/v1/telemetry/page-view</code></li>
        </ul>
      </section>

      <section className="card">
        <h2>Quick Start</h2>
        <p className="subtitle">Open the event form to create a new event record.</p>
        <p>
          <Link className="primary-link" to="/events-new">
            Go to /events-new
          </Link>
        </p>
      </section>
    </main>
  )
}

export default Home
