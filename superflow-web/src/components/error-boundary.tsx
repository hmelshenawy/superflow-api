"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ComponentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 px-6 py-10 text-center dark:border-rose-800 dark:bg-rose-950/20">
          <AlertTriangle className="h-8 w-8 text-rose-400" />
          <p className="text-sm font-semibold text-foreground">
            {this.props.label ? `${this.props.label} failed to load` : "Something went wrong"}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            This section encountered an error. You can try reloading it.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reload section
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}