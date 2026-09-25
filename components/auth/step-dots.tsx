import { cn } from "@/lib/utils";

export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
    >
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <span
            key={step}
            className={cn(
              "h-2 rounded-full transition-all",
              active ? "w-8 bg-primary" : "w-2",
              done ? "bg-primary" : !active && "bg-border"
            )}
          />
        );
      })}
    </div>
  );
}
