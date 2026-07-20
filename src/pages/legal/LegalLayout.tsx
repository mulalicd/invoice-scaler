import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  title: string;
  updated: string;
  children: ReactNode;
}

export default function LegalLayout({ title, updated, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nazad
            </Button>
          </Link>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/legal/privacy" className="hover:text-foreground">Privatnost</Link>
            <Link to="/legal/terms" className="hover:text-foreground">Uvjeti</Link>
            <Link to="/legal/cookies" className="hover:text-foreground">Kolačići</Link>
          </div>
        </div>
      </div>
      <article className="max-w-4xl mx-auto px-6 py-10 prose prose-slate dark:prose-invert prose-headings:font-semibold prose-h1:mb-2 prose-h2:mt-8 prose-h2:mb-3 prose-p:leading-relaxed">
        <h1>{title}</h1>
        <p className="text-sm text-muted-foreground !mt-0">Zadnja izmjena: {updated}</p>
        {children}
      </article>
    </div>
  );
}
