import { Fragment, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { chaletClient, useAuth } from "@/context/AuthContext";
import {
  BLOG_MEDIA_BUCKET,
  BLOG_IMAGE_LIMIT,
  mediaPath,
  safeImage,
  safeLink,
  safeColor,
  legacyRichContent,
  type RichNode,
} from "../../../../lib/shared/blog-content";

export async function uploadBlogImage(file: File) {
  const formats: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  if (!formats[file.type])
    throw Error("Choisissez une image JPG, PNG, WebP ou un GIF animé.");
  if (!file.size || file.size > BLOG_IMAGE_LIMIT)
    throw Error("L’image doit faire au maximum 8 Mo.");
  const client = await chaletClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw Error("Connectez-vous pour ajouter une image.");
  const path =
    session.user.id + "/" + crypto.randomUUID() + "." + formats[file.type];
  const { error } = await client.storage
    .from(BLOG_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "300",
    });
  if (error)
    throw Error(
      "L’image n’a pas pu être ajoutée. Vérifiez votre connexion et réessayez.",
    );
  return "blog-media:" + path;
}
export function BlogImage({
  src,
  alt = "",
  className,
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { user, isLoading } = useAuth();
  const path = mediaPath(src);
  const q = useQuery({
    queryKey: ["blog-image", path, user?.id],
    enabled: !!path && !isLoading,
    queryFn: async () => {
      const { data, error } = await (await chaletClient()).storage
        .from(BLOG_MEDIA_BUCKET)
        .createSignedUrl(path!, 300);
      if (error || !data?.signedUrl) throw Error("Image indisponible");
      return data.signedUrl;
    },
    staleTime: 240000,
    refetchInterval: 240000,
    retry: 1,
  });
  const url = path
    ? q.data
    : safeImage(src) || /^\/(?!\/)/.test(src)
      ? src
      : undefined;
  if (!url)
    return (
      <span
        className="blog-image-placeholder"
        role="img"
        aria-label={alt || "Image"}
      >
        {q.isError ? "Image indisponible" : "Chargement de l’image…"}
      </span>
    );
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}
export function BlogContent({
  rich,
  content,
}: {
  rich?: RichNode | null;
  content: string;
}) {
  function render(n: RichNode, key: number): ReactNode {
    if (n.type === "text") {
      let text: ReactNode = n.text;
      for (const m of n.marks ?? []) {
        if (m.type === "bold") text = <strong>{text}</strong>;
        if (m.type === "italic") text = <em>{text}</em>;
        if (m.type === "underline") text = <u>{text}</u>;
        if (m.type === "strike") text = <s>{text}</s>;
        if (m.type === "textStyle")
          text = (
            <span style={{ color: safeColor(m.attrs?.color) }}>{text}</span>
          );
        if (m.type === "highlight")
          text = (
            <mark style={{ backgroundColor: safeColor(m.attrs?.color) }}>
              {text}
            </mark>
          );
        if (m.type === "link" && safeLink(m.attrs?.href))
          text = (
            <a
              href={m.attrs?.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {text}
            </a>
          );
      }
      return <Fragment key={key}>{text}</Fragment>;
    }
    const children = n.content?.map(render);
    const style: CSSProperties = {
      textAlign: ["left", "center", "right", "justify"].includes(
        n.attrs?.textAlign,
      )
        ? n.attrs?.textAlign
        : undefined,
    };
    switch (n.type) {
      case "doc":
        return <Fragment key={key}>{children}</Fragment>;
      case "paragraph":
        return (
          <p key={key} style={style}>
            {children || <br />}
          </p>
        );
      case "heading":
        return n.attrs?.level === 2 ? (
          <h2 key={key} style={style}>
            {children}
          </h2>
        ) : (
          <h3 key={key} style={style}>
            {children}
          </h3>
        );
      case "hardBreak":
        return <br key={key} />;
      case "bulletList":
        return <ul key={key}>{children}</ul>;
      case "orderedList":
        return (
          <ol key={key} start={n.attrs?.start}>
            {children}
          </ol>
        );
      case "listItem":
        return <li key={key}>{children}</li>;
      case "blockquote":
        return <blockquote key={key}>{children}</blockquote>;
      case "horizontalRule":
        return <hr key={key} />;
      case "image":
        return safeImage(n.attrs?.src) ? (
          <figure
            key={key}
            style={{
              width:
                ([25, 50, 75, 100].includes(n.attrs?.width)
                  ? n.attrs?.width
                  : 100) + "%",
            }}
          >
            <BlogImage src={n.attrs!.src} alt={n.attrs?.alt} />
            {n.attrs?.title && <figcaption>{n.attrs.title}</figcaption>}
          </figure>
        ) : null;
      default:
        return null;
    }
  }
  return (
    <div className="blog-rich-content">
      {render(rich ?? legacyRichContent(content), 0)}
    </div>
  );
}
