export function PageHeader({ eyebrow, title, children }) {
    return (<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-sm text-wa">{eyebrow}</p>}
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
      </div>
      {children}
    </div>);
}
