/**
 * Mirrors the CSV schema and volume math in Golden_Gate_Assembly.py so a
 * reaction built here can never produce a CSV the robot script would reject.
 * Keep AVG_BP_MASS_DA / MAX_REACTION_VOLUME_UL / the fmol formula in sync
 * with that file if either changes.
 */
import type {
  FragmentInput,
  GlobalSettings,
  LibraryEntry,
  LibraryKind,
  ReactionInput,
  ReagentInput,
  SourceLocation,
  WaterInput,
} from "./types";

/** Kinds a backbone/insert fragment row's preset dropdown may pick from. */
export const DNA_KINDS: LibraryKind[] = ["backbone", "insert"];
/** Kinds a reagent row's preset dropdown may pick from. */
export const REAGENT_KINDS: LibraryKind[] = [
  "enzyme",
  "ligase",
  "buffer",
  "other",
];
/** Kinds the water row's preset dropdown may pick from. */
export const WATER_KINDS: LibraryKind[] = ["water"];

export const AVG_BP_MASS_DA = 650;
export const MAX_REACTION_VOLUME_UL = 20;
export const DEFAULT_TARGET_BACKBONE_FMOL = 50;
export const DEFAULT_MIN_PIPETTE_VOLUME_UL = 1;

export const CSV_COLUMNS = [
  "reaction_id",
  "destination_well",
  "total_reaction_volume_ul",
  "role",
  "part_name",
  "source_well",
  "source_location",
  "conc_ng_ul",
  "size_bp",
  "molar_ratio",
  "target_backbone_fmol",
  "fixed_volume_ul",
] as const;

const WELL_PATTERN = /^[A-H](?:[1-9]|1[0-2])$/;

export function isValidWell(well: string): boolean {
  return WELL_PATTERN.test(well.trim());
}

/** All 96 wells in column-major order (A1, B1, ... H1, A2, ...), matching the robot's own well iteration order. */
export const ALL_WELLS: string[] = (() => {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const wells: string[] = [];
  for (let col = 1; col <= 12; col++) {
    for (const row of rows) {
      wells.push(`${row}${col}`);
    }
  }
  return wells;
})();

/** All 24 wells of the Eppendorf tube rack, column-major (A1, B1, C1, D1, A2, ...). */
export const EPPENDORF_WELLS: string[] = (() => {
  const rows = ["A", "B", "C", "D"];
  const wells: string[] = [];
  for (let col = 1; col <= 6; col++) {
    for (const row of rows) {
      wells.push(`${row}${col}`);
    }
  }
  return wells;
})();

/** Which well list applies to a given source location: 24-well Eppendorf rack vs. 96-well module rack. */
export function wellsForLocation(location: SourceLocation): string[] {
  return location === "rack" ? EPPENDORF_WELLS : ALL_WELLS;
}

export function isValidWellForLocation(well: string, location: SourceLocation): boolean {
  return wellsForLocation(location).includes(well.trim());
}

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}

export function makeFragment(
  defaults: Partial<FragmentInput> = {},
): FragmentInput {
  return {
    id: nextId("frag"),
    partName: "",
    sourceWell: "",
    sourceLocation: "rack",
    concNgUl: "",
    sizeBp: "",
    molarRatio: "2",
    ...defaults,
  };
}

export function makeReagent(
  defaults: Partial<ReagentInput> = {},
): ReagentInput {
  return {
    id: nextId("reagent"),
    role: "enzyme",
    partName: "",
    sourceWell: "",
    sourceLocation: "rack",
    fixedVolumeUl: "",
    ...defaults,
  };
}

export function makeWater(defaults: Partial<WaterInput> = {}): WaterInput {
  return {
    partName: "water",
    sourceWell: "",
    sourceLocation: "rack",
    mode: "auto",
    fixedVolumeUl: "",
    ...defaults,
  };
}

export function makeLibraryEntry(
  defaults: Partial<LibraryEntry> = {},
): LibraryEntry {
  return {
    id: nextId("lib"),
    name: "",
    kind: "enzyme",
    sourceWell: "",
    sourceLocation: "rack",
    concNgUl: "",
    sizeBp: "",
    ...defaults,
  };
}

const LIBRARY_STORAGE_KEY = "golden-gate-reagent-library";

/** Client-only: reads the saved library, or [] if unset/unavailable/corrupt (e.g. during SSR). */
export function loadLibrary(): LibraryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Backfill fields added after some browsers may have already saved a library
    // (e.g. sourceLocation) so old entries don't silently end up blank/undefined.
    return parsed.map((entry: Partial<LibraryEntry>) => ({
      ...makeLibraryEntry(),
      ...entry,
      sourceLocation: entry.sourceLocation ?? "rack",
    }));
  } catch {
    return [];
  }
}

