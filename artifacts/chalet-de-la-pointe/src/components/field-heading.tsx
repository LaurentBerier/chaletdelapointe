const media = "/media/chalet/";
export function FieldHeading({
  kind,
  title,
  children,
}: {
  kind: "stay" | "journal";
  title: string;
  children?: React.ReactNode;
}) {
  const journal = kind === "journal";
  return (
    <header className={"field-heading field-" + kind}>
      <div className="field-heading-copy">
        <p className="eyebrow">
          <span aria-hidden="true" />
          {journal ? "Carnet du lac" : "Planifier un séjour"}
        </p>
        <h1>{title}</h1>
        {children && <p className="field-deck">{children}</p>}
      </div>
      <img
        src={media + (journal ? "pine.jpg" : "canoe.jpg")}
        width="480"
        height="320"
        alt=""
        aria-hidden="true"
      />
    </header>
  );
}
export function IllustratedNote({
  kind,
  children,
}: {
  kind: "canoe" | "pine";
  children: React.ReactNode;
}) {
  return (
    <div className="illustrated-note">
      <img
        src={media + kind + ".jpg"}
        alt=""
        width="480"
        height="320"
        loading="lazy"
      />
      <div>{children}</div>
    </div>
  );
}
