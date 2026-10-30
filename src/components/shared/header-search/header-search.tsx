import { useNavigate } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/primitive/input-group/input-group";
import { Kbd } from "#/components/primitive/kbd/kbd";
import { m } from "#/paraglide/messages";

/*===== Header Search =====*/

/** Whether a key press happened while someone was typing, where `/` is just a character. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * The header's search field, on every signed-in page: Enter opens the search page with the text (`/search?q=`), where
 * a whole task code goes straight to its card. `/` anywhere outside a text field focuses it, as on most tools people
 * already know.
 */
export function HeaderSearch() {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = text.trim();
    if (!q) return;
    setText("");
    input.current?.blur();
    void navigate({ to: "/search", search: { q } });
  };

  return (
    <search className="w-64">
      <form onSubmit={submit}>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            ref={input}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
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
