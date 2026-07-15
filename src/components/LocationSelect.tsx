import type { SourceLocation } from "../lib/types";

interface Props {
  value: SourceLocation;
  onChange: (value: SourceLocation) => void;
}

const LABELS: Record<SourceLocation, string> = {
  rack: "Rack",
  module: "Module",
};

/** Rack vs. temperature-module toggle, shared by every row that has a source well. */
export default function LocationSelect({ value, onChange }: Props) {
  return (
    <select
      className="location-select"
      title="Which rack this well is on"
      value={value}
      onChange={(e) => onChange(e.target.value as SourceLocation)}
    >
      {(Object.keys(LABELS) as SourceLocation[]).map((loc) => (
        <option key={loc} value={loc}>
          {LABELS[loc]}
        </option>
      ))}
    </select>
  );
}
