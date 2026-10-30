import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Popover, PopoverContent } from "#/components/primitive/popover/popover";
import type { MentionSuggestion } from "#/lib/rich-text";
import type { Person } from "#/orpc/project/contract";

/*===== Types =====*/

/** How many people the picker lists at once. */
const MAX_ITEMS = 6;

type Picking = {
  items: Person[];
  index: number;
  rect: (() => DOMRect | null) | null | undefined;
  pick: (person: Person) => void;
};

/*===== Mention Picker =====*/

/**
 * The `@` picker for a comment editor (docs/app.md → Comments: `@mention` a user): typing `@` and part of a name lists
 * the project's active members who match, under the caret. Arrow keys move through them, Enter or Tab picks one, Escape
 * closes it; the caret stays in the editor all along, so typing goes on as before.
 *
 * @returns `mention`, for the editor's `mention` prop (read once, so it reads the members and state through refs), and
 * `picker`, to render beside the editor.
 */
export function useMentionPicker(members: Person[]): { mention: MentionSuggestion; picker: ReactNode } {
  const [picking, setPicking] = useState<Picking | null>(null);
  // Tiptap calls these after render, from the editor's own events.
  const latest = useRef({ members, picking });
  useEffect(() => {
    latest.current = { members, picking };
  }, [members, picking]);

  const [mention] = useState<MentionSuggestion>(() => {
    const show = (props: SuggestionProps<Person, { id: string; label: string }>) =>
      setPicking((previous) => ({
        items: props.items,
        index: Math.min(previous?.index ?? 0, Math.max(0, props.items.length - 1)),
        rect: props.clientRect,
        pick: (person) => props.command({ id: person.id, label: person.name }),
      }));
    return {
      char: "@",
      items: ({ query }: { query: string }) => {
        const wanted = query.trim().toLowerCase();
        return latest.current.members
          .filter((person) => person.status === "active" && person.name.toLowerCase().includes(wanted))
          .slice(0, MAX_ITEMS);
      },
      render: () => {
        return {
          onStart: show,
          onUpdate: show,
          onExit: () => setPicking(null),
          onKeyDown: ({ event }: SuggestionKeyDownProps) => {
            const current = latest.current.picking;
            if (!current || current.items.length === 0) return false;
            const count = current.items.length;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              const step = event.key === "ArrowDown" ? 1 : -1;
              setPicking({ ...current, index: (current.index + step + count) % count });
              return true;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              const person = current.items[current.index];
              if (person) current.pick(person);
              return true;
            }
            if (event.key === "Escape") {
              setPicking(null);
              return true;
            }
            return false;
          },
        };
      },
    };
  });

  const open = picking !== null && picking.items.length > 0;
  const picker = (
    <Popover open={open} onOpenChange={(next) => !next && setPicking(null)}>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-64"
        anchor={{ getBoundingClientRect: () => picking?.rect?.() ?? new DOMRect() }}
        // The caret stays in the editor: the keys reach the picker through the editor (`onKeyDown`).
        initialFocus={false}
        finalFocus={false}
      >
        <ul className="-m-2 flex flex-col">
          {picking?.items.map((person, index) => (
            <li key={person.id} className="flex">
              {/* Out of the tab order: the keyboard picks through the editor; these serve the pointer. */}
              <button
                type="button"
                tabIndex={-1}
                data-active={index === picking.index || undefined}
                // Pressing must not move focus out of the editor before the pick.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => picking.pick(person)}
                className="flex-1 cursor-default rounded-chassis px-3 py-2 text-start text-body-sm outline-none data-active:bg-accent data-active:text-accent-foreground"
              >
                {person.name}
              </button>
            </li>
          ))}
        </ul>
        {/* The caret never leaves the editor, so the highlighted name is read out from here. */}
        <p aria-live="polite" className="sr-only">
          {picking?.items[picking.index]?.name}
        </p>
      </PopoverContent>
    </Popover>
  );

  return { mention, picker };
}
