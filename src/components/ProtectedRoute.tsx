import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import AppLayout from "./AppLayout";
import OnboardingScreen from "./OnboardingScreen";
import ForcePasswordChange from "./ForcePasswordChange";
import ErrorBoundary from "./ErrorBoundary";
import PostLoginOrgChooser, { ORG_CHOSEN_KEY } from "./PostLoginOrgChooser";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, profile, organization, organizations, authError, refresh } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
          <h1 className="text-2xl font-display font-bold">Dashboard se nije mogao učitati</h1>
          <p className="text-sm text-muted-foreground">Greška je zabilježena u backend dnevniku sa detaljima zahtjeva i stack traceom.</p>
          <pre className="text-xs text-left bg-muted p-3 rounded overflow-auto max-h-40">{authError}</pre>
          <Button onClick={refresh}>Pokušaj ponovo</Button>
        </div>
      </div>
    );
  }

  if (profile?.must_change_password) return <ForcePasswordChange />;

  if (!profile?.organization_id || !organization) {
    return <OnboardingScreen />;
  }

  // Post-login org chooser: if user has 2+ orgs and hasn't chosen this session, show selector
  const chosen = typeof window !== "undefined" ? sessionStorage.getItem(ORG_CHOSEN_KEY) : null;
  if (organizations.length > 1 && !chosen) {
    return <PostLoginOrgChooser />;
  }

  return <AppLayout><ErrorBoundary scope="DashboardRoute" resetKey={window.location.pathname}>{children}</ErrorBoundary></AppLayout>;
}
