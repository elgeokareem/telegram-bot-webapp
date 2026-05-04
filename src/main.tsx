import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRootRoute, createRoute, createRouter, Navigate, RouterProvider } from '@tanstack/react-router'
import './index.css'
import App from './App.tsx'
import Home from './Home.tsx'

const rootRoute = createRootRoute()

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const eventsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events-new',
  component: App,
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: () => <Navigate to="/" replace />,
})

const routeTree = rootRoute.addChildren([homeRoute, eventsNewRoute, notFoundRoute])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
