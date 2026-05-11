import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import AppLayout from "./AppLayout";
import OnboardingScreen from "./OnboardingScreen";
import ForcePasswordChange from "./ForcePasswordChange";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, profile, organization } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (profile?.must_change_password) return <ForcePasswordChange />;

  if (!profile?.organization_id || !organization) {
    return <OnboardingScreen />;
  }

  return <AppLayout>{children}</AppLayout>;
}
