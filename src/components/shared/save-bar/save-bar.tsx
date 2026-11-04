import { Button } from "#/components/primitive/button/button";
import { Marking } from "#/components/primitive/marking/marking";
import { Spinner } from "#/components/primitive/spinner/spinner";
import { m } from "#/paraglide/messages";

/*===== Save Bar =====*/

/**
 * The end of a form that edits many rows at once: how many have changed, a key to drop them, and the one Save. The key
 * only lights orange once there is something to save, since a disabled orange key reads as a dead black one. `form`
 * ties it to a form it sits outside of.
 */
export function SaveBar({
  count,
  saving,
  onDiscard,
  form,
}: {
  /** How many rows have unsaved changes. */
  count: number;
  saving: boolean;
  onDiscard: () => void;
  form?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {count > 0 && (
        <>
          <Marking variant="reading" className="me-auto">
            {m.save_bar_unsaved({ count })}
          </Marking>
          <Button type="button" variant="ghost" disabled={saving} onClick={onDiscard}>
            {m.save_bar_discard()}
          </Button>
        </>
      )}
      <Button
        type="submit"
        form={form}
        variant={count > 0 ? "highlight" : "secondary"}
        disabled={count === 0 || saving}
      >
        {saving && <Spinner data-icon="inline-start" />}
        {m.settings_save()}
      </Button>
    </div>
  );
}
