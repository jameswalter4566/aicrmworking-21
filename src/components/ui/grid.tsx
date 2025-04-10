
import * as React from "react";
import { cn } from "@/lib/utils";

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number;
  gap?: number;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 4, gap = 4, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          `grid grid-cols-1 md:grid-cols-${cols} gap-${gap}`,
          className
        )}
        {...props}
      />
    );
  }
);
Grid.displayName = "Grid";
