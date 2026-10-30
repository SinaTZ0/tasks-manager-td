import { Marking } from "#/components/primitive/marking/marking";
import { m } from "#/paraglide/messages";

/*===== Site Footer =====*/

/**
 * The instrument's bottom edge: a housing strip printed with the model name and what it is, like the label on the
 * underside of a device. It sits on a housing, not the desk, because printed markings are too light for the desk.
 */
export function SiteFooter() {
  return (
    <footer className="bg-card shadow-housing">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Marking>
          {m.site_name()} · {m.site_tagline()}
        </Marking>
        <Marking variant="code" aria-hidden="true">
          TD
        </Marking>
      </div>
    </footer>
  );
}
