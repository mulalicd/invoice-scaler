import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { reportClientError } from "@/lib/errorLogger";

interface State { hasError: boolean; error?: Error; }

export { reportClientError };

export default class ErrorBoundary extends Component<{ children: ReactNode; scope?: string; resetKey?: string }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  componentDidUpdate(prevProps: { resetKey?: string }) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  componentDidCatch(error: Error, info: any) {
    reportClientError(error.message, this.props.scope ?? "ErrorBoundary", error.stack, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Došlo je do neočekivane greške</h1>
            <p className="text-muted-foreground text-sm">Greška je zabilježena sa porukom, lokacijom i stack traceom. Pokušajte osvježiti prikaz.</p>
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
