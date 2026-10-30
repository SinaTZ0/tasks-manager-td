import type { Editor } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  Undo2Icon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from "react";

import { EMPTY_RICH_TEXT, richTextExtensions, type MentionSuggestion, type RichTextDoc } from "#/lib/rich-text";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";

import { Button } from "../button/button";
import { Input } from "../input/input";
import { Label } from "../label/label";
import { Popover, PopoverContent, PopoverTrigger } from "../popover/popover";
import { Toggle } from "../toggle/toggle";
import {
  richTextEditorContentClasses,
  richTextEditorControlClasses,
  richTextEditorDividerClasses,
  richTextEditorLinkFormClasses,
  richTextEditorSurfaceClasses,
  richTextEditorToolbarClasses,
} from "./rich-text-editor.styles";

/*===== Types =====*/

export type RichTextEditorProps = {
  /** The document to show. `null` is an empty editor. */
  value: RichTextDoc | null;
  /** Called with the whole document after every change. Store it as is: the editor ignores its own echo. */
  onChange: (doc: RichTextDoc) => void;
  placeholder?: string;
  /**
   * Put on the writing surface. A `<label htmlFor={id}>` (FieldLabel) then names it and focuses it on click, which a
   * label can't do for a content-editable element by itself.
   */
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  /** Puts the caret at the end once the editor is ready. */
  autoFocus?: boolean;
  /** The picker `@` opens, to mention someone (`richTextExtensions`). Read once, on the first render. */
  mention?: MentionSuggestion;
  /** Ctrl+Enter (⌘+Enter on a Mac): send a comment without reaching for the mouse. */
  onSubmit?: () => void;
  /** Layout only (width, margins, grid placement): it goes on the plate. */
  className?: string;
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/*===== Toolbar State =====*/

/** What the toolbar shows, read from the editor on every transaction. */
function readToolbarState(editor: Editor | null) {
  return {
    bold: editor?.isActive("bold") ?? false,
    italic: editor?.isActive("italic") ?? false,
    strike: editor?.isActive("strike") ?? false,
    code: editor?.isActive("code") ?? false,
    bulletList: editor?.isActive("bulletList") ?? false,
    orderedList: editor?.isActive("orderedList") ?? false,
    blockquote: editor?.isActive("blockquote") ?? false,
    link: editor?.isActive("link") ?? false,
    canUndo: editor?.can().undo() ?? false,
    canRedo: editor?.can().redo() ?? false,
  };
}

type ToolbarState = ReturnType<typeof readToolbarState>;

/*===== Surface Attributes =====*/

type SurfaceProps = Pick<
  RichTextEditorProps,
  "id" | "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid" | "disabled"
>;

/** The writing surface's attributes: its look, its role, and what names and describes it. */
function surfaceAttributes(props: SurfaceProps, labelId: string | undefined): Record<string, string> {
  const attributes: Record<string, string> = {
    class: richTextEditorSurfaceClasses,
    role: "textbox",
    "aria-multiline": "true",
  };
  const labelledBy = props["aria-labelledby"] ?? (props["aria-label"] ? undefined : labelId);
  if (props.id) attributes.id = props.id;
  if (props["aria-label"]) attributes["aria-label"] = props["aria-label"];
  if (labelledBy) attributes["aria-labelledby"] = labelledBy;
  if (props["aria-describedby"]) attributes["aria-describedby"] = props["aria-describedby"];
  if (props["aria-invalid"]) attributes["aria-invalid"] = "true";
  if (props.disabled) attributes["aria-disabled"] = "true";
  return attributes;
}

/*===== Rich Text Editor =====*/

/**
 * Writes a task's description or a comment: a Tiptap editor seated in a field plate, with a toolbar of compact keys
 * across its top. Formatting keys latch (sunk while the mark is on) without LEDs, since a dense toolbar can't carry one
 * per key. Each paragraph takes the direction of its own text, so English lines inside Persian read left to right.
 *
 * It renders nothing editable on the server (`immediatelyRender: false`): the plate and toolbar keep their size, and the
 * surface fills in after hydration. The saved document is drawn by `RichText`, which looks the same.
 */
function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  autoFocus = false,
  mention,
  onSubmit,
  className,
  ...surface
}: RichTextEditorProps) {
  /*------ Latest Props ------*/
  // Tiptap reads its options once, when the editor is made. Callbacks and attributes that change later are read
  // through this ref when Tiptap calls them, never during render.
  const latest = useRef<{
    onChange: RichTextEditorProps["onChange"];
    onSubmit: RichTextEditorProps["onSubmit"];
    placeholder: string | undefined;
    surface: SurfaceProps;
    labelId: string;
  }>({ onChange, onSubmit, placeholder, surface: { ...surface, disabled }, labelId: "" });
  // The document this editor last reported, so the same object coming back as `value` isn't written over the caret.
  const lastEmitted = useRef<RichTextDoc | null>(value);
  const surfaceKey = JSON.stringify({ ...surface, disabled });

  /*------ Editor ------*/
  const editor = useEditor({
    immediatelyRender: false,
    // The toolbar subscribes to what it needs (`useEditorState`); the rest of the component doesn't redraw per key.
    shouldRerenderOnTransaction: false,
    extensions: [
      ...richTextExtensions({ mention }),
      // Read when Tiptap draws the placeholder, after render.
      // oxlint-disable-next-line react/refs
      Placeholder.configure({ placeholder: () => latest.current.placeholder ?? "" }),
    ],
    content: value ?? EMPTY_RICH_TEXT,
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: () => surfaceAttributes(latest.current.surface, latest.current.labelId || undefined),
      handleKeyDown: (_view, event) => {
        const submit = latest.current.onSubmit;
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || !submit) return false;
        submit();
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const doc = current.getJSON();
      lastEmitted.current = doc;
      latest.current.onChange(doc);
    },
  });

  useEffect(() => {
    latest.current.onChange = onChange;
    latest.current.onSubmit = onSubmit;
    latest.current.placeholder = placeholder;
  }, [latest, onChange, onSubmit, placeholder]);

  // A new `aria-invalid`, description or disabled state: store it, then ask the view to redraw its attributes.
  useEffect(() => {
    latest.current.surface = JSON.parse(surfaceKey) as SurfaceProps;
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!latest.current.surface.disabled, false);
      editor.view.setProps({});
    }
  }, [latest, editor, surfaceKey]);

  /*------ Outside Changes ------*/
  // A form reset or a document loaded later replaces the content; the editor's own echo is skipped.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value ?? EMPTY_RICH_TEXT, { emitUpdate: false });
  }, [editor, value]);

  /*------ Label ------*/
  // A label can only name and focus form controls. For a content-editable surface its `for` is honoured by hand: the
  // label gets an id the surface points at, and a click on it moves the caret in.
  const { id } = surface;
  useEffect(() => {
    if (!id || !editor || editor.isDestroyed) return;
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    if (!label) return;
    label.id ||= `${id}-label`;
    latest.current.labelId = label.id;
    editor.view.setProps({});
    const focus = () => editor.commands.focus();
    label.addEventListener("click", focus);
    return () => label.removeEventListener("click", focus);
  }, [latest, id, editor]);

  return (
    <div
      data-slot="rich-text-editor"
      data-disabled={disabled || undefined}
      className={cn(richTextEditorControlClasses, className)}
    >
      <RichTextToolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} className={richTextEditorContentClasses} />
    </div>
  );
}

