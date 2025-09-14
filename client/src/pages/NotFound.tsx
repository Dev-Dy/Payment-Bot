import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center space-y-4" data-testid="page-not-found">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter">404</h1>
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground max-w-[500px]">
          The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button asChild variant="default" data-testid="button-home">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
        <Button asChild variant="outline" onClick={() => window.history.back()} data-testid="button-back">
          <span>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </span>
        </Button>
      </div>
    </div>
  );
}