'use client';

import React from 'react';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    // To report to Sentry: install @sentry/nextjs and add:
    //   import * as Sentry from '@sentry/nextjs';
    //   Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
          <p className="text-4xl" aria-hidden>⚠️</p>
          <h1 className="mt-4 text-lg font-bold text-black">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-center text-sm text-black/60">
            We hit an unexpected error. Try refreshing or go back home.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="rounded-full border border-black/20 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-snap transition hover:bg-zinc-50"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-full bg-[#fffc00] px-5 py-2.5 text-center text-sm font-bold text-black shadow-snap transition hover:bg-[#e6e300]"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
