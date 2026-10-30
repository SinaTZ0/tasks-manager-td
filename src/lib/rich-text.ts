import { getSchema, type Extensions, type JSONContent } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { StarterKit } from "@tiptap/starter-kit";

/*===== Rich Text =====*/
// Task descriptions and comments are Tiptap documents (docs/task-manager-plan.md → Decisions): stored as Tiptap's JSON,
// with a plain-text copy for search and the history. One extension list serves the editor, the read-only renderer and
// the server's check, so all three accept exactly the same documents. Browser-safe: no DOM is needed to build the
// schema or read a document.

/** A stored document: Tiptap's JSON, whose root is a `doc` node. */
export type RichTextDoc = JSONContent;

/**
 * The features a document may use: paragraphs, bold, italic, strike, inline code, lists, quotes and links. Headings,
 * code blocks, rules and underline are left out: a task's notes don't need a page's structure, and fewer marks keep it
 * calm. Links open in a new tab and never run `javascript:`.
 */
export function richTextExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      horizontalRule: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
    }),
  ];
}

const schema = getSchema(richTextExtensions());

/** The empty document: one empty paragraph, as the editor starts. */
export const EMPTY_RICH_TEXT: RichTextDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** Between blocks in the plain-text copy, so paragraphs and list items stay apart. */
const BLOCK_SEPARATOR = "\n";

/*===== Reading =====*/

/**
 * Checks a document against the schema and returns it with its plain text, or `null` when it isn't a valid document
 * (an unknown node or mark, a broken structure). The server runs every incoming document through this before storing
 * it, so nothing the editor couldn't have produced is ever saved.
 */
export function parseRichText(value: unknown): { doc: RichTextDoc; text: string } | null {
  if (typeof value !== "object" || value === null || (value as { type?: unknown }).type !== "doc") return null;
  try {
    const node = ProseMirrorNode.fromJSON(schema, value);
    node.check();
    if (!hasSafeLinks(node)) return null;
    return { doc: node.toJSON() as RichTextDoc, text: plainText(node) };
  } catch {
    return null;
  }
}

/** The document's text without formatting, one line per block, trimmed. */
export function richTextToPlainText(doc: RichTextDoc): string {
  try {
    return plainText(ProseMirrorNode.fromJSON(schema, doc));
  } catch {
    return "";
  }
}

/** Link addresses the schema itself doesn't check: only web and mail links, never `javascript:` or `data:`. */
const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

function hasSafeLinks(node: ProseMirrorNode): boolean {
  let safe = true;
  node.descendants((child) => {
    for (const mark of child.marks) {
      if (mark.type.name === "link" && !SAFE_HREF.test(String(mark.attrs.href ?? ""))) safe = false;
    }
    return safe;
  });
  return safe;
}

function plainText(node: ProseMirrorNode): string {
  return node.textBetween(0, node.content.size, BLOCK_SEPARATOR, " ").trim();
}

/** Whether a document has no text: an editor left empty stores nothing. */
export function isEmptyRichText(doc: RichTextDoc | null | undefined): boolean {
  return !doc || richTextToPlainText(doc).length === 0;
}

/*===== Writing =====*/

/** A document holding plain text, one paragraph per line: for text typed in a plain field, like a forced move's reason. */
export function plainTextToRichText(text: string): RichTextDoc {
  const lines = text.split("\n").map((line) => line.trim());
  return {
    type: "doc",
    content: lines.map((line) =>
      line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" },
    ),
  };
}
