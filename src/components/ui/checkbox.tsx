
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// Custom checkbox with thick border, larger size, and translucent fill.
// When checked, solid white fill plus checkmark over it.
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer relative h-7 w-7 shrink-0 rounded-md border-4 border-blue-400 bg-blue-100/30 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
      // solid white fill if checked
      "data-[state=checked]:bg-white",
      className
    )}
    {...props}
  >
    {/* Overlay for transparency */}
    <span className="absolute inset-0 rounded-md pointer-events-none bg-blue-100/30 peer-data-[state=unchecked]:bg-blue-100/40" />
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-blue-700 z-10 relative")}
    >
      <Check className="h-5 w-5 stroke-2" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
