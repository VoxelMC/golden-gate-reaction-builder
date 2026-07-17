import { useEffect, useMemo, useState } from "react";
import type { LibraryEntry, ReactionInput } from "../lib/types";
import {
	ALL_WELLS,
	DEFAULT_MIN_PIPETTE_VOLUME_UL,
	DEFAULT_TARGET_BACKBONE_FMOL,
	EPPENDORF_WELLS,
	computeReaction,
	findDuplicates,
	loadLibrary,
	makeLibraryEntry,
	makeReaction,
	nextId,
	reactionHasErrors,
	reactionsToCsv,
	saveLibrary,
} from "../lib/goldenGate";
import ReactionCard from "./ReactionCard";
import LibraryPanel from "./LibraryPanel";

export default function ReactionBuilder() {
	// Both reactions and library start empty (matches SSR) and are filled in
	// together right after mount — avoids a hydration mismatch between server
	// and client renders, and ensures the very first reaction card sees the
	// loaded library too (so a single predefined backbone auto-populates it).
	const [reactions, setReactions] = useState<ReactionInput[]>([]);
	const [library, setLibrary] = useState<LibraryEntry[]>([]);
	useEffect(() => {
		const loadedLibrary = loadLibrary();
		setLibrary(loadedLibrary);
		setReactions([makeReaction(new Set(), new Set(), loadedLibrary)]);
	}, []);

	const [defaultTargetBackboneFmol, setDefaultTargetBackboneFmol] = useState(DEFAULT_TARGET_BACKBONE_FMOL);
	const [minPipetteVolumeUl, setMinPipetteVolumeUl] = useState(DEFAULT_MIN_PIPETTE_VOLUME_UL);
	const [justExported, setJustExported] = useState(false);
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

	function commitLibrary(next: LibraryEntry[]) {
		setLibrary(next);
		saveLibrary(next);
	}

	function addLibraryEntry() {
		commitLibrary([...library, makeLibraryEntry()]);
	}

	function updateLibraryEntry(id: string, patch: Partial<LibraryEntry>) {
		commitLibrary(library.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
	}

	function removeLibraryEntry(id: string) {
		commitLibrary(library.filter((entry) => entry.id !== id));
	}

	const settings = { defaultTargetBackboneFmol, minPipetteVolumeUl };

	const duplicateReactionIds = useMemo(
		() => findDuplicates(reactions.map((r) => r.reactionId)),
		[reactions],
	);
	const duplicateDestinationWells = useMemo(
		() => findDuplicates(reactions.map((r) => r.destinationWell)),
		[reactions],
	);

	const anyReactionHasErrors = reactions.some((r) => reactionHasErrors(computeReaction(r, settings)));
	const hasDuplicates = duplicateReactionIds.size > 0 || duplicateDestinationWells.size > 0;
	const canExport = reactions.length > 0 && !anyReactionHasErrors && !hasDuplicates;

	function updateReaction(index: number, updated: ReactionInput) {
		setReactions((prev) => prev.map((r, i) => (i === index ? updated : r)));
	}

	function removeReaction(index: number) {
		const removedId = reactions[index]?.id;
		setReactions((prev) => prev.filter((_, i) => i !== index));
		if (removedId) {
			setCollapsedIds((prev) => {
				if (!prev.has(removedId)) return prev;
				const next = new Set(prev);
				next.delete(removedId);
				return next;
			});
		}
	}

	function addReaction() {
		const usedWells = new Set(reactions.map((r) => r.destinationWell));
		const usedIds = new Set(reactions.map((r) => r.reactionId));
		setReactions((prev) => [...prev, makeReaction(usedWells, usedIds, library)]);
	}

	function duplicateReaction(index: number) {
		const original = reactions[index];
		const usedIds = new Set(reactions.map((r) => r.reactionId.trim()));
		let candidate = `${original.reactionId}_copy`;
		let n = 2;
		while (usedIds.has(candidate)) {
			candidate = `${original.reactionId}_copy${n}`;
			n += 1;
		}
		const usedWells = new Set(reactions.map((r) => r.destinationWell));
		const destinationWell = ALL_WELLS.find((w) => !usedWells.has(w)) ?? "";

		const copy: ReactionInput = {
			...original,
			id: nextId("reaction"),
			reactionId: candidate,
			destinationWell,
			backbone: { ...original.backbone, id: nextId("frag") },
			inserts: original.inserts.map((f) => ({ ...f, id: nextId("frag") })),
			reagents: original.reagents.map((r) => ({ ...r, id: nextId("reagent") })),
			water: { ...original.water },
		};

		setReactions((prev) => {
			const next = [...prev];
			next.splice(index + 1, 0, copy);
			return next;
		});
	}

	function toggleCollapsed(id: string) {
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	const allCollapsed = reactions.length > 0 && reactions.every((r) => collapsedIds.has(r.id));

	function toggleCollapseAll() {
		setCollapsedIds(allCollapsed ? new Set() : new Set(reactions.map((r) => r.id)));
	}

	function exportCsv() {
		const csv = reactionsToCsv(reactions);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "golden_gate_reactions.csv";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		setJustExported(true);
		setTimeout(() => setJustExported(false), 2500);
	}

	return (
		<div className="builder">
			<div className="middle">

				<datalist id="well-options">
					{ALL_WELLS.map((well) => (
						<option key={well} value={well} />
					))}
				</datalist>
				<datalist id="well-options-eppendorf">
					{EPPENDORF_WELLS.map((well) => (
						<option key={well} value={well} />
					))}
				</datalist>

				<div className="settings-bar">
					<label>
						Default target backbone (fmol)
						<input
							type="number"
							min="0"
							step="any"
							value={defaultTargetBackboneFmol}
							onChange={(e) => setDefaultTargetBackboneFmol(Number(e.target.value) || 0)}
						/>
					</label>
					<label>
						Minimum pipette volume (µL)
						<input
							type="number"
							min="0"
							step="any"
							value={minPipetteVolumeUl}
							onChange={(e) => setMinPipetteVolumeUl(Number(e.target.value) || 0)}
						/>
					</label>
					<span className="settings-hint">
						These mirror the robot protocol's runtime parameters and only affect the live preview below — set the
						real values in the Opentrons App when you run the protocol.
					</span>
				</div>

				<LibraryPanel
					library={library}
					onAdd={addLibraryEntry}
					onUpdate={updateLibraryEntry}
					onRemove={removeLibraryEntry}
				/>

				<div className="cards">
					{reactions.map((reaction, i) => (
						<ReactionCard
							key={reaction.id}
							reaction={reaction}
							settings={settings}
							library={library}
							collapsed={collapsedIds.has(reaction.id)}
							duplicateReactionId={duplicateReactionIds.has(reaction.reactionId.trim())}
							duplicateDestinationWell={duplicateDestinationWells.has(reaction.destinationWell.trim())}
							onChange={(updated) => updateReaction(i, updated)}
							onRemove={() => removeReaction(i)}
							onDuplicate={() => duplicateReaction(i)}
							onToggleCollapsed={() => toggleCollapsed(reaction.id)}
						/>
					))}
				</div>
			</div>

			<div className="toolbar">
				<button type="button" className="btn-add-reaction" onClick={addReaction}>
					+ Add reaction
				</button>
				<button type="button" className="btn-collapse-all" onClick={toggleCollapseAll} disabled={reactions.length === 0}>
					{allCollapsed ? "Expand all" : "Collapse all"}
				</button>
				<button type="button" className="btn-export" onClick={exportCsv} disabled={!canExport}>
					{justExported ? "Downloaded!" : "Download CSV"}
				</button>
				{!canExport && <span className="export-hint">Fix the highlighted issues above to enable export.</span>}
			</div>
		</div>
	);
}
