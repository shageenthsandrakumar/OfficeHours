"use client";

import { useEffect, useState } from "react";
import type { SharedNotePayload, ViewerLens } from "@/lib/types";
import { lensForRole } from "@/lib/onboarding/lightweight";
import { loadIntakeSession } from "@/lib/onboarding/session";
import { resolveDemoInvestigation } from "@/lib/onboarding/resolveDemo";
import type { IntakeSession } from "@/lib/onboarding/types";
import { InvestigationProvenance } from "./InvestigationProvenance";
import { SharedNoteView } from "../shared-note/SharedNoteView";

interface Props {
  note: SharedNotePayload;
  showCreatedBanner?: boolean;
  initialLens?: ViewerLens;
}

export function NoteWithProvenance({
  note,
  showCreatedBanner,
  initialLens,
}: Props) {
  const [session, setSession] = useState<IntakeSession | null>(null);

  useEffect(() => {
    setSession(loadIntakeSession());
  }, []);

  const demoLabel = session
    ? resolveDemoInvestigation(session).label
    : "";

  const lens =
    initialLens ??
    (session ? lensForRole(session.role) : ("for_me" as ViewerLens));

  return (
    <>
      {showCreatedBanner && session ? (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <InvestigationProvenance session={session} demoLabel={demoLabel} />
        </div>
      ) : null}
      <SharedNoteView note={note} initialLens={lens} />
    </>
  );
}
