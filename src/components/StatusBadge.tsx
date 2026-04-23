import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  draft: "Nacrt",
  issued: "Izdana",
  paid: "Plaćena",
  cancelled: "Otkazana",
};

const styles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  issued: "bg-primary/10 text-primary border-primary/20",
  paid: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] ?? "")}>
      {labels[status] ?? status}
    </Badge>
  );
}
