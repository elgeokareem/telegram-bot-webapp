import { Navigate, Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: Outlet,
  notFoundComponent: () => <Navigate to="/" replace />,
})
