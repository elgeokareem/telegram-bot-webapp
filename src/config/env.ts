type Env = {
  appName: string
  apiBaseUrl: string
  defaultTimezone: string
  telegramDebug: boolean
}

function getEnvOrDefault(value: string | boolean | undefined, fallback: string): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  const trimmed = value?.toString().trim()
  if (!trimmed) {
    return fallback
  }

  return trimmed
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true'
}

function loadEnv(): Env {
  const env: Env = {
    appName: getEnvOrDefault(import.meta.env.VITE_APP_NAME, 'Bot Telegram Events'),
    apiBaseUrl: getEnvOrDefault(import.meta.env.VITE_API_BASE_URL, 'http://localhost:8080'),
    defaultTimezone: getEnvOrDefault(import.meta.env.VITE_DEFAULT_TIMEZONE, 'UTC'),
    telegramDebug: parseBoolean(getEnvOrDefault(import.meta.env.VITE_TELEGRAM_DEBUG, 'false')),
  }

  if (!env.apiBaseUrl) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL')
  }

  return env
}

export const ENV = loadEnv()
