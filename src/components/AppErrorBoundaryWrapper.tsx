'use client';

import { ErrorBoundary } from './ErrorBoundary';

export function AppErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
