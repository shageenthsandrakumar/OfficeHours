import { DemoFlowShell } from "@/components/onboarding/DemoFlowShell";
import { LightweightIntakeForm } from "@/components/onboarding/LightweightIntakeForm";

export default function StartIntakePage() {
  return (
    <DemoFlowShell step={3}>
      <LightweightIntakeForm />
    </DemoFlowShell>
  );
}
