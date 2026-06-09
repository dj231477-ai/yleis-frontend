import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type StarRatingProps = {
  rating: number;
  max?: number;
  size?: "sm" | "md";
};

export function StarRating({ rating, max = 5, size = "sm" }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            i < rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}
