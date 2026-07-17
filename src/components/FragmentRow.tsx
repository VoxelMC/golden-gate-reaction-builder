import type { FragmentInput, LibraryEntry } from "../lib/types";
import type { ComputedComponent } from "../lib/goldenGate";
import { DNA_KINDS } from "../lib/goldenGate";
import PresetSelect from "./PresetSelect";
import LocationSelect from "./LocationSelect";

interface Props {
	fragment: FragmentInput;
	computed?: ComputedComponent;
	isBackbone?: boolean;
	library: LibraryEntry[];
	onChange: (patch: Partial<FragmentInput>) => void;
	onRemove?: () => void;
}

export default function FragmentRow({ fragment, computed, isBackbone, library, onChange, onRemove }: Props) {
	return (
		<div className={`row fragment-row ${computed?.error ? "row-error" : ""}`}>
			<PresetSelect
				library={library}
				kinds={DNA_KINDS}
				onApply={(entry: LibraryEntry) =>
					onChange({
						partName: entry.name,
						sourceWell: entry.sourceWell,
						sourceLocation: entry.sourceLocation,
						concNgUl: entry.concNgUl ?? "",
						sizeBp: entry.sizeBp ?? "",
					})
				}
			/>
			<input
				className="field-name"
				autoComplete="off"
				type="text"
				placeholder={isBackbone ? "Backbone name" : "Insert name"}
				value={fragment.partName}
				onChange={(e) => onChange({ partName: e.target.value })}
			/>
			<input
				className="field-well"
				autoComplete="off"
				type="text"
				list={fragment.sourceLocation === "rack" ? "well-options-eppendorf" : "well-options"}
				placeholder="Well"
				value={fragment.sourceWell}
				onChange={(e) => onChange({ sourceWell: e.target.value.toUpperCase() })}
			/>
			<LocationSelect value={fragment.sourceLocation} onChange={(sourceLocation) => onChange({ sourceLocation })} />
			<input
				className="field-num"
				type="number"
				autoComplete="off"
				min="0"
				step="any"
				placeholder="ng/µL"
				value={fragment.concNgUl}
				onChange={(e) => onChange({ concNgUl: e.target.value })}
			/>
			<input
				className="field-num"
				type="number"
				autoComplete="off"
				min="0"
				step="any"
				placeholder="bp"
				value={fragment.sizeBp}
				onChange={(e) => onChange({ sizeBp: e.target.value })}
			/>
			{isBackbone ? (
				<span className="field-ratio-fixed" title="Backbone molar ratio is always 1">
					1×
				</span>
			) : (
				<input
					className="field-num field-ratio"
					type="number"
					min="0"
					step="any"
					autoComplete="off"
					placeholder="ratio"
					value={fragment.molarRatio}
					onChange={(e) => onChange({ molarRatio: e.target.value })}
				/>
			)}
			<span className="computed-volume">
				{computed?.volumeUl !== null && computed?.volumeUl !== undefined
					? `${computed.volumeUl} µL`
					: computed?.error
						? "—"
						: ""}
			</span>
			{onRemove ? (
				<button type="button" className="btn-remove" title="Remove" onClick={onRemove}>
					×
				</button>
			) : (
				<span className="btn-remove-spacer" />
			)}
			{computed?.error && <div className="row-error-text">{computed.error}</div>}
		</div>
	);
}
