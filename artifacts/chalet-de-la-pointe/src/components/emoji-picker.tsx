import { useState } from "react";
const groups = [
  {
    name: "Sourires",
    items: [
      "😀",
      "😃",
      "😊",
      "😂",
      "🤣",
      "🥰",
      "😍",
      "😎",
      "🤔",
      "😮",
      "😢",
      "😴",
    ],
  },
  {
    name: "Réactions",
    items: [
      "👍",
      "👎",
      "👏",
      "🙌",
      "👋",
      "🙏",
      "💪",
      "🤝",
      "❤️",
      "💚",
      "🎉",
      "✨",
    ],
  },
  {
    name: "Au chalet",
    items: [
      "🏡",
      "🌲",
      "🌳",
      "🍁",
      "🌿",
      "🌸",
      "☀️",
      "🌅",
      "🌧️",
      "❄️",
      "🔥",
      "🌙",
    ],
  },
  {
    name: "Activités",
    items: [
      "🛶",
      "🎣",
      "🏊",
      "🥾",
      "🚲",
      "⛷️",
      "🏂",
      "🏕️",
      "📷",
      "🎶",
      "📚",
      "🎲",
    ],
  },
  {
    name: "À table",
    items: [
      "☕",
      "🍷",
      "🍻",
      "🍽️",
      "🥐",
      "🥖",
      "🧀",
      "🍓",
      "🍎",
      "🍕",
      "🍰",
      "🍫",
    ],
  },
];
export function EmojiPicker({
  onPick,
  disabled = false,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [group, setGroup] = useState(0);
  return (
    <div className="emoji-picker">
      <button
        type="button"
        className="rich-tool"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        😊 <span>Émojis</span>
      </button>
      {open && (
        <div
          className="emoji-popover"
          role="group"
          aria-label="Choisir un émoji"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="emoji-categories">
            {groups.map((g, i) => (
              <button
                type="button"
                key={g.name}
                aria-pressed={group === i}
                onClick={() => setGroup(i)}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div className="emoji-grid">
            {groups[group].items.map((e) => (
              <button
                type="button"
                key={e}
                aria-label={"Insérer " + e}
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => setOpen(false)}
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
