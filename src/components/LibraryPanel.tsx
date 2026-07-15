import { useState } from "react";
import { DNA_KINDS } from "../lib/goldenGate";
import { LIBRARY_KINDS, type LibraryEntry } from "../lib/types";
import LocationSelect from "./LocationSelect";

interface Props {
  library: LibraryEntry[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<LibraryEntry>) => void;
  onRemove: (id: string) => void;
}

export default function LibraryPanel({ library, onAdd, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="library-panel">
      <button type="button" className="library-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? "▾" : "▸"} Reagent &amp; part library
        <span className="library-count">{library.length}</span>
      </button>
      {expanded && (
        <div className="library-body">
          <p className="library-hint">
            Predefine named locations once (a backbone, an enzyme, water — whatever always lives in the same
            tube), then pick them from a dropdown wherever a row needs a name and well. Saved in this browser.
          </p>
          {library.length > 0 && (
            <div className="library-rows">
              <div className="library-row library-row-header">
                <span>Name</span>
                <span>Type</span>
                <span>Well</span>
                <span>Location</span>
                <span>ng/µL</span>
                <span>bp</span>
                <span />
              </div>
              {library.map((entry) => {
                const isDna = DNA_KINDS.includes(entry.kind);
                return (
                  <div className="library-row" key={entry.id}>
                    <input
                      type="text"
                      placeholder="Name"
                      value={entry.name}
                      onChange={(e) => onUpdate(entry.id, { name: e.target.value })}
                    />
                    <select value={entry.kind} onChange={(e) => onUpdate(entry.id, { kind: e.target.value as LibraryEntry["kind"] })}>
                      {LIBRARY_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      list="well-options"
                      placeholder="Well"
                      value={entry.sourceWell}
                      onChange={(e) => onUpdate(entry.id, { sourceWell: e.target.value.toUpperCase() })}
                    />
                    <LocationSelect
                      value={entry.sourceLocation}
                      onChange={(sourceLocation) => onUpdate(entry.id, { sourceLocation })}
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={isDna ? "ng/µL" : "—"}
                      disabled={!isDna}
                      value={entry.concNgUl ?? ""}
                      onChange={(e) => onUpdate(entry.id, { concNgUl: e.target.value })}
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={isDna ? "bp" : "—"}
                      disabled={!isDna}
                      value={entry.sizeBp ?? ""}
                      onChange={(e) => onUpdate(entry.id, { sizeBp: e.target.value })}
                    />
                    <button type="button" className="btn-remove" title="Remove" onClick={() => onRemove(entry.id)}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <button type="button" className="btn-add" onClick={onAdd}>
            + Add library entry
          </button>
        </div>
      )}
    </section>
  );
}