/*===== Toolbar =====*/

type ToolbarKey = { key: keyof ToolbarState; label: string; icon: IconComponent; run: (editor: Editor) => void };

// Message functions are called in render (`label`), so each request gets its own locale.
const MARK_KEYS = [
  { key: "bold", label: m.rich_text_bold, icon: BoldIcon, run: (e: Editor) => e.chain().focus().toggleBold().run() },
  {
    key: "italic",
    label: m.rich_text_italic,
    icon: ItalicIcon,
    run: (e: Editor) => e.chain().focus().toggleItalic().run(),
  },
  {
    key: "strike",
    label: m.rich_text_strike,
    icon: StrikethroughIcon,
    run: (e: Editor) => e.chain().focus().toggleStrike().run(),
  },
  { key: "code", label: m.rich_text_code, icon: CodeIcon, run: (e: Editor) => e.chain().focus().toggleCode().run() },
] as const;

const BLOCK_KEYS = [
  {
    key: "bulletList",
    label: m.rich_text_bullet_list,
    icon: ListIcon,
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
  },
  {
    key: "orderedList",
    label: m.rich_text_ordered_list,
    icon: ListOrderedIcon,
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    key: "blockquote",
    label: m.rich_text_quote,
    icon: QuoteIcon,
    run: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
] as const;

/**
 * The formatting keys, in Base UI's toolbar: one tab stop for the whole row and arrow keys along it (the ARIA toolbar
 * pattern, mirrored in Persian), so Tab goes from the toolbar straight to the text.
 */
function RichTextToolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => readToolbarState(current) });
  const off = disabled || !editor;

  const latchKey = (item: Omit<ToolbarKey, "label"> & { label: () => string }) => {
    const Icon = item.icon;
    const label = item.label();
    return (
      <ToolbarPrimitive.Button
        key={item.key}
        disabled={off}
        aria-label={label}
        title={label}
        render={
          <Toggle
            size="sm"
            indicator={false}
            pressed={Boolean(state?.[item.key])}
            onPressedChange={() => editor && item.run(editor)}
          />
        }
      >
        <Icon />
      </ToolbarPrimitive.Button>
    );
  };

  return (
    <ToolbarPrimitive.Root
      aria-label={m.rich_text_toolbar()}
      disabled={disabled}
      className={richTextEditorToolbarClasses}
    >
      {MARK_KEYS.map(latchKey)}
      <ToolbarPrimitive.Separator className={richTextEditorDividerClasses} />
      {BLOCK_KEYS.map(latchKey)}
      <LinkKey editor={editor} active={Boolean(state?.link)} disabled={off} />
      <ToolbarPrimitive.Separator className={richTextEditorDividerClasses} />
      <ToolbarPrimitive.Button
        disabled={off || !state?.canUndo}
        aria-label={m.rich_text_undo()}
        title={m.rich_text_undo()}
        onClick={() => editor?.chain().focus().undo().run()}
        render={<Button type="button" variant="secondary" size="icon-xs" />}
      >
        {/* Undo turns back against the reading direction */}
        <Undo2Icon className="rtl:-scale-x-100" />
      </ToolbarPrimitive.Button>
      <ToolbarPrimitive.Button
        disabled={off || !state?.canRedo}
        aria-label={m.rich_text_redo()}
        title={m.rich_text_redo()}
        onClick={() => editor?.chain().focus().redo().run()}
        render={<Button type="button" variant="secondary" size="icon-xs" />}
      >
        <Redo2Icon className="rtl:-scale-x-100" />
      </ToolbarPrimitive.Button>
    </ToolbarPrimitive.Root>
  );
}

