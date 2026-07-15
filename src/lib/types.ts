export type ReagentRole = "enzyme" | "ligase" | "buffer" | "other";

export const REAGENT_ROLES: ReagentRole[] = ["enzyme", "ligase", "buffer", "other"];

export type LibraryKind = "backbone" | "insert" | "enzyme" | "ligase" | "buffer" | "water" | "other";

export const LIBRARY_KINDS: LibraryKind[] = ["backbone", "insert", "enzyme", "ligase", "buffer", "water", "other"];

/**
 * Which physical rack a well address refers to: the regular slot-1 source
 * rack, or the temperature-module rack (for anything kept cold, e.g.
 * enzymes/buffer). Both use the same A1-H12 addressing.
 */
export type SourceLocation = "rack" | "module";

export const SOURCE_LOCATIONS: SourceLocation[] = ["rack", "module"];

/**
 * A predefined, reusable named location (a tube of backbone/insert/reagent/water
 * that always lives in the same well). Rows can pull one in via a dropdown
 * instead of retyping name/well/conc/size, or ignore the library and type
 * values manually — this only ever pre-fills a row's plain fields once, it
 * does not keep a live link back to the library entry.
 */
export interface LibraryEntry {
  id: string;
  name: string;
  kind: LibraryKind;
  sourceWell: string;
  sourceLocation: SourceLocation;
  concNgUl?: string;
  sizeBp?: string;
}

/** A DNA part (backbone or insert). Volume is computed from conc/size/molar ratio. */
export interface FragmentInput {
  id: string;
  partName: string;
  sourceWell: string;
  sourceLocation: SourceLocation;
  concNgUl: string;
  sizeBp: string;
  molarRatio: string;
}

/** A reagent (enzyme/ligase/buffer/other) with a literal pipetted volume. */
export interface ReagentInput {
  id: string;
  role: ReagentRole;
  partName: string;
  sourceWell: string;
  sourceLocation: SourceLocation;
  fixedVolumeUl: string;
}

/** Water either auto-fills to the reaction total, or uses a literal volume. */
export interface WaterInput {
  partName: string;
  sourceWell: string;
  sourceLocation: SourceLocation;
  mode: "auto" | "fixed";
  fixedVolumeUl: string;
}

export interface ReactionInput {
  id: string;
  reactionId: string;
  destinationWell: string;
  totalVolumeUl: string;
  overrideTargetFmol: boolean;
  targetBackboneFmol: string;
  backbone: FragmentInput;
  inserts: FragmentInput[];
  reagents: ReagentInput[];
  water: WaterInput;
}

export interface GlobalSettings {
  defaultTargetBackboneFmol: number;
  minPipetteVolumeUl: number;
}
