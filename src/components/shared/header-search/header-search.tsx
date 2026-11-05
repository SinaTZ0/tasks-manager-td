import { useMatch, useNavigate } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/primitive/input-group/input-group";
import { Kbd } from "#/components/primitive/kbd/kbd";
import { useSearchText } from "#/hooks/use-search-text";
import { m } from "#/paraglide/messages";

/*===== Header Search =====*/

const BOARD_ROUTE_ID = "/_site-layout/_app-layout/projects/$projectKey";

/** How long typing must pause before the board filters: long enough that a word lands in one go. */
const BOARD_SEARCH_PAUSE_MS = 700;

/** Whether a key press happened while someone was typing, where `/` is just a character. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * The header's search field, on every signed-in page. On a project's board it filters the cards as you type; anywhere
 * else Enter opens the search page. `/` anywhere outside a text field focuses it, as on most tools people already know.
 */
export function HeaderSearch() {
  const input = useRef<HTMLInputElement>(null);
  const board = useMatch({ from: BOARD_ROUTE_ID, shouldThrow: false });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keyed by project: text still waiting out its pause must not land on the next board.
  return board ? (
    <BoardSearch key={board.params.projectKey} input={input} q={board.search.q ?? ""} />
  ) : (
    <SiteSearch input={input} />
  );
}

/*===== Modes =====*/

/** Filters the board in view through `?q=` after a pause in typing, or at once on Enter. The page never changes. */
function BoardSearch({ input, q }: { input: RefObject<HTMLInputElement | null>; q: string }) {
  const navigate = useNavigate({ from: "/projects/$projectKey" });
  const commit = (text: string) =>
    void navigate({ search: (previous) => ({ ...previous, q: text || undefined }), replace: true });
  const [text, setText] = useSearchText({ value: q, onCommit: commit, delay: BOARD_SEARCH_PAUSE_MS });

  return <SearchField input={input} text={text} onTextChange={setText} onEnter={() => commit(text.trim())} />;
}

/** Enter opens the search page with the text (`/search?q=`), where a whole task code goes straight to its card. */
function SiteSearch({ input }: { input: RefObject<HTMLInputElement | null> }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  const open = () => {
    const q = text.trim();
    if (!q) return;
    setText("");
    input.current?.blur();
    void navigate({ to: "/search", search: { q } });
  };

  return <SearchField input={input} text={text} onTextChange={setText} onEnter={open} />;
}

/*===== Field =====*/

function SearchField({
  input,
  text,
  onTextChange,
  onEnter,
}: {
  input: RefObject<HTMLInputElement | null>;
  text: string;
  onTextChange: (text: string) => void;
  onEnter: () => void;
}) {
  return (
    <search className="w-64">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onEnter();
        }}
      >
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            ref={input}
            type="search"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={m.search_placeholder()}
            aria-label={m.search_label()}
            aria-keyshortcuts="/"
            autoComplete="off"
          />
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </search>
  );
}