/*===== Link =====*/

/** Adds `https://` to an address typed without a scheme, so `example.com` works. */
function normalizeHref(raw: string): string {
  const href = raw.trim();
  if (!href) return "";
  return /^(https?:\/\/|mailto:)/i.test(href) ? href : `https://${href}`;
}

/**
 * The link key: latched while the caret is in a link, it opens a small form for the address. Applying an empty
 * address, or the remove key, takes the link off. With nothing selected, the address itself is inserted as the link.
 */
function LinkKey({ editor, active, disabled }: { editor: Editor | null; active: boolean; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const inputId = useId();

  const onOpenChange = (next: boolean) => {
    if (next) setHref(String(editor?.getAttributes("link").href ?? ""));
    setOpen(next);
  };

  const apply = () => {
    if (!editor) return;
    const url = normalizeHref(href);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else if (editor.state.selection.empty && !active) {
      chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else chain.setLink({ href: url }).run();
    setOpen(false);
  };

  const remove = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={m.rich_text_link()}
        title={m.rich_text_link()}
        // Latched like the formatting keys while the caret is in a link; pressing it opens the form, not the latch.
        render={
          <ToolbarPrimitive.Button
            render={<Toggle size="sm" indicator={false} pressed={active} onPressedChange={() => undefined} />}
          />
        }
      >
        <LinkIcon />
      </PopoverTrigger>
      <PopoverContent align="start">
        <form
          className={richTextEditorLinkFormClasses}
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <Label htmlFor={inputId}>{m.rich_text_link_url()}</Label>
          <Input
            id={inputId}
            dir="ltr"
            variant="code"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://"
            value={href}
            onChange={(event) => setHref(event.target.value)}
          />
          <div className="flex justify-end gap-3">
            {active && (
              <Button type="button" variant="outline" size="sm" onClick={remove}>
                {m.rich_text_link_remove()}
              </Button>
            )}
            <Button type="submit" size="sm">
              {m.rich_text_link_apply()}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export { RichTextEditor };
