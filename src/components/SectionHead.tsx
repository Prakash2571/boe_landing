// Shared section heading (eyebrow + title + optional lead).
export default function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="section__head">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="section__title">{title}</h2>
      {lead ? <p className="section__lead">{lead}</p> : null}
    </div>
  );
}