/** Client-only: persists the library so it survives a page reload. No-op during SSR. */
export function saveLibrary(entries: LibraryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — the library just won't persist.
  }
}

export function makeReaction(
  usedWells: Set<string>,
  usedReactionIds: Set<string>,
  library: LibraryEntry[] = [],
): ReactionInput {
  const destinationWell = ALL_WELLS.find((w) => !usedWells.has(w)) ?? "";
  let n = usedReactionIds.size + 1;
  let reactionId = `reaction_${n}`;
  while (usedReactionIds.has(reactionId)) {
    n += 1;
    reactionId = `reaction_${n}`;
  }

  // If there's exactly one predefined backbone in the library, start the new
  // reaction with it already filled in — most reactions reuse the same one.
  const backboneEntries = library.filter((e) => e.kind === "backbone");
  const backbone =
    backboneEntries.length === 1
      ? makeFragment({
          partName: backboneEntries[0].name,
          sourceWell: backboneEntries[0].sourceWell,
          sourceLocation: backboneEntries[0].sourceLocation,
          concNgUl: backboneEntries[0].concNgUl ?? "",
          sizeBp: backboneEntries[0].sizeBp ?? "",
          molarRatio: "1",
        })
      : makeFragment({ molarRatio: "1" });

  return {
    id: nextId("reaction"),
    reactionId,
    destinationWell,
    totalVolumeUl: "20",
    overrideTargetFmol: false,
    targetBackboneFmol: String(DEFAULT_TARGET_BACKBONE_FMOL),
    backbone,
    inserts: [makeFragment()],
    reagents: [
      makeReagent({ role: "enzyme" }),
      makeReagent({ role: "ligase" }),
      makeReagent({ role: "buffer" }),
    ],
    water: makeWater(),
  };
}

// ── Computation ──────────────────────────────────────────────────────────────

export interface ComputedComponent {
  key: string;
  role: string;
  partName: string;
  sourceWell: string;
  sourceLocation: SourceLocation;
  /** Volume that will actually be pipetted (rounded to 1 decimal), or null if not yet computable. */
  volumeUl: number | null;
  error?: string;
}

export interface ComputedReaction {
  totalTargetUl: number | null;
  totalComputedUl: number;
  components: ComputedComponent[];
  /** Reaction-wide problems not tied to a single row (bad total volume, bad destination well, etc). */
  errors: string[];
}

