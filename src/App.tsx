import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ENV } from './config/env'
import { TIMEZONE_GROUPS, detectTimezone } from './constants/timezones'
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

function toDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function toDatetimeString(date: Date): string {
  return `${toDateString(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDatetimePreview(
  date: Date,
  timezone: string,
  isAllDay: boolean,
): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone })
  const monthDay = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  })

  if (isAllDay) {
    return `${weekday}, ${monthDay}`
  }

  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  })

  return `${weekday}, ${monthDay} at ${time}`
}

function timezoneOffsetLabel(timezone: string, date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
  const parts = fmt.formatToParts(date)
  const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  return offset.startsWith('GMT') ? offset : `GMT${offset}`
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
  const [eventDatetime, setEventDatetime] = useState<Date | null>(null)
  const [timezone, setTimezone] = useState(detectTimezone)
  const [isActive, setIsActive] = useState(true)
  const [frequency, setFrequency] = useState<RecurrenceType>('none')
  const [intervalValue, setIntervalValue] = useState(1)
  const [untilAt, setUntilAt] = useState<Date | null>(null)
  const [occurrenceCount, setOccurrenceCount] = useState('')
  const [reminders, setReminders] = useState<ReminderInput[]>([defaultReminder])
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('success')
  const [showSubmitInfo, setShowSubmitInfo] = useState(false)
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false)
  const [showReminderOptions, setShowReminderOptions] = useState(false)

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
        event_date: isAllDay && eventDatetime ? toDateString(eventDatetime) : null,
        event_at: !isAllDay && eventDatetime ? toDatetimeString(eventDatetime) : null,
        timezone,
        is_active: isActive,
      },
      recurrence: {
        frequency,
        interval_value: intervalValue,
        until_at: untilAt ? toDatetimeString(untilAt) : null,
        occurrence_count: occurrenceCount ? Number(occurrenceCount) : null,
      },
      reminders: reminders.map((r) => ({
        offset_minutes: r.offsetMinutes,
        message_template: r.messageTemplate || null,
        is_active: r.isActive,
      })),
    }),
    [
      type,
      title,
      description,
      isAllDay,
      eventDatetime,
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

  const handleEventTypeChange = (nextType: EventType) => {
    setType(nextType)

    if (nextType === 'birthday') {
      setTitle('Happy Birthday!!! \u{1F382}\u{1F389}\u{1F382}')
      setDescription('Don\u2019t forget to wish them a happy birthday!')
      setIsAllDay(true)
      setEventDatetime(new Date())
      setFrequency('yearly')
      setIntervalValue(1)
      setUntilAt(null)
      setOccurrenceCount('')
      setReminders([
        { offsetMinutes: -1440, messageTemplate: '', isActive: true },
        { offsetMinutes: 0, messageTemplate: '', isActive: true },
      ])
      return
    }

    if (nextType === 'reminder') {
      setTitle('Time to\u2026')
      setDescription('')
      setIsAllDay(false)
      setEventDatetime(new Date(Date.now() + 5 * 60 * 1000))
      setFrequency('none')
      setIntervalValue(1)
      setUntilAt(null)
      setOccurrenceCount('')
      setReminders([defaultReminder])
      return
    }

    setTitle('')
    setDescription('')
    setIsAllDay(false)
    setEventDatetime(null)
    setFrequency('none')
    setIntervalValue(1)
    setUntilAt(null)
    setOccurrenceCount('')
    setReminders([defaultReminder])
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

  const referenceDate = useMemo(() => new Date(), [])

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
              <select value={type} onChange={(e) => handleEventTypeChange(e.target.value as EventType)}>
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
            <label className="full event-date-label">
              Event Date &amp; Time
              <div className="date-row">
                <DatePicker
                  required
                  selected={eventDatetime}
                  onChange={(date: Date | null) => setEventDatetime(date)}
                  showTimeSelect={!isAllDay}
                  showTimeSelectOnly={false}
                  timeIntervals={15}
                  dateFormat={isAllDay ? 'MMMM d, yyyy' : 'MMMM d, yyyy h:mm aa'}
                  timeCaption="Time"
                  isClearable
                  placeholderText="Select date and time"
                  className="date-picker-input"
                  calendarClassName="date-picker-calendar"
                />
                <label className="all-day-toggle">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                  />
                  All day
                </label>
              </div>
              {eventDatetime && (
                <small className="field-help datetime-preview">
                  {formatDatetimePreview(eventDatetime, timezone, isAllDay)} ({timezoneOffsetLabel(timezone, eventDatetime)})
                </small>
              )}
            </label>
            <label>
              Timezone
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONE_GROUPS.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.options.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <small className="field-help timezone-offset">
                {timezoneOffsetLabel(timezone, referenceDate)}
              </small>
            </label>
            <label>
              Active Event
              <select value={String(isActive)} onChange={(e) => setIsActive(e.target.value === 'true')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="section-head optional-section-head">
            <div>
              <h2>
                Recurrence <span className="optional-pill">Optional</span>
              </h2>
              <p className="hint optional-summary">
                {frequency === 'none' ? 'No repeat configured.' : `Repeats ${frequency} every ${intervalValue}.`}
              </p>
            </div>
            <button type="button" className="secondary" onClick={() => setShowRecurrenceOptions((current) => !current)}>
              {showRecurrenceOptions ? 'Hide recurrence' : 'Show recurrence'}
            </button>
          </div>
          {showRecurrenceOptions ? (
            <>
              <p className="hint">
                Optional settings for repeated events. Use <strong>none</strong> for one-time events.
              </p>
              <div className="grid two optional-panel">
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
                  <DatePicker
                    selected={untilAt}
                    onChange={(date: Date | null) => setUntilAt(date)}
                    showTimeSelect
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    timeCaption="Time"
                    isClearable
                    placeholderText="No end date"
                    className="date-picker-input"
                    calendarClassName="date-picker-calendar"
                  />
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
            </>
          ) : null}
        </section>

        <section className="card">
          <div className="section-head optional-section-head">
            <div>
              <h2>
                Reminders <span className="optional-pill">Optional</span>
              </h2>
              <p className="hint optional-summary">
                {reminders.length} {reminders.length === 1 ? 'reminder' : 'reminders'} configured.
              </p>
            </div>
            <button type="button" className="secondary" onClick={() => setShowReminderOptions((current) => !current)}>
              {showReminderOptions ? 'Hide reminders' : 'Show reminders'}
            </button>
          </div>
          {showReminderOptions ? (
            <>
              <p className="hint">
                Optional reminder customizations. Negative offset = before, 0 = exactly at event time, positive offset =
                after.
              </p>
              <button type="button" className="secondary add-reminder-button" onClick={addReminder}>
                Add reminder
              </button>
              <div className="stack optional-panel">
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
            </>
          ) : null}
        </section>

        <section className="card">
          <h2>Submit</h2>
          {/* <p className="hint">Request target: {ENV.apiBaseUrl}/api/v1/events</p> */}
          <div className="submit-actions">
            <button type="submit" className="primary">
              Create Event
            </button>
            <button type="button" className="secondary" onClick={() => setShowSubmitInfo((current) => !current)}>
              {showSubmitInfo ? 'Hide submit info' : 'Show submit info'}
            </button>
          </div>
          {submitMessage ? <p className={`submit-message ${submitStatus}`}>{submitMessage}</p> : null}
          {showSubmitInfo ? <pre>{JSON.stringify(payloadPreview, null, 2)}</pre> : null}
        </section>
      </form>
    </main>
  )
}

export default App
