import { Link } from "@tanstack/react-router";
import { LogOutIcon, UserIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { buttonVariants } from "#/components/primitive/button/button.styles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/primitive/dropdown-menu/dropdown-menu";
import { slotClasses } from "#/components/primitive/instrument.styles";
import { Led } from "#/components/primitive/led/led";
import { Marking } from "#/components/primitive/marking/marking";
import { LocaleSwitcher } from "#/components/shared/locale-switcher/locale-switcher";
import { ThemeToggle } from "#/components/shared/theme-toggle/theme-toggle";
import { useLocaleLinks } from "#/hooks/use-locale-links";
import { useSignOut } from "#/hooks/use-sign-out";
import { cn } from "#/lib/utils";
import type { Viewer } from "#/orpc/session/contract";
import { m } from "#/paraglide/messages";

/*===== Navigation =====*/

// Message functions, not their text: called in render, so each request gets its own locale's labels.
const NAV_ITEMS = [
  { label: m.nav_home, to: "/" },
  { label: m.nav_notes, to: "/notes" },
] as const;

// Each link is a light key; the keys share one slot, so they drop their own cut. The current page's key stays sunk
// (`aria-current="page"` latches it) and its LED lights blue, the selection signal. The focus ring is drawn inside the
// face, like a tab's: outside it would land on the slot's black gap and vanish.
const navKeyClasses = cn(
  buttonVariants({ variant: "secondary", size: "sm" }),
  "gap-2 before:hidden focus-visible:-outline-offset-4 focus-visible:outline-foreground",
);

/*===== Account =====*/

/** The viewer's keycap: their initial on a light key, opening the account menu. */
function AccountMenu({ viewer }: { viewer: Viewer }) {
  const signOut = useSignOut();
  const initial = Array.from(viewer.name.trim())[0] ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="secondary" size="icon-sm" aria-label={m.nav_account()} />}>
        {initial ? <span aria-hidden="true">{initial}</span> : <UserIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-foreground">{viewer.name}</span>
            <span dir="ltr" className="block text-start">
              {viewer.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signOut.isPending} onClick={() => signOut.mutate()}>
          <LogOutIcon />
          {m.nav_sign_out()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/*===== Site Header =====*/

/**
 * The instrument's top panel: a housing strip across the desk with the model name, the main navigation as a row of keys,
 * and the language, theme and account keys. On a phone the navigation drops to its own row. It spans the whole window,
 * not the content width, so its edges line up with the board, which needs every column it can get.
 */
export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const localeLinks = useLocaleLinks();

  return (
    <header className="relative z-10 bg-card shadow-housing">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        {/*------ Model Name ------*/}
        <Link
          to="/"
          className="flex items-baseline gap-2 rounded-chassis outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <span className="font-heading text-h4 text-foreground">{m.site_name()}</span>
          <Marking variant="code" aria-hidden="true">
            TD
          </Marking>
        </Link>

        {/*------ Navigation ------*/}
        <nav aria-label={m.nav_main()} className="order-last w-full sm:order-none sm:w-auto">
          <ul className={slotClasses}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to} className="flex">
                {/* `exact` keeps "/" from matching every page */}
                <Link to={item.to} activeOptions={{ exact: true }} className={navKeyClasses}>
                  {({ isActive }) => (
                    <>
                      <Led signal="selection" state={isActive ? "on" : "off"} size="sm" />
                      {item.label()}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/*------ Device Keys ------*/}
        <div className="ms-auto flex shrink-0 items-center gap-3">
          <LocaleSwitcher links={localeLinks} variant="secondary" />
          <ThemeToggle />
          {viewer ? (
            <AccountMenu viewer={viewer} />
          ) : (
            // A link styled as a button: `<Button render={<Link />}>` would announce it as a button (`role="button"`).
            <Link to="/auth" className={buttonVariants({ size: "sm" })}>
              {m.nav_sign_in()}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
