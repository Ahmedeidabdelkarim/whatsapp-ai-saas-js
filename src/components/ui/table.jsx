export function DataTable({ head, children }) {
    return (<div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-mute">{head.map((h) => <th key={h} className="pb-3 text-start font-medium">{h}</th>)}</tr></thead>
        <tbody className="[&_td]:py-3 [&_tr]:border-t [&_tr]:border-line/60">{children}</tbody>
      </table>
    </div>);
}
