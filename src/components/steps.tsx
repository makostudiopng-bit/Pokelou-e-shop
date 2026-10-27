const STEPS = ["Košík", "Doprava a platba", "Hotovo"];

/** Kroky nákupu: 0 = košík, 1 = pokladna, 2 = potvrzení */
export function Steps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Kroky nákupu" className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm font-extrabold">
      {STEPS.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className="rounded-full px-4 py-[7px]"
          style={
            i === current
              ? { background: "var(--surface-inverse)", color: "var(--ink-inverse)" }
              : i < current
                ? { background: "var(--brand-yellow)", color: "var(--on-yellow)" }
                : { background: "var(--surface-200)", color: "var(--ink-muted)" }
          }
        >
          {i < current ? "✓" : i + 1} · {s}
        </li>
      ))}
    </ol>
  );
}
