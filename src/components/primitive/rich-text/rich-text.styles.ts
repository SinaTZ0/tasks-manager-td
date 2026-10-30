import { defineStyles, joinStyles } from "../styles";

/*===== Prose =====*/

// How a task's description or a comment reads, shared by the read-only RichText and the RichTextEditor so a document
// looks the same while it is written and after it is saved. Reading text is Vazirmatn (`font-sans`, app-identity.md).
// Each text block takes the direction of its own first strong character (`unicode-bidi: plaintext`), and `text-start`
// then aligns it to that side, so an English line inside Persian text reads, and sits, left to right. CSS rather than
// `dir="auto"` attributes: a list item's `dir="auto"` skips its paragraph (which has its own) and falls back to
// left to right, which put Persian bullets on the wrong side. List markers follow the page's direction.
const twProseStyles = defineStyles({
  layout: "flex flex-col gap-2",
  typography: "font-sans text-body wrap-break-word text-foreground [&_p]:text-start [&_p]:[unicode-bidi:plaintext]",
  // Lists: markers outside the text, on the block's own start side, in the quieter grey.
  geometryLists: "[&_:is(ul,ol)]:flex [&_:is(ul,ol)]:flex-col [&_:is(ul,ol)]:gap-1 [&_:is(ul,ol)]:ps-6 [&_li>*+*]:mt-1",
  appearanceLists: "marker:text-muted-foreground [&_ol]:list-decimal [&_ul]:list-disc",
  // A quote is ruled off on its start side, like a marking beside the text it qualifies.
  appearanceQuote: "[&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3",
  // Inline code is a small sunk plate in the instrument mono, set left to right.
  appearanceCode:
    "[&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:[direction:ltr] [&_code]:[unicode-bidi:isolate]",
  // Links are underlined: colour alone can't mark them (brand-text is close to the body text).
  appearanceLinks:
    "[&_a]:text-brand-text [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 [&_a:hover]:decoration-2",
  // A mention is the person's name on the pale info plate, isolated so a Latin name sits right in Persian.
  appearanceMentions:
    "[&_[data-type=mention]]:rounded-xs [&_[data-type=mention]]:bg-info-surface [&_[data-type=mention]]:px-1 [&_[data-type=mention]]:font-semibold [&_[data-type=mention]]:[unicode-bidi:isolate]",
  focusLinks:
    "[&_a]:rounded-xs [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-ring",
});

/*===== Class Composition =====*/

const richTextProseClasses = joinStyles(twProseStyles);

export { richTextProseClasses, twProseStyles };
