import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        hint="The page you are looking for does not exist or has moved."
        className="w-full max-w-md"
        actionSlot={
          <Button asChild size="sm">
            <Link to="/dashboard">Back to command center</Link>
          </Button>
        }
      />
    </div>
  );
}
