import { DemoFlowShell } from "@/components/onboarding/DemoFlowShell";
import { DemoAnalysisLoader } from "@/components/onboarding/DemoAnalysisLoader";

export default function StartAnalyzingPage() {
  return (
    <DemoFlowShell step={4}>
      <DemoAnalysisLoader />
    </DemoFlowShell>
  );
}
