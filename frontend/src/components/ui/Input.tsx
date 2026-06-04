import { cn } from "@/lib/utils";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="label-text block font-heading text-[15px] text-ascend-text">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn("ascend-input", error && "border-ascend-destructive", className)}
        {...props}
      />
      {error && <p className="text-xs text-ascend-destructive">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="space-y-2">
      {label && <label className="label-text block">{label}</label>}
      <select className={cn("ascend-input", className)} {...props}>
        {children}
      </select>
    </div>
  );
}
