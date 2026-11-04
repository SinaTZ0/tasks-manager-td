import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/primitive/dialog/dialog";
import { Kbd, KbdGroup } from "#/components/primitive/kbd/kbd";
import { useShortcuts } from "#/hooks/use-shortcuts";
import { canEdit } from "#/lib/user-constants";
import { m } from "#/paraglide/messages";

/*===== Key List =====*/

type Row = { keys: string[]; label: () => string; who: "everyone" | "editors" | "admins" };
type Group = { title: () => string; rows: Row[] };

// Message functions, not their text, so each render reads the current locale.
const GROUPS: Group[] = [
  {
    title: m.shortcut_group_anywhere,
    rows: [
      { keys: ["g", "b"], label: m.shortcut_go_board, who: "everyone" },
      { keys: ["g", "m"], label: m.shortcut_go_mine, who: "everyone" },
      { keys: ["g", "d"], label: m.shortcut_go_delegated, who: "everyone" },
      { keys: ["/"], label: m.shortcut_search, who: "everyone" },
      { keys: ["?"], label: m.shortcut_help, who: "everyone" },
    ],
  },
  {
    title: m.shortcut_group_board,
    rows: [
      { keys: ["n"], label: m.shortcut_new_card, who: "admins" },
      { keys: ["Ctrl", "b"], label: m.shortcut_toggle_panel, who: "everyone" },
    ],
  },
  {
    title: m.shortcut_group_card,
    rows: [
      { keys: ["e"], label: m.shortcut_edit_title, who: "editors" },
      { keys: ["c"], label: m.shortcut_comment, who: "editors" },
      { keys: ["m"], label: m.shortcut_assign_me, who: "editors" },
      { keys: ["Esc"], label: m.shortcut_close, who: "everyone" },
    ],
  },
];

/*===== Shortcut Help =====*/

/**
 * The shortcuts every signed-in page has (docs/task-manager-plan.md → slice 18): `g` then `b`, `m` or `d` to the
 * board, My Tasks or Delegated, and `?` for a dialog listing the keys the viewer's role can use. `g b` goes to the
 * board of the project being looked at, or to the projects list outside one. The board and the drawer register their
 * own keys.
 */
export function ShortcutHelp({ role }: { role: string | null | undefined }) {
  const navigate = useNavigate();
  const { projectKey } = useParams({ strict: false });
  const [open, setOpen] = useState(false);

  useShortcuts([
    { code: "Slash", shift: true, run: () => setOpen(true) },
    {
      code: "KeyB",
      after: "KeyG",
      run: () =>
        void (projectKey ? navigate({ to: "/projects/$projectKey", params: { projectKey } }) : navigate({ to: "/" })),
    },
    { code: "KeyM", after: "KeyG", run: () => void navigate({ to: "/my-tasks" }) },
    { code: "KeyD", after: "KeyG", run: () => void navigate({ to: "/delegated" }) },
  ]);

  const allowed = (who: Row["who"]) => who === "everyone" || (who === "editors" ? canEdit(role) : role === "admin");
  const groups = GROUPS.map((group) => ({ ...group, rows: group.rows.filter((row) => allowed(row.who)) })).filter(
    (group) => group.rows.length > 0,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{m.shortcut_title()}</DialogTitle>
        </DialogHeader>
        {groups.map((group) => (
          <section key={group.title()} className="flex flex-col gap-2">
            <h3 className="text-body-sm font-semibold">{group.title()}</h3>
            <dl className="flex flex-col gap-1.5">
              {group.rows.map((row) => (
                <div key={row.keys.join(" ")} className="flex items-center justify-between gap-4">
                  <dt className="text-body-sm">{row.label()}</dt>
                  <dd>
                    <KbdGroup>
                      {row.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
