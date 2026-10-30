import { LockIcon, XIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/primitive/select/select";
import { Toggle } from "#/components/primitive/toggle/toggle";
import { priorityName } from "#/lib/priority-name";
import type { Person } from "#/orpc/project/contract";
import { TASK_PRIORITIES } from "#/orpc/task/constants";
import type { Label } from "#/orpc/task/contract";
import { m } from "#/paraglide/messages";
import { BOARD_FILTER_KEYS, isFiltering, type BoardFilter } from "#/routes/projects_projectKey/board-filter";
import { ASSIGNEE_ME, ASSIGNEE_NOBODY, DUE_FILTERS, type DueFilter } from "#/routes/projects_projectKey/search-params";

/*===== Board Filters =====*/

/** The select value for "no filter here", since a select item can't hold `undefined`. */
const ANY = "any";

const DUE_LABELS: Record<DueFilter, () => string> = {
  overdue: m.board_filter_due_overdue,
  week: m.board_filter_due_week,
  none: m.board_filter_due_none,
};

type Item = { value: string; label: string };

/**
 * The board's filter bar: assignee (me, nobody, or someone), label, priority, due date and a "blocked only" key, each
 * written to the URL (`onChange`) so a filtered board can be linked. A key clears them all while any is set.
 */
export function BoardFilters({
  filter,
  people,
  labels,
  onChange,
}: {
  filter: BoardFilter;
  /** Who can be picked: the people the cards can be assigned to. */
  people: Person[];
  labels: Label[];
  onChange: (patch: Partial<BoardFilter>) => void;
}) {
  const assignees: Item[] = [
    { value: ANY, label: m.board_filter_assignee_any() },
    { value: ASSIGNEE_ME, label: m.board_filter_assignee_me() },
    { value: ASSIGNEE_NOBODY, label: m.task_unassigned() },
    ...people.map((person) => ({ value: person.id, label: person.name })),
  ];
  const labelItems: Item[] = [
    { value: ANY, label: m.board_filter_label_any() },
    ...labels.map((label) => ({ value: label.id, label: label.name })),
  ];
  const priorities: Item[] = [
    { value: ANY, label: m.board_filter_priority_any() },
    ...TASK_PRIORITIES.toReversed().map((priority) => ({ value: priority, label: priorityName(priority) })),
  ];
  const dues: Item[] = [
    { value: ANY, label: m.board_filter_due_any() },
    ...DUE_FILTERS.map((due) => ({ value: due, label: DUE_LABELS[due]() })),
  ];
  const pick = (value: unknown) => (value === ANY || typeof value !== "string" ? undefined : value);

  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="sr-only">{m.board_filters()}</legend>
      <FilterSelect
        label={m.board_filter_assignee()}
        items={assignees}
        value={filter.assignee}
        onChange={(value) => onChange({ assignee: pick(value) })}
      />
      <FilterSelect
        label={m.board_filter_label()}
        items={labelItems}
        value={filter.label}
        onChange={(value) => onChange({ label: pick(value) })}
      />
      <FilterSelect
        label={m.board_filter_priority()}
        items={priorities}
        value={filter.priority}
        onChange={(value) => onChange({ priority: pick(value) as BoardFilter["priority"] })}
      />
      <FilterSelect
        label={m.board_filter_due()}
        items={dues}
        value={filter.due}
        onChange={(value) => onChange({ due: pick(value) as BoardFilter["due"] })}
      />
      <Toggle
        size="sm"
        pressed={filter.blocked ?? false}
        onPressedChange={(pressed) => onChange({ blocked: pressed || undefined })}
      >
        <LockIcon data-icon="inline-start" />
        {m.board_filter_blocked()}
      </Toggle>
      {isFiltering(filter) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(Object.fromEntries(BOARD_FILTER_KEYS.map((key) => [key, undefined])))}
        >
          <XIcon data-icon="inline-start" />
          {m.board_filter_clear()}
        </Button>
      )}
    </fieldset>
  );
}

/** One compact select; its "any" item reads as the filter being off. */
function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: Item[];
  value: string | undefined;
  onChange: (value: unknown) => void;
}) {
  // A link may name a label or person that is gone: show "any" rather than an empty key.
  const current = value && items.some((item) => item.value === value) ? value : ANY;
  return (
    <Select items={items} value={current} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={label} className="min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
