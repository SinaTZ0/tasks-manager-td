import { useId } from "react";

import { Checkbox } from "#/components/primitive/checkbox/checkbox";
import { Field, FieldLabel } from "#/components/primitive/field/field";
import { PersonAvatar } from "#/components/shared/person-avatar/person-avatar";

/*===== People Checklist =====*/

type Person = { id: string; name: string; email?: string; avatarUrl?: string | null };

/**
 * A check key per teammate, with their cap and name: who is on a project. Each row's label is its tap target.
 *
 * @param disabledIds People whose key can't be pressed (one already being saved).
 */
export function PeopleChecklist({
  people,
  selectedIds,
  onToggle,
  disabledIds = [],
}: {
  people: Person[];
  selectedIds: readonly string[];
  onToggle: (id: string, checked: boolean) => void;
  disabledIds?: readonly string[];
}) {
  const baseId = useId();

  return (
    <ul className="grid grid-cols-3 gap-x-6 gap-y-3">
      {people.map((person) => {
        const id = `${baseId}-${person.id}`;
        return (
          <li key={person.id}>
            <Field orientation="horizontal">
              <Checkbox
                id={id}
                checked={selectedIds.includes(person.id)}
                disabled={disabledIds.includes(person.id)}
                onCheckedChange={(checked) => onToggle(person.id, checked)}
              />
              <FieldLabel htmlFor={id} className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={person.name} src={person.avatarUrl} decorative />
                  <span className="min-w-0">
                    <span className="block truncate">{person.name}</span>
                    {person.email && (
                      <span dir="ltr" className="block truncate text-start text-caption text-muted-foreground">
                        {person.email}
                      </span>
                    )}
                  </span>
                </span>
              </FieldLabel>
            </Field>
          </li>
        );
      })}
    </ul>
  );
}
