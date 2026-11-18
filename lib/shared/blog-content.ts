export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  content?: RichNode[];
};
export const BLOG_MEDIA_BUCKET = "blog-media";
export const BLOG_IMAGE_LIMIT = 8 * 1024 * 1024;
export function mediaPath(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const path = src.replace(/^blog-media:/, "");
  return src.startsWith("blog-media:") &&
    /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\.(?:png|jpg|webp|gif)$/.test(
      path,
    )
    ? path
    : null;
}
export function safeImage(src: unknown): boolean {
  if (mediaPath(src)) return true;
  if (typeof src !== "string" || src.length > 2000) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function safeLink(href: unknown): boolean {
  if (typeof href !== "string" || href.length > 2000) return false;
  try {
    const u = new URL(href);
    return (
      ["https:", "http:", "mailto:"].includes(u.protocol) &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
export function safeColor(color: unknown): string | undefined {
  if (typeof color !== "string") return;
  if (/^#[\da-f]{6}$/i.test(color)) return color.toLowerCase();
  const rgb = /^rgb\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\s*\)$/.exec(color);
  if (rgb && rgb.slice(1).every((n) => Number(n) <= 255))
    return (
      "#" +
      rgb
        .slice(1)
        .map((n) => Number(n).toString(16).padStart(2, "0"))
        .join("")
    );
  return undefined;
}
export function legacyRichContent(text: string): RichNode {
  return {
    type: "doc",
    content: text
      .split(/\n\n+/)
      .filter(Boolean)
      .map((block) => {
        const heading = block.startsWith("**") && block.endsWith("**");
        const source = heading ? block.slice(2, -2) : block;
        const content: RichNode[] = [];
        source.split(/(\*\*[^*]+\*\*|\n)/).forEach((part) => {
          if (part === "\n") content.push({ type: "hardBreak" });
          else if (part)
            content.push({
              type: "text",
              text:
                part.startsWith("**") && part.endsWith("**")
                  ? part.slice(2, -2)
                  : part,
              ...(part.startsWith("**") && part.endsWith("**")
                ? { marks: [{ type: "bold" }] }
                : {}),
            });
        });
        return {
          type: heading ? "heading" : "paragraph",
          ...(heading ? { attrs: { level: 3 } } : {}),
          ...(content.length ? { content } : {}),
        };
      }),
  };
}
// Rebuild only the supported document grammar. No user HTML is stored/rendered.
export function parseRichContent(value: unknown) {
  let nodes = 0,
    length = 0,
    images = 0;
  const paths = new Set<string>();
  const fail = (): never => {
    throw Error("Le texte contient une mise en forme non prise en charge.");
  };
  const block = [
    "paragraph",
    "heading",
    "blockquote",
    "bulletList",
    "orderedList",
    "image",
    "horizontalRule",
  ];
  function clean(input: any, parent: string, depth: number): RichNode {
    if (!input || typeof input !== "object" || ++nodes > 5000 || depth > 15)
      return fail();
    const type = input.type;
    const allowed =
      parent === "root"
        ? ["doc"]
        : parent === "doc" || parent === "blockquote" || parent === "listItem"
          ? block
          : parent === "bulletList" || parent === "orderedList"
            ? ["listItem"]
            : parent === "paragraph" || parent === "heading"
              ? ["text", "hardBreak"]
              : [];
    if (!allowed.includes(type)) return fail();
    const out: RichNode = { type };
    if (type === "text") {
      if (
        typeof input.text !== "string" ||
        !input.text ||
        (length += input.text.length) > 30000
      )
        return fail();
      out.text = input.text;
      if (input.marks) {
        if (!Array.isArray(input.marks) || input.marks.length > 8)
          return fail();
        out.marks = input.marks.map((m: any) => {
          if (["bold", "italic", "underline", "strike"].includes(m?.type))
            return { type: m.type };
          if (m?.type === "link" && safeLink(m.attrs?.href))
            return {
              type: "link",
              attrs: {
                href: m.attrs.href,
                target: "_blank",
                rel: "noopener noreferrer nofollow",
              },
            };
          if (m?.type === "textStyle" && safeColor(m.attrs?.color))
            return {
              type: "textStyle",
              attrs: { color: safeColor(m.attrs.color) },
            };
          if (m?.type === "highlight" && safeColor(m.attrs?.color))
            return {
              type: "highlight",
              attrs: { color: safeColor(m.attrs.color) },
            };
          return fail();
        });
      }
    }
    if (["paragraph", "heading"].includes(type)) {
      out.attrs = {
        textAlign: ["left", "center", "right", "justify"].includes(
          input.attrs?.textAlign,
        )
          ? input.attrs.textAlign
          : "left",
      };
      if (type === "heading") {
        if (![2, 3].includes(input.attrs?.level)) return fail();
        out.attrs.level = input.attrs.level;
      }
    }
    if (type === "orderedList")
      out.attrs = {
        start:
          Number.isInteger(input.attrs?.start) &&
          input.attrs.start > 0 &&
          input.attrs.start < 10000
            ? input.attrs.start
            : 1,
      };
    if (type === "image") {
      if (++images > 12 || !safeImage(input.attrs?.src)) return fail();
      const path = mediaPath(input.attrs.src);
      if (path) paths.add(path);
      out.attrs = {
        src: input.attrs.src,
        alt:
          typeof input.attrs.alt === "string"
            ? input.attrs.alt.slice(0, 300)
            : "",
        title:
          typeof input.attrs.title === "string"
            ? input.attrs.title.slice(0, 300)
            : "",
        width: [25, 50, 75, 100].includes(input.attrs.width)
          ? input.attrs.width
          : 100,
      };
    }
    if (input.content !== undefined) {
      if (
        !Array.isArray(input.content) ||
        ["text", "hardBreak", "image", "horizontalRule"].includes(type)
      )
        return fail();
      out.content = input.content.map((n: any) => clean(n, type, depth + 1));
    }
    if (
      ["doc", "blockquote", "bulletList", "orderedList", "listItem"].includes(
        type,
      ) &&
      !out.content?.length
    )
      return fail();
    return out;
  }
  const document = clean(value, "root", 0);
  function plain(n: RichNode): string {
    return (
      n.text ??
      (n.type === "hardBreak"
        ? "\n"
        : (n.content ?? [])
            .map(plain)
            .join(["paragraph", "heading"].includes(n.type) ? "" : "\n"))
    );
  }
  const text = plain(document).trim();
  if (!text && !images)
    throw Error("Ajoutez du texte ou une image à votre chronique.");
  if (JSON.stringify(document).length > 120000)
    throw Error("Cette chronique est trop longue.");
  return { document, text: text || "Image partagée", mediaPaths: [...paths] };
}
