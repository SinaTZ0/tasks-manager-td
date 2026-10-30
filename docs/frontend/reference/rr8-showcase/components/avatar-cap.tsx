import { cn } from '@/shared/lib/utils';
import { cutoutVariants } from './instrument.recipes';

/*===== Avatar Cap =====*/

/**
 * A team member shown as a small blank keycap with their initial, seated in a compact cut. Square
 * caps rather than circles keep people visually part of the same instrument as the controls.
 *
 * @param props - Full name (used for the accessible label and tooltip), and whether this is the
 * current owner, which uses the graphite cap so owner vs assignee is readable without colour alone.
 * @returns An `img`-role span showing the first character of the name.
 */
export function AvatarCap({ name, owner = false, className }: { name: string; owner?: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'font-industrial rounded-keycap-compact relative isolate inline-flex size-7 shrink-0 items-center justify-center text-xs font-bold',
        cutoutVariants({ size: 'compact' }),
        // Face on ::after so the cut's ::before cannot paint over it
        "after:absolute after:inset-0 after:z-[-1] after:rounded-[inherit] after:content-['']",
        owner
          ? 'text-keycap-graphite-foreground after:bg-keycap-graphite after:shadow-keycap-graphite-compact'
          : 'text-keycap-secondary-foreground after:bg-keycap-secondary after:shadow-keycap-secondary-compact',
        className,
      )}
    >
      <span aria-hidden="true">{name.charAt(0)}</span>
    </span>
  );
}
