import type { LibraryEntry, LibraryKind } from "../lib/types";

interface Props {
	library: LibraryEntry[];
	kinds: LibraryKind[];
	onApply: (entry: LibraryEntry) => void;
}

/**
 * A "quick fill" dropdown: picking an entry copies its fields into the row
 * once, then resets back to the placeholder. It's not a live link — the row
 * stays a normal, freely-editable set of fields afterward.
 */
export default function PresetSelect({ library, kinds, onApply }: Props) {
	const options = library.filter((entry) => kinds.includes(entry.kind));

	return (
		<select
			className="preset-select"
			value=""
			disabled={options.length === 0}
			title={options.length === 0 ? "No matching library entries yet" : "Fill from library"}
			onChange={(e) => {
				const entry = options.find((o) => o.id === e.target.value);
				if (entry) onApply(entry);
			}}
		>
			<option value="">{options.length === 0 ? "(no presets)" : "Preset…"}</option>
			{options.map((entry) => (
				<option key={entry.id} value={entry.id}>
					{entry.name || "(unnamed)"} — {entry.sourceWell || "?"}
				</option>
			))}
		</select>
	);
}