function parsePositiveFloat(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function computeFragmentVolume(
  fragment: FragmentInput,
  targetBackboneFmol: number,
  minPipetteVolumeUl: number,
): ComputedComponent {
  const conc = parsePositiveFloat(fragment.concNgUl);
  const sizeBp = parsePositiveFloat(fragment.sizeBp);
  const molarRatio = parsePositiveFloat(fragment.molarRatio);
  const base = {
    key: fragment.id,
    partName: fragment.partName || "(unnamed)",
    sourceWell: fragment.sourceWell,
    sourceLocation: fragment.sourceLocation,
  };

  if (conc === null || sizeBp === null || molarRatio === null) {
    return {
      ...base,
      role: "dna",
      volumeUl: null,
      error: "Missing conc/size/molar ratio",
    };
  }
  if (conc <= 0 || sizeBp <= 0 || molarRatio <= 0) {
    return {
      ...base,
      role: "dna",
      volumeUl: null,
      error: "conc/size/molar ratio must be positive",
    };
  }

  const fmolTarget = targetBackboneFmol * molarRatio;
  const massNg = (fmolTarget * AVG_BP_MASS_DA * sizeBp) / 1_000_000;
  const rawVolumeUl = massNg / conc;

  if (rawVolumeUl < minPipetteVolumeUl) {
    return {
      ...base,
      role: "dna",
      volumeUl: null,
      error: `Computed ${rawVolumeUl.toFixed(3)} µL — below the ${minPipetteVolumeUl} µL minimum`,
    };
  }
  if (rawVolumeUl > MAX_REACTION_VOLUME_UL) {
    return {
      ...base,
      role: "dna",
      volumeUl: null,
      error: `Computed ${rawVolumeUl.toFixed(1)} µL — exceeds the ${MAX_REACTION_VOLUME_UL} µL p20 cap`,
    };
  }
  return { ...base, role: "dna", volumeUl: Math.round(rawVolumeUl * 10) / 10 };
}

function computeReagentVolume(
  reagent: ReagentInput,
  minPipetteVolumeUl: number,
): ComputedComponent {
  const base = {
    key: reagent.id,
    role: reagent.role,
    partName: reagent.partName || reagent.role,
    sourceWell: reagent.sourceWell,
    sourceLocation: reagent.sourceLocation,
  };
  const volume = parsePositiveFloat(reagent.fixedVolumeUl);
  if (volume === null) {
    return { ...base, volumeUl: null, error: "Missing volume" };
  }
  if (volume <= 0) {
    return { ...base, volumeUl: null, error: "Volume must be positive" };
  }
  if (volume < minPipetteVolumeUl) {
    return {
      ...base,
      volumeUl: null,
      error: `${volume} µL is below the ${minPipetteVolumeUl} µL minimum`,
    };
  }
  if (volume > MAX_REACTION_VOLUME_UL) {
    return {
      ...base,
      volumeUl: null,
      error: `Exceeds the ${MAX_REACTION_VOLUME_UL} µL p20 cap`,
    };
  }
  return { ...base, volumeUl: Math.round(volume * 10) / 10 };
}

export function computeReaction(
  reaction: ReactionInput,
  settings: GlobalSettings,
): ComputedReaction {
  const errors: string[] = [];

  if (!reaction.reactionId.trim()) errors.push("Reaction ID is required.");
  if (!isValidWell(reaction.destinationWell)) {
    errors.push("Destination well must look like A1-H12.");
  }

  const totalTargetUl = parsePositiveFloat(reaction.totalVolumeUl);
  if (totalTargetUl === null || totalTargetUl <= 0) {
    errors.push("Total reaction volume must be a positive number.");
  } else if (totalTargetUl > MAX_REACTION_VOLUME_UL) {
    errors.push(
      `Total reaction volume (${totalTargetUl} µL) exceeds the ${MAX_REACTION_VOLUME_UL} µL p20 cap.`,
    );
  }

  const targetBackboneFmol = reaction.overrideTargetFmol
    ? (parsePositiveFloat(reaction.targetBackboneFmol) ??
      settings.defaultTargetBackboneFmol)
    : settings.defaultTargetBackboneFmol;

  const components: ComputedComponent[] = [];

  const backboneComputed = computeFragmentVolume(
    reaction.backbone,
    targetBackboneFmol,
    settings.minPipetteVolumeUl,
  );
  components.push({ ...backboneComputed, role: "backbone" });
  if (
    !reaction.backbone.partName.trim() &&
    !reaction.backbone.sourceWell.trim()
  ) {
    // Not yet filled in at all — surfaced via the row's own missing-field error, no need to duplicate.
  }

  for (const insert of reaction.inserts) {
    components.push({
      ...computeFragmentVolume(
        insert,
        targetBackboneFmol,
        settings.minPipetteVolumeUl,
      ),
      role: "insert",
    });
  }

  for (const reagent of reaction.reagents) {
    components.push(computeReagentVolume(reagent, settings.minPipetteVolumeUl));
  }

  // Water: computed last since auto-fill depends on every other component resolving cleanly.
  const nonWaterHaveErrors = components.some((c) => c.volumeUl === null);
  const sumOfOthers = components.reduce((sum, c) => sum + (c.volumeUl ?? 0), 0);

  let waterComponent: ComputedComponent;
  if (reaction.water.mode === "fixed") {
    const volume = parsePositiveFloat(reaction.water.fixedVolumeUl);
    if (volume === null) {
      waterComponent = {
        key: "water",
        role: "water",
        partName: reaction.water.partName || "water",
        sourceWell: reaction.water.sourceWell,
        sourceLocation: reaction.water.sourceLocation,
        volumeUl: null,
        error: "Missing volume",
      };
    } else if (volume <= 0) {
      waterComponent = {
        key: "water",
        role: "water",
        partName: reaction.water.partName || "water",
        sourceWell: reaction.water.sourceWell,
        sourceLocation: reaction.water.sourceLocation,
        volumeUl: null,
        error: "Volume must be positive",
      };
    } else if (volume < settings.minPipetteVolumeUl) {
      waterComponent = {
        key: "water",
        role: "water",
        partName: reaction.water.partName || "water",
        sourceWell: reaction.water.sourceWell,
        sourceLocation: reaction.water.sourceLocation,
        volumeUl: null,
        error: `Below the ${settings.minPipetteVolumeUl} µL minimum`,
      };
    } else {
      waterComponent = {
        key: "water",
        role: "water",
        partName: reaction.water.partName || "water",
        sourceWell: reaction.water.sourceWell,
        sourceLocation: reaction.water.sourceLocation,
        volumeUl: Math.round(volume * 10) / 10,
      };
    }
  } else if (nonWaterHaveErrors || totalTargetUl === null) {
    waterComponent = {
      key: "water",
      role: "water",
      partName: reaction.water.partName || "water",
      sourceWell: reaction.water.sourceWell,
      sourceLocation: reaction.water.sourceLocation,
      volumeUl: null,
      error: "Waiting on other components",
    };
  } else {
    const remainder = totalTargetUl - sumOfOthers;
    if (remainder < -0.001) {
      errors.push(
        `Components exceed the total reaction volume (${totalTargetUl} µL) by ${(-remainder).toFixed(2)} µL.`,
      );
      waterComponent = {
        key: "water",
        role: "water",
        partName: reaction.water.partName || "water",
        sourceWell: reaction.water.sourceWell,
        sourceLocation: reaction.water.sourceLocation,
        volumeUl: null,
        error: "Reaction over budget",
      };
    } else {
      const finalWater =
        remainder < settings.minPipetteVolumeUl
          ? 0
          : Math.round(remainder * 10) / 10;
      waterComponent = {
        key: "water",
        role: "water",
        partName: reaction.water.partName || "water",
        sourceWell: reaction.water.sourceWell,
        sourceLocation: reaction.water.sourceLocation,
        volumeUl: finalWater,
      };
    }
  }
  components.push(waterComponent);

  // A component with a value but no source well is still incomplete.
  for (const c of components) {
    if (c.volumeUl !== null && c.volumeUl > 0 && !isValidWellForLocation(c.sourceWell, c.sourceLocation)) {
      c.error =
        c.error ??
        (c.sourceLocation === "rack"
          ? "Well must be A1-D6 on the Eppendorf rack."
          : "Well must be A1-H12 on the module.");
      c.volumeUl = null;
    }
  }

  const totalComputedUl = components.reduce(
    (sum, c) => sum + (c.volumeUl ?? 0),
    0,
  );

  return { totalTargetUl, totalComputedUl, components, errors };
}

export function reactionHasErrors(computed: ComputedReaction): boolean {
  return (
    computed.errors.length > 0 ||
    computed.components.some((c) => c.volumeUl === null)
  );
}

// ── CSV export ───────────────────────────────────────────────────────────────

interface CsvRow {
  reaction_id: string;
  destination_well: string;
  total_reaction_volume_ul: string;
  role: string;
  part_name: string;
  source_well: string;
  source_location: string;
  conc_ng_ul: string;
  size_bp: string;
  molar_ratio: string;
  target_backbone_fmol: string;
  fixed_volume_ul: string;
}

function reactionToRows(reaction: ReactionInput): CsvRow[] {
  const shared = {
    reaction_id: reaction.reactionId,
    destination_well: reaction.destinationWell,
    total_reaction_volume_ul: reaction.totalVolumeUl,
  };

  const rows: CsvRow[] = [];

  rows.push({
    ...shared,
    role: "backbone",
    part_name: reaction.backbone.partName,
    source_well: reaction.backbone.sourceWell,
    source_location: reaction.backbone.sourceLocation,
    conc_ng_ul: reaction.backbone.concNgUl,
    size_bp: reaction.backbone.sizeBp,
    molar_ratio: "1",
    target_backbone_fmol: reaction.overrideTargetFmol
      ? reaction.targetBackboneFmol
      : "",
    fixed_volume_ul: "",
  });

  for (const insert of reaction.inserts) {
    rows.push({
      ...shared,
      role: "insert",
      part_name: insert.partName,
      source_well: insert.sourceWell,
      source_location: insert.sourceLocation,
      conc_ng_ul: insert.concNgUl,
      size_bp: insert.sizeBp,
      molar_ratio: insert.molarRatio,
      target_backbone_fmol: "",
      fixed_volume_ul: "",
    });
  }

  for (const reagent of reaction.reagents) {
    rows.push({
      ...shared,
      role: reagent.role,
      part_name: reagent.partName,
      source_well: reagent.sourceWell,
      source_location: reagent.sourceLocation,
      conc_ng_ul: "",
      size_bp: "",
      molar_ratio: "",
      target_backbone_fmol: "",
      fixed_volume_ul: reagent.fixedVolumeUl,
    });
  }

  rows.push({
    ...shared,
    role: "water",
    part_name: reaction.water.partName,
    source_well: reaction.water.sourceWell,
    source_location: reaction.water.sourceLocation,
    conc_ng_ul: "",
    size_bp: "",
    molar_ratio: "",
    target_backbone_fmol: "",
    fixed_volume_ul:
      reaction.water.mode === "fixed" ? reaction.water.fixedVolumeUl : "",
  });

  return rows;
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function reactionsToCsv(reactions: ReactionInput[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const reaction of reactions) {
    for (const row of reactionToRows(reaction)) {
      lines.push(
        CSV_COLUMNS.map((col) =>
          escapeCsvField(String(row[col as keyof CsvRow] ?? "")),
        ).join(","),
      );
    }
  }
  return lines.join("\n") + "\n";
}

// ── Cross-reaction validation ────────────────────────────────────────────────

export function findDuplicates(values: string[]): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) {
    const key = v.trim();
    if (!key) continue;
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return dupes;
}
