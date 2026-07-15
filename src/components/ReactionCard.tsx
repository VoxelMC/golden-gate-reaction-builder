import type { GlobalSettings, LibraryEntry, ReactionInput } from "../lib/types";
import { computeReaction, makeFragment, makeReagent, MAX_REACTION_VOLUME_UL, WATER_KINDS } from "../lib/goldenGate";
import FragmentRow from "./FragmentRow";
import ReagentRow from "./ReagentRow";
import PresetSelect from "./PresetSelect";
import LocationSelect from "./LocationSelect";

import { RiArrowDropDownLine, RiArrowDropRightLine, RiContractUpDownLine, RiExpandUpDownLine } from "@remixicon/react";

interface Props {
	reaction: ReactionInput;
	settings: GlobalSettings;
	library: LibraryEntry[];
	collapsed: boolean;
	duplicateReactionId: boolean;
	duplicateDestinationWell: boolean;
	onChange: (updated: ReactionInput) => void;
	onRemove: () => void;
	onToggleCollapsed: () => void;
}

export default function ReactionCard({
	reaction,
	settings,
	library,
	collapsed,
	duplicateReactionId,
	duplicateDestinationWell,
	onChange,
	onRemove,
	onToggleCollapsed,
}: Props) {
	const computed = computeReaction(reaction, settings);
	const componentByKey = new Map(computed.components.map((c) => [c.key, c]));

	const totalMismatch =
		computed.totalTargetUl !== null && Math.abs(computed.totalComputedUl - computed.totalTargetUl) > 0.05;

	return (
		<section className="reaction-card">
			<div className="card-header">
				<button
					type="button"
					className="card-collapse-toggle"
					onClick={onToggleCollapsed}
					title={collapsed ? "Expand" : "Collapse"}
				>
					{collapsed ? <RiExpandUpDownLine /> : <RiContractUpDownLine />}
				</button>
				<label className="field-label">
					Reaction ID
					<input
						className={duplicateReactionId ? "input-error" : ""}
						type="text"
						value={reaction.reactionId}
						onChange={(e) => onChange({ ...reaction, reactionId: e.target.value })}
					/>
				</label>
				<label className="field-label">
					Destination well
					<input
						className={duplicateDestinationWell ? "input-error" : ""}
						type="text"
						list="well-options"
						value={reaction.destinationWell}
						onChange={(e) => onChange({ ...reaction, destinationWell: e.target.value.toUpperCase() })}
					/>
				</label>
				<label className="field-label">
					Total volume (µL)
					<input
						type="number"
						min="0"
						max={MAX_REACTION_VOLUME_UL}
						step="any"
						value={reaction.totalVolumeUl}
						onChange={(e) => onChange({ ...reaction, totalVolumeUl: e.target.value })}
					/>
				</label>
				<button type="button" className="btn-remove-card" onClick={onRemove} title="Remove reaction">
					Remove
				</button>
			</div>

			{duplicateReactionId && <p className="card-warning">This reaction ID is used more than once.</p>}
			{duplicateDestinationWell && <p className="card-warning">This destination well is used by another reaction.</p>}

			{!collapsed && (
				<div className="card-body">
					<h4>Backbone</h4>
					<FragmentRow
						fragment={reaction.backbone}
						computed={componentByKey.get(reaction.backbone.id)}
						isBackbone
						library={library}
						onChange={(patch) => onChange({ ...reaction, backbone: { ...reaction.backbone, ...patch } })}
					/>

					<label className="override-fmol">
						<input
							type="checkbox"
							checked={reaction.overrideTargetFmol}
							onChange={(e) => onChange({ ...reaction, overrideTargetFmol: e.target.checked })}
						/>
						Override target backbone amount for this reaction
						{reaction.overrideTargetFmol && (
							<input
								className="field-num"
								type="number"
								min="0"
								step="any"
								value={reaction.targetBackboneFmol}
								onChange={(e) => onChange({ ...reaction, targetBackboneFmol: e.target.value })}
							/>
						)}
						{!reaction.overrideTargetFmol && <span className="hint"> (using default: {settings.defaultTargetBackboneFmol} fmol)</span>}
					</label>

					<h4>Inserts</h4>
					{reaction.inserts.map((insert, i) => (
						<FragmentRow
							key={insert.id}
							fragment={insert}
							computed={componentByKey.get(insert.id)}
							library={library}
							onChange={(patch) => {
								const inserts = [...reaction.inserts];
								inserts[i] = { ...inserts[i], ...patch };
								onChange({ ...reaction, inserts });
							}}
							onRemove={() => onChange({ ...reaction, inserts: reaction.inserts.filter((_, j) => j !== i) })}
						/>
					))}
					<button
						type="button"
						className="btn-add"
						onClick={() => onChange({ ...reaction, inserts: [...reaction.inserts, makeFragment()] })}
					>
						+ Add insert
					</button>

					<h4>Reagents</h4>
					{reaction.reagents.map((reagent, i) => (
						<ReagentRow
							key={reagent.id}
							reagent={reagent}
							computed={componentByKey.get(reagent.id)}
							library={library}
							onChange={(patch) => {
								const reagents = [...reaction.reagents];
								reagents[i] = { ...reagents[i], ...patch };
								onChange({ ...reaction, reagents });
							}}
							onRemove={() => onChange({ ...reaction, reagents: reaction.reagents.filter((_, j) => j !== i) })}
						/>
					))}
					<button
						type="button"
						className="btn-add"
						onClick={() => onChange({ ...reaction, reagents: [...reaction.reagents, makeReagent()] })}
					>
						+ Add reagent
					</button>

					<h4>Water</h4>
					<div className={`row water-row ${componentByKey.get("water")?.error ? "row-error" : ""}`}>
						<PresetSelect
							library={library}
							kinds={WATER_KINDS}
							onApply={(entry) =>
								onChange({
									...reaction,
									water: {
										...reaction.water,
										partName: entry.name,
										sourceWell: entry.sourceWell,
										sourceLocation: entry.sourceLocation,
									},
								})
							}
						/>
						<select
							value={reaction.water.mode}
							onChange={(e) => onChange({ ...reaction, water: { ...reaction.water, mode: e.target.value as "auto" | "fixed" } })}
						>
							<option value="auto">Auto-fill to total</option>
							<option value="fixed">Fixed volume</option>
						</select>
						<input
							className="field-well"
							type="text"
							list="well-options"
							placeholder="Well"
							value={reaction.water.sourceWell}
							onChange={(e) => onChange({ ...reaction, water: { ...reaction.water, sourceWell: e.target.value.toUpperCase() } })}
						/>
						<LocationSelect
							value={reaction.water.sourceLocation}
							onChange={(sourceLocation) => onChange({ ...reaction, water: { ...reaction.water, sourceLocation } })}
						/>
						{reaction.water.mode === "fixed" && (
							<input
								className="field-num"
								type="number"
								min="0"
								step="any"
								placeholder="µL"
								value={reaction.water.fixedVolumeUl}
								onChange={(e) => onChange({ ...reaction, water: { ...reaction.water, fixedVolumeUl: e.target.value } })}
							/>
						)}
						<span className="computed-volume">
							{componentByKey.get("water")?.volumeUl !== null && componentByKey.get("water")?.volumeUl !== undefined
								? `${componentByKey.get("water")?.volumeUl} µL`
								: ""}
						</span>
						{componentByKey.get("water")?.error && <div className="row-error-text">{componentByKey.get("water")?.error}</div>}
					</div>
				</div>
			)}

			<div className="card-footer">
				<span className={totalMismatch ? "total-mismatch" : "total-ok"}>
					Computed total: {Math.round(computed.totalComputedUl * 10) / 10} µL
					{computed.totalTargetUl !== null ? ` / ${computed.totalTargetUl} µL target` : ""}
				</span>
				{computed.errors.length > 0 && (
					<ul className="card-errors">
						{computed.errors.map((err, i) => (
							<li key={i}>{err}</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
