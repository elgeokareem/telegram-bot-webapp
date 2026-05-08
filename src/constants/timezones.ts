export type TimezoneOption = {
  value: string
  label: string
}

export type TimezoneGroup = {
  region: string
  options: TimezoneOption[]
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    region: 'Americas',
    options: [
      { value: 'America/New_York', label: 'Eastern (New York)' },
      { value: 'America/Chicago', label: 'Central (Chicago)' },
      { value: 'America/Denver', label: 'Mountain (Denver)' },
      { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
      { value: 'America/Mexico_City', label: 'Mexico City' },
      { value: 'America/Sao_Paulo', label: 'São Paulo' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
      { value: 'America/Bogota', label: 'Bogotá' },
      { value: 'America/Lima', label: 'Lima' },
      { value: 'America/Santiago', label: 'Santiago' },
      { value: 'America/Caracas', label: 'Caracas' },
    ],
  },
  {
    region: 'Europe',
    options: [
      { value: 'Europe/London', label: 'London' },
      { value: 'Europe/Paris', label: 'Paris' },
      { value: 'Europe/Berlin', label: 'Berlin' },
      { value: 'Europe/Madrid', label: 'Madrid' },
      { value: 'Europe/Rome', label: 'Rome' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam' },
      { value: 'Europe/Moscow', label: 'Moscow' },
      { value: 'Europe/Istanbul', label: 'Istanbul' },
    ],
  },
  {
    region: 'Asia & Middle East',
    options: [
      { value: 'Asia/Dubai', label: 'Dubai' },
      { value: 'Asia/Tehran', label: 'Tehran' },
      { value: 'Asia/Kolkata', label: 'Kolkata' },
      { value: 'Asia/Bangkok', label: 'Bangkok' },
      { value: 'Asia/Singapore', label: 'Singapore' },
      { value: 'Asia/Shanghai', label: 'Shanghai' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Asia/Seoul', label: 'Seoul' },
    ],
  },
  {
    region: 'Africa',
    options: [
      { value: 'Africa/Cairo', label: 'Cairo' },
      { value: 'Africa/Lagos', label: 'Lagos' },
      { value: 'Africa/Nairobi', label: 'Nairobi' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg' },
    ],
  },
  {
    region: 'Pacific',
    options: [
      { value: 'Australia/Sydney', label: 'Sydney' },
      { value: 'Pacific/Auckland', label: 'Auckland' },
      { value: 'Pacific/Fiji', label: 'Fiji' },
    ],
  },
  {
    region: 'Other',
    options: [{ value: 'UTC', label: 'UTC' }],
  },
]

export function detectTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    return detected || 'UTC'
  } catch {
    return 'UTC'
  }
}
