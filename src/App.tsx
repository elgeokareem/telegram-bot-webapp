import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ENV } from './config/env'
import './App.css'

type EventType = 'birthday' | 'reminder' | 'custom'
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

type ReminderInput = {
  offsetMinutes: number
  messageTemplate: string
  isActive: boolean
}

type TelegramContext = {
  chatId: number | null
  createdByUserId: number | null
  initData: string
  contextToken: string
}

type SubmitStatus = 'success' | 'error'

const defaultReminder: ReminderInput = {
  offsetMinutes: 0,
  messageTemplate: '',
  isActive: true,
}

const getSubmitErrorMessage = (error?: string) => {
  if (!error) {
    return 'Failed to create event. Check API response.'
  }

  if (error.includes('Telegram WebApp context') || error.includes('verified Telegram context')) {
    return 'Open this form from the fresh /new_event link in Telegram so the bot can attach the chat context.'
  }

  return error
}

function App() {
  const [type, setType] = useState<EventType>('custom')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventAt, setEventAt] = useState('')
  const [timezone, setTimezone] = useState(ENV.defaultTimezone)
  const [isActive, setIsActive] = useState(true)
  const [frequency, setFrequency] = useState<RecurrenceType>('none')
  const [intervalValue, setIntervalValue] = useState(1)
  const [untilAt, setUntilAt] = useState('')
  const [occurrenceCount, setOccurrenceCount] = useState('')
  const [reminders, setReminders] = useState<ReminderInput[]>([defaultReminder])
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('success')

  const telegramContext = useMemo<TelegramContext>(() => {
    const telegram = (window as { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: unknown } } }).Telegram?.WebApp
    const initData = telegram?.initDataUnsafe as
      | { user?: { id?: number }; chat?: { id?: number } }
      | undefined

    return {
      chatId: typeof initData?.chat?.id === 'number' ? initData.chat.id : null,
      createdByUserId: typeof initData?.user?.id === 'number' ? initData.user.id : null,
      initData: telegram?.initData ?? '',
      contextToken: new URLSearchParams(window.location.search).get('ctx') ?? '',
    }
  }, [])

  const payloadPreview = useMemo(
    () => ({
      event: {
        chat_id: null,
        created_by_user_id: null,
        target_user_id: null,
        type,
        title,
        description: description || null,
        is_all_day: isAllDay,
        event_date: isAllDay ? eventDate || null : null,
        event_at: isAllDay ? null : eventAt || null,
        timezone,
        is_active: isActive,
      },
      recurrence: {
        frequency,
        interval_value: intervalValue,
        until_at: untilAt || null,
        occurrence_count: occurrenceCount ? Number(occurrenceCount) : null,
      },
      reminders: reminders.map((r) => ({
        offset_minutes: r.offsetMinutes,
        message_template: r.messageTemplate || null,
        is_active: r.isActive,
      })),
    }),
    [
      telegramContext,
      type,
      title,
      description,
      isAllDay,
      eventDate,
      eventAt,
      timezone,
      isActive,
      frequency,
      intervalValue,
      untilAt,
      occurrenceCount,
      reminders,
    ],
  )

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${ENV.apiBaseUrl}/api/v1/telemetry/page-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: window.location.pathname,
        source: 'webapp',
      }),
      signal: controller.signal,
    }).catch(() => {
      // ignore telemetry failures
    })

    return () => {
      controller.abort()
    }
  }, [])

  const handleReminderChange = (index: number, field: keyof ReminderInput, value: string | boolean) => {
    setReminders((current) =>
      current.map((item, i) => {
        if (i !== index) {
          return item
        }

        if (field === 'offsetMinutes') {
          return { ...item, offsetMinutes: Number(value) }
        }

        if (field === 'isActive') {
          return { ...item, isActive: Boolean(value) }
        }

        return { ...item, messageTemplate: String(value) }
      }),
    )
  }

  const addReminder = () => {
    setReminders((current) => [...current, defaultReminder])
  }

  const removeReminder = (index: number) => {
    setReminders((current) => {
      if (current.length === 1) {
        return current
      }
      return current.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitMessage('')
    setSubmitStatus('success')

    if (!telegramContext.initData && !telegramContext.contextToken) {
      setSubmitStatus('error')
      setSubmitMessage('Open this form from the fresh /new_event link in Telegram so the bot can attach the chat context.')
      return
    }

    try {
      const response = await fetch(`${ENV.apiBaseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': telegramContext.initData,
          'X-WebApp-Context': telegramContext.contextToken,
        },
        body: JSON.stringify(payloadPreview),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
        setSubmitStatus('error')
        setSubmitMessage(getSubmitErrorMessage(body?.error))
        return
      }

      setSubmitStatus('success')
      setSubmitMessage('Event created successfully.')
    } catch {
      setSubmitStatus('error')
      setSubmitMessage('Unable to reach server. Verify VITE_API_BASE_URL.')
    }
  }

  return (
    <main className="layout">
      {submitMessage ? <div className={`toast ${submitStatus}`} role="status">{submitMessage}</div> : null}
      <header className="hero">
        <p className="eyebrow">{ENV.appName}</p>
        <h1>Create Event</h1>
        <p className="subtitle">Fill event, recurrence, and reminder fields in one place.</p>
      </header>

      <form className="event-form" onSubmit={handleSubmit}>
        <section className="card">
          <h2>Event</h2>
          <p className="hint">
            Chat and creator IDs are inferred from Telegram WebApp context and are not manually entered.
          </p>
          <p className="hint">
            Source context: chat {telegramContext.chatId ?? 'signed link'} - user {telegramContext.createdByUserId ?? 'signed link'}
          </p>
          <div className="grid two">
            <label>
              Event Type
              <select value={type} onChange={(e) => setType(e.target.value as EventType)}>
                <option value="birthday">Birthday</option>
                <option value="reminder">Reminder</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="full">
              Title
              <input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="full">
              Description
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              Timezone
              <input required value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
            </label>
            <label>
              Active Event
              <select value={String(isActive)} onChange={(e) => setIsActive(e.target.value === 'true')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label>
              All-day Event
              <select value={String(isAllDay)} onChange={(e) => setIsAllDay(e.target.value === 'true')}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            {isAllDay ? (
              <label>
                Event Date
                <input required type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </label>
            ) : (
              <label>
                Event At
                <input
                  required
                  type="datetime-local"
                  value={eventAt}
                  onChange={(e) => setEventAt(e.target.value)}
                />
              </label>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Recurrence</h2>
          <p className="hint">
            Recurrence controls how often the same event repeats. Use <strong>none</strong> for one-time events.
          </p>
          <div className="grid two">
            <label>
              Frequency
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceType)}>
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label>
              Interval Value
              <input
                min={1}
                required
                type="number"
                value={intervalValue}
                onChange={(e) => setIntervalValue(Number(e.target.value))}
              />
              <small className="field-help">
                Multiplier of the selected frequency. Example: weekly + 2 means every 2 weeks.
              </small>
            </label>
            <label>
              Until At (optional)
              <input type="datetime-local" value={untilAt} onChange={(e) => setUntilAt(e.target.value)} />
              <small className="field-help">Stop generating future occurrences after this date/time.</small>
            </label>
            <label>
              Occurrence Count (optional)
              <input
                min={1}
                type="number"
                value={occurrenceCount}
                onChange={(e) => setOccurrenceCount(e.target.value)}
              />
              <small className="field-help">
                Maximum number of times this event can repeat (leave empty for no count limit).
              </small>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Reminders</h2>
            <button type="button" className="secondary" onClick={addReminder}>
              Add reminder
            </button>
          </div>
          <p className="hint">
            Each reminder is relative to each event occurrence. Negative offset = before, 0 = exactly at event time,
            positive offset = after.
          </p>
          <div className="stack">
            {reminders.map((reminder, index) => (
              <div className="reminder-row" key={index}>
                <label>
                  Offset Minutes
                  <input
                    type="number"
                    value={reminder.offsetMinutes}
                    onChange={(e) => handleReminderChange(index, 'offsetMinutes', e.target.value)}
                  />
                </label>
                <label>
                  Message Template (optional)
                  <input
                    value={reminder.messageTemplate}
                    onChange={(e) => handleReminderChange(index, 'messageTemplate', e.target.value)}
                  />
                </label>
                <label>
                  Active
                  <select
                    value={String(reminder.isActive)}
                    onChange={(e) => handleReminderChange(index, 'isActive', e.target.value === 'true')}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <button type="button" className="danger" onClick={() => removeReminder(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Submit</h2>
          <p className="hint">Request target: {ENV.apiBaseUrl}/api/v1/events</p>
          <button type="submit" className="primary">
            Create Event
          </button>
          {submitMessage ? <p className={`submit-message ${submitStatus}`}>{submitMessage}</p> : null}
          <pre>{JSON.stringify(payloadPreview, null, 2)}</pre>
        </section>
      </form>
    </main>
  )
}

export default App
