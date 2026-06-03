"use client";

import type { SharedNotePayload, ViewerLens } from "@/lib/types";
import { SignalDiscoveryExperience } from "../discovery/SignalDiscoveryExperience";

interface Props {
  note: SharedNotePayload;
  initialLens?: ViewerLens;
}

export function SharedNoteView({ note, initialLens }: Props) {
  return <SignalDiscoveryExperience note={note} initialLens={initialLens} />;
}
