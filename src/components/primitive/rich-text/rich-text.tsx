import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { ComponentProps } from "react";

import { richTextExtensions, type RichTextDoc } from "#/lib/rich-text";
import { cn } from "#/lib/utils";

import { richTextProseClasses } from "./rich-text.styles";

/*===== Rendering =====*/

// Built once: the renderer only reads the extensions' schema and HTML output.
const extensions = richTextExtensions();

/*===== Rich Text =====*/

export type RichTextProps = Omit<ComponentProps<"div">, "children"> & {
  /** A stored document (`parseRichText` checked it on the way in). */
  doc: RichTextDoc;
};

/**
 * A saved description or comment, read-only. Drawn with Tiptap's static renderer from the same extensions as the
 * editor, so it renders on the server too and looks exactly like what was typed. Links open in a new tab with
 * `rel="noopener noreferrer nofollow"`, and an address that isn't a web or mail link is dropped by the link extension.
 * Check `isEmptyRichText` first if an empty document should show something else.
 */
function RichText({ doc, className, ...props }: RichTextProps) {
  const content = renderToReactElement({ content: doc, extensions });

  return (
    <div data-slot="rich-text" {...props} className={cn(richTextProseClasses, className)}>
      {content}
    </div>
  );
}

export { RichText };
