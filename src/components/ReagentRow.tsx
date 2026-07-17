import { REAGENT_ROLES, type LibraryEntry, type ReagentInput } from "../lib/types";
import type { ComputedComponent } from "../lib/goldenGate";
import { REAGENT_KINDS } from "../lib/goldenGate";
import PresetSelect from "./PresetSelect";
import LocationSelect from "./LocationSelect";

interface Props {
	reagent: ReagentInput;
	computed?: ComputedComponent;
	library: LibraryEntry[];
	onChange: (patch: Partial<ReagentInput>) => void;
	onRemove: () => void;
}

export default function ReagentRow({ reagent, computed, library, onChange, onRemove }: Props) {
	return (
		<div className={`row reagent-row ${computed?.error ? "row-error" : ""}`}>
			<PresetSelect
				library={library}
				kinds={REAGENT_KINDS}
				onApply={(entry: LibraryEntry) =>
					onChange({
						role: entry.kind as ReagentInput["role"],
						partName: entry.name,
						sourceWell: entry.sourceWell,
						sourceLocation: entry.sourceLocation,
					})
				}
			/>
			<select value={reagent.role} onChange={(e) => onChange({ role: e.target.value as ReagentInput["role"] })}>
				{REAGENT_ROLES.map((role) => (
					<option key={role} value={role}>
						{role}
					</option>
				))}
			</select>
			<input
				autoComplete="off"
				className="field-name"
				type="text"
				placeholder="Reagent name"
				value={reagent.partName}
				onChange={(e) => onChange({ partName: e.target.value })}
			/>
			<input
				autoComplete="off"
				className="field-well"
				type="text"
				list={reagent.sourceLocation === "rack" ? "well-options-eppendorf" : "well-options"}
				placeholder="Well"
				value={reagent.sourceWell}
				onChange={(e) => onChange({ sourceWell: e.target.value.toUpperCase() })}
			/>
			<LocationSelect value={reagent.sourceLocation} onChange={(sourceLocation) => onChange({ sourceLocation })} />
			<input
				autoComplete="off"
				className="field-num"
				type="number"
				min="0"
				step="any"
				placeholder="µL"
				value={reagent.fixedVolumeUl}
				onChange={(e) => onChange({ fixedVolumeUl: e.target.value })}
			/>
			<span className="computed-volume">
				{computed?.volumeUl !== null && computed?.volumeUl !== undefined ? `${computed.volumeUl} µL` : ""}
			</span>
			<button type="button" className="btn-remove" title="Remove" onClick={onRemove}>
				×
			</button>
			{computed?.error && <div className="row-error-text">{computed.error}</div>}
		</div>
	);
}
