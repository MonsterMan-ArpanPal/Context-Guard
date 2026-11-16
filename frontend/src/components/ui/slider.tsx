import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/[0.08]">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-brand-500 to-brand-300" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-brand-200/70 bg-brand-300 shadow-[0_0_16px_rgba(52,211,153,0.7)] transition-transform focus:outline-none focus:ring-2 focus:ring-brand-400/40 hover:scale-110" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
