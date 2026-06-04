import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-body text-sm font-normal transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-ascend-primary px-[18px] py-2.5 text-ascend-card hover:bg-ascend-primary-dark focus:outline-none focus:ring-2 focus:ring-ascend-secondary",
        variant === "secondary" &&
          "border border-ascend-secondary bg-transparent px-[18px] py-2.5 text-ascend-primary hover:bg-ascend-sidebar focus:outline-none focus:ring-2 focus:ring-ascend-secondary",
        variant === "ghost" &&
          "px-3 py-2 text-ascend-muted hover:bg-ascend-sidebar hover:text-ascend-text",
        variant === "destructive" &&
          "bg-ascend-destructive px-[18px] py-2.5 text-ascend-card hover:opacity-90",
        size === "sm" && "px-3 py-1.5 text-xs",
        className
      )}
      {...props}
    />
  );
}
