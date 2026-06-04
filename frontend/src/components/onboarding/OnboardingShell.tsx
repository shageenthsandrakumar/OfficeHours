import { APP_NAME } from "@/lib/constants";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface Props {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
}: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ascend-bg px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div
          className="rounded-xl border border-ascend-border/80 bg-ascend-card p-8"
          style={{ borderWidth: "0.5px" }}
        >
          <p className="font-heading text-[18px] text-ascend-text">{APP_NAME}</p>
          <div className="mt-6">
            <ProgressBar current={step} total={totalSteps} />
          </div>
          <h1 className="mt-8 font-heading text-[15px] font-medium text-ascend-text">{title}</h1>
          {subtitle && <p className="mt-2 label-text">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
