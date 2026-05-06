import { Component, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface State { hasError: boolean; error?: Error; }

export async function reportClientError(message: string, source: string, stack?: string, context?: any) {
  try {
    await supabase.rpc("log_client_error" as any, {
      _message: message,
      _source: source,
      _stack: stack ?? null,
      _url: typeof window !== "undefined" ? window.location.href : null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _context: context ?? null,
    });
  } catch (e) {
    // swallow — never throw from logger
    console.warn("[error-logger] failed", e);
  }
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  componentDidCatch(error: Error, info: any) {
    reportClientError(error.message, "ErrorBoundary", error.stack, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Došlo je do neočekivane greške</h1>
            <p className="text-muted-foreground text-sm">Greška je zabilježena. Pokušajte osvježiti stranicu ili se vratite na početnu.</p>
            <pre className="text-xs text-left bg-muted p-3 rounded overflow-auto max-h-40">{this.state.error?.message}</pre>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>Osvježi</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/")}>Početna</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
