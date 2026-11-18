import { useEffect, useRef, useState } from "react";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
  Eraser,
} from "lucide-react";
import {
  safeImage,
  safeColor,
  safeLink,
  type RichNode,
} from "../../../../lib/shared/blog-content";
import { BlogImage, uploadBlogImage } from "./blog-content";
import { EmojiPicker } from "./emoji-picker";

function ImageView({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      className={"rich-image-node" + (selected ? " is-selected" : "")}
      contentEditable={false}
      style={{ width: (node.attrs.width || 100) + "%" }}
    >
      <BlogImage src={node.attrs.src} alt={node.attrs.alt} />
      {node.attrs.title && (
        <span className="rich-image-caption">{node.attrs.title}</span>
      )}
    </NodeViewWrapper>
  );
}
const ChaletImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: 100, parseHTML: () => 100 },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    link: { openOnClick: false, protocols: ["https", "http", "mailto"] },
  }),
  ChaletImage.configure({ allowBase64: false }),
  TextStyle,
  Color,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight.configure({ multicolor: true }),
];
export function BlogEditor({
  initialContent,
  onChange,
  onBusyChange,
}: {
  initialContent: RichNode;
  onChange: (content: RichNode) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [panel, setPanel] = useState<"image" | "link" | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [url, setUrl] = useState(""),
    [alt, setAlt] = useState(""),
    [caption, setCaption] = useState("");
  const uploadRef = useRef<(file: File) => void>(() => {});
  const editor = useEditor({
    extensions,
    content: initialContent,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: "blog-rich-content rich-editable",
        role: "textbox",
        "aria-label": "Texte de la chronique",
        "aria-multiline": "true",
      },
      handlePaste: (_view, event) => {
        const file = event.clipboardData?.files[0];
        if (file) {
          uploadRef.current(file);
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files[0];
        if (file) {
          event.preventDefault();
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          if (pos) editor?.commands.setTextSelection(pos.pos);
          uploadRef.current(file);
          return true;
        }
        return false;
      },
    },
  });
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  async function upload(file: File) {
    if (busy || !editor) return;
    setBusy(true);
    setError("");
    try {
      const src = await uploadBlogImage(file);
      editor.chain().focus().setImage({ src, alt, title: caption }).run();
      setPanel(null);
      setAlt("");
      setCaption("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  uploadRef.current = (file) => {
    void upload(file);
  };
  if (!editor) return <p>Chargement de l’éditeur…</p>;
  function togglePanel(next: "image" | "link") {
    setError("");
    setUrl(next === "link" ? editor!.getAttributes("link").href || "" : "");
    setPanel(panel === next ? null : next);
  }
  const tool = (
    label: string,
    icon: React.ReactNode,
    action: () => unknown,
    active = false,
    disabled = false,
  ) => (
    <button
      key={label}
      type="button"
      className="rich-tool"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => action()}
    >
      {icon}
    </button>
  );
  return (
    <div className="rich-editor" data-testid="blog-editor">
      <div
        className="rich-toolbar"
        role="group"
        aria-label="Mise en forme du texte"
      >
        <select
          aria-label="Style de paragraphe"
          value={
            editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
          }
          onChange={(e) =>
            e.target.value === "p"
              ? editor.chain().focus().setParagraph().run()
              : editor
                  .chain()
                  .focus()
                  .setHeading({ level: e.target.value === "h2" ? 2 : 3 })
                  .run()
          }
        >
          <option value="p">Paragraphe</option>
          <option value="h2">Grand titre</option>
          <option value="h3">Sous-titre</option>
        </select>
        {tool(
          "Gras",
          <Bold />,
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
        )}
        {tool(
          "Italique",
          <Italic />,
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
        )}
        {tool(
          "Souligné",
          <Underline />,
          () => editor.chain().focus().toggleUnderline().run(),
          editor.isActive("underline"),
        )}
        {tool(
          "Barré",
          <Strikethrough />,
          () => editor.chain().focus().toggleStrike().run(),
          editor.isActive("strike"),
        )}
        <label className="rich-color" title="Couleur du texte">
          <span>A</span>
          <input
            aria-label="Couleur du texte"
            type="color"
            value={
              safeColor(editor.getAttributes("textStyle").color) || "#234e42"
            }
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
          />
        </label>
        <label className="rich-color highlight" title="Surlignage">
          <span>A</span>
          <input
            aria-label="Couleur du surlignage"
            type="color"
            value={
              safeColor(editor.getAttributes("highlight").color) || "#f4df98"
            }
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .setHighlight({ color: e.target.value })
                .run()
            }
          />
        </label>
        {tool(
          "Liste à puces",
          <List />,
          () => editor.chain().focus().toggleBulletList().run(),
          editor.isActive("bulletList"),
        )}
        {tool(
          "Liste numérotée",
          <ListOrdered />,
          () => editor.chain().focus().toggleOrderedList().run(),
          editor.isActive("orderedList"),
        )}
        {tool(
          "Citation",
          <Quote />,
          () => editor.chain().focus().toggleBlockquote().run(),
          editor.isActive("blockquote"),
        )}
        {tool(
          "Aligner à gauche",
          <AlignLeft />,
          () => editor.chain().focus().setTextAlign("left").run(),
          editor.isActive({ textAlign: "left" }),
        )}
        {tool(
          "Centrer",
          <AlignCenter />,
          () => editor.chain().focus().setTextAlign("center").run(),
          editor.isActive({ textAlign: "center" }),
        )}
        {tool(
          "Aligner à droite",
          <AlignRight />,
          () => editor.chain().focus().setTextAlign("right").run(),
          editor.isActive({ textAlign: "right" }),
        )}
        {tool(
          "Ajouter ou modifier un lien",
          <Link2 />,
          () => togglePanel("link"),
          editor.isActive("link"),
        )}
        {tool("Effacer la mise en forme", <Eraser />, () =>
          editor
            .chain()
            .focus()
            .unsetAllMarks()
            .clearNodes()
            .unsetTextAlign()
            .run(),
        )}
        {tool(
          "Annuler",
          <Undo2 />,
          () => editor.chain().focus().undo().run(),
          false,
          !editor.can().undo(),
        )}
        {tool(
          "Rétablir",
          <Redo2 />,
          () => editor.chain().focus().redo().run(),
          false,
          !editor.can().redo(),
        )}
      </div>
      <div className="rich-insert-bar">
        <button
          type="button"
          className="rich-tool"
          onClick={() => togglePanel("image")}
          aria-expanded={panel === "image"}
        >
          <ImagePlus size={17} /> Image / GIF
        </button>
        <EmojiPicker
          onPick={(emoji) =>
            editor
              .chain()
              .focus()
              .insertContent({ type: "text", text: emoji })
              .run()
          }
        />
        {editor.isActive("image") && (
          <>
            <label className="rich-size">
              Taille{" "}
              <select
                aria-label="Taille de l’image"
                value={editor.getAttributes("image").width || 100}
                onChange={(e) =>
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("image", {
                      width: Number(e.target.value),
                    })
                    .run()
                }
              >
                {[25, 50, 75, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}%
                  </option>
                ))}
              </select>
            </label>
            <button
              className="text-link"
              type="button"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            >
              Retirer l’image
            </button>
          </>
        )}
      </div>
      {panel === "image" && (
        <div
          className="rich-insert-panel"
          role="group"
          aria-label="Ajouter une image ou un GIF"
        >
          <div className="rich-input-pair">
            <label>
              Description de l’image
              <input
                value={alt}
                maxLength={300}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Pour les personnes utilisant un lecteur d’écran"
              />
            </label>
            <label>
              Légende (facultative)
              <input
                value={caption}
                maxLength={300}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
          </div>
          <label className="rich-file">
            Choisir une image ou un GIF
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="community-muted">
            JPG, PNG, WebP ou GIF animé · 8 Mo maximum. Vous pouvez aussi
            glisser une image dans le texte ou la coller.
          </p>
          <label>
            Ou coller le lien direct d’une image / d’un GIF
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/image.gif"
            />
          </label>
          <div className="button-row">
            <button
              className="secondary-action"
              type="button"
              disabled={busy || !url.trim()}
              onClick={() => {
                if (
                  !safeImage(url.trim()) ||
                  !url.trim().startsWith("https://")
                ) {
                  setError("Utilisez un lien HTTPS direct vers l’image.");
                  return;
                }
                editor
                  .chain()
                  .focus()
                  .setImage({ src: url.trim(), alt, title: caption })
                  .run();
                setPanel(null);
                setError("");
              }}
            >
              Insérer le lien de l’image
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setPanel(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
      {panel === "link" && (
        <div className="rich-insert-panel">
          <label>
            Adresse du lien
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                if (!safeLink(url.trim())) {
                  setError("Entrez un lien valide (https://…).");
                  return;
                }
                const chain = editor.chain().focus();
                if (editor.state.selection.empty && !editor.isActive("link"))
                  chain
                    .insertContent({
                      type: "text",
                      text: url.trim(),
                      marks: [{ type: "link", attrs: { href: url.trim() } }],
                    })
                    .run();
                else
                  chain
                    .extendMarkRange("link")
                    .setLink({ href: url.trim() })
                    .run();
                setPanel(null);
                setError("");
              }}
            >
              Appliquer le lien
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                setPanel(null);
              }}
            >
              Retirer le lien
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setPanel(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
      {busy && (
        <p role="status" className="rich-editor-status">
          Ajout de l’image…
        </p>
      )}
      {error && (
        <p role="alert" className="community-error rich-editor-status">
          {error}
        </p>
      )}
      <EditorContent editor={editor} />
      <div className="rich-editor-footer">
        <span>
          Les images téléversées restent privées jusqu’à la publication.
        </span>
        <span>
          {editor.getText().length.toLocaleString("fr-CA")} / 30 000 caractères
        </span>
      </div>
    </div>
  );
}
