"use client";

import { useCallback, useMemo, useState } from "react";
import type { SharedNotePayload, ViewerLens } from "@/lib/types";
import {
  decisionToRecommendation,
  isPositiveRecommendation,
  routingToMoment,
} from "@/lib/viewModel";
import { buildNarrativeHero } from "@/lib/presentation/lensExperience";
import {
  sectionsForLens,
  defaultSectionForLens,
  type ForMeSectionId,
  type ForProjectSectionId,
  type ModeSectionId,
} from "@/lib/presentation/modeSections";
import {
  modeCopy,
  buildSurfaceHiddenPairs,
  buildReasoningTimeline,
  buildInterviewQuestions,
  buildImproveActions,
  buildLikelyAskedYou,
  buildStandOutBullets,
  buildReviewerConcerns,
  buildHiddenValuable,
  buildAssessmentSummary,
  buildEvidenceStrength,
  buildOpenQuestions,
  buildAssumptions,
} from "@/lib/presentation/modeContent";
import { LensSwitcher } from "./LensSwitcher";
import { NarrativeHero } from "./NarrativeHero";
import { ModeRoomBanner } from "./ModeRoomBanner";
import { DiscoveryRail } from "./DiscoveryRail";
import { ForMeModePanel } from "./ForMeModePanel";
import { ForProjectModePanel } from "./ForProjectModePanel";

interface Props {
  note: SharedNotePayload;
  initialLens?: ViewerLens;
}

export function SignalDiscoveryExperience({ note, initialLens = "for_me" }: Props) {
  const [lens, setLens] = useState<ViewerLens>(initialLens);
  const [active, setActive] = useState<ModeSectionId>(() =>
    defaultSectionForLens(initialLens)
  );
  const [unlocked, setUnlocked] = useState<Set<ModeSectionId>>(
    () => new Set([defaultSectionForLens(initialLens)])
  );

  const { dossier, result } = note;
  const moment = routingToMoment(dossier.routing);
  const recommendation = decisionToRecommendation(
    result.decision,
    dossier.routing
  );
  const positive = isPositiveRecommendation(dossier.routing, result.decision);

  const sections = useMemo(() => sectionsForLens(lens), [lens]);
  const activeSection = sections.find((s) => s.id === active) ?? sections[0];
  const copy = useMemo(() => modeCopy(lens), [lens]);
  const hero = useMemo(() => buildNarrativeHero(note, lens), [note, lens]);

  const surfaceHidden = useMemo(() => buildSurfaceHiddenPairs(note), [note]);
  const timeline = useMemo(
    () => buildReasoningTimeline(note, lens),
    [note, lens]
  );

  const forMeContent = useMemo(
    () => ({
      standOut: buildStandOutBullets(note),
      concerns: buildReviewerConcerns(note),
      hiddenValuable: buildHiddenValuable(note),
      likelyAsked: buildLikelyAskedYou(note),
      improveActions: buildImproveActions(note),
    }),
    [note]
  );

  const forProjectContent = useMemo(
    () => ({
      assessment: buildAssessmentSummary(note),
      evidence: buildEvidenceStrength(note),
      openQuestions: buildOpenQuestions(note),
      risks: buildReviewerConcerns(note),
      interviewQuestions: buildInterviewQuestions(note),
      assumptions: buildAssumptions(note),
    }),
    [note]
  );

  const selectSection = useCallback((id: ModeSectionId) => {
    setActive(id);
    setUnlocked((prev) => new Set(prev).add(id));
  }, []);

  const handleLensChange = useCallback((next: ViewerLens) => {
    const first = defaultSectionForLens(next);
    setLens(next);
    setActive(first);
    setUnlocked(new Set([first]));
  }, []);

  const pathLabel =
    lens === "for_me" ? "Your coaching path" : "Reviewer workspace sections";

  return (
    <div
      data-lens={lens}
      className={`discovery-shell min-h-screen transition-colors duration-500 ${
        lens === "for_me" ? "lens-for-me" : "lens-for-project"
      }`}
    >
      <article className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <LensSwitcher lens={lens} onChange={handleLensChange} />

        <div key={lens} className="lens-transition mt-6 mb-6">
          <ModeRoomBanner copy={copy} lens={lens} />
          <NarrativeHero
            hero={hero}
            lens={lens}
            subtitle={
              lens === "for_me"
                ? `Your signal story · ${note.project.project_title}`
                : `Candidate file · ${note.student.name.split(" ")[0]} · ${note.project.project_title}`
            }
            moment={moment}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(240px,280px)_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              {pathLabel}
            </p>
            <DiscoveryRail
              sections={sections}
              active={active}
              unlocked={unlocked}
              pathLabel={pathLabel}
              onSelect={selectSection}
            />
          </aside>

          <main
            key={`${lens}-${active}`}
            className={`rounded-3xl border p-5 shadow-sm backdrop-blur-sm sm:p-8 ${
              lens === "for_me"
                ? "border-coral/20 bg-card/95"
                : "border-sage/25 bg-card/90"
            }`}
          >
            {lens === "for_me" ? (
              <ForMeModePanel
                section={activeSection}
                sectionId={active as ForMeSectionId}
                note={note}
                standOut={forMeContent.standOut}
                concerns={forMeContent.concerns}
                hiddenValuable={forMeContent.hiddenValuable}
                likelyAsked={forMeContent.likelyAsked}
                improveActions={forMeContent.improveActions}
                surfaceHidden={surfaceHidden}
                timeline={timeline}
                recommendation={recommendation}
                positive={positive}
              />
            ) : (
              <ForProjectModePanel
                section={activeSection}
                sectionId={active as ForProjectSectionId}
                note={note}
                assessment={forProjectContent.assessment}
                evidence={forProjectContent.evidence}
                openQuestions={forProjectContent.openQuestions}
                risks={forProjectContent.risks}
                interviewQuestions={forProjectContent.interviewQuestions}
                assumptions={forProjectContent.assumptions}
                surfaceHidden={surfaceHidden}
                timeline={timeline}
                recommendation={recommendation}
                positive={positive}
              />
            )}
          </main>
        </div>
      </article>
    </div>
  );
}
