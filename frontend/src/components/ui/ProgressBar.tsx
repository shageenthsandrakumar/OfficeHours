interface Props {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: Props) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && <span className="label-text">{label}</span>}
        <span className="label-text ml-auto">
          Step {current} of {total}
        </span>
      </div>
      <div className="h-[3px] overflow-hidden rounded-sm bg-ascend-border">
        <div
          className="h-full rounded-sm bg-ascend-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
