import AuthDiagnosticsPanel from "@/components/AuthDiagnosticsPanel";

export default function AuthDiagnostics() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Dijagnostika prijave</h1>
        <p className="text-muted-foreground">Pregled stanja sesije, cookieja, uloga i organizacija.</p>
      </div>
      <AuthDiagnosticsPanel />
    </div>
  );
}
