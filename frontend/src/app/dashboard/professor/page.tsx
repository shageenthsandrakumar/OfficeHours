"use client";

import { Suspense } from "react";
import { ProfessorDashboard } from "@/components/dashboard/ProfessorDashboard";

export default function ProfessorDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ascend-muted">Loading…</div>}>
      <ProfessorDashboard />
    </Suspense>
  );
}
