import { Link, useLocation } from "@tanstack/react-router";
import { LogOutIcon, UserIcon } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

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
import { Led } from "#/components/primitive/led/led";
import { LocaleSwitcher } from "#/components/shared/locale-switcher/locale-switcher";
import { ThemeToggle } from "#/components/shared/theme-toggle/theme-toggle";
import { useLocaleLinks } from "#/hooks/use-locale-links";
import { useSignOut } from "#/hooks/use-sign-out";
import { formatDate } from "#/lib/locale";
import { canEdit } from "#/lib/user-constants";
import { cn } from "#/lib/utils";
import type { Viewer } from "#/orpc/session/contract";
import { m } from "#/paraglide/messages";

/*===== Navigation =====*/

// Message functions, not their text: called in render, so each request gets its own locale's labels. Who sees each
// link: everyone, editors (not viewers, who are never assigned or hand anything on) or admins only; the team page's
// route checks too.
const NAV_ITEMS = [
  { label: m.nav_home, to: "/", audience: "everyone" },
  { label: m.nav_my_tasks, to: "/my-tasks", audience: "editors" },
  { label: m.nav_delegated, to: "/delegated", audience: "editors" },
  { label: m.nav_notes, to: "/notes", audience: "everyone" },
  { label: m.nav_team, to: "/team", audience: "admins" },
] as const;

/** Whether a nav link is for this person's role. */
function isListedFor({
  audience,
  role,
}: {
  audience: (typeof NAV_ITEMS)[number]["audience"];
  role: string | undefined;
}) {
  if (audience === "admins") return role === "admin";
  if (audience === "editors") return canEdit(role);
  return true;
}

/** Whether a nav link is for the page in view. A project's pages count as "projects": they open from that list. */
function isCurrent({ to, pathname }: { to: string; pathname: string }) {
  return to === "/" ? pathname === "/" || pathname.startsWith("/projects/") : pathname === to;
}

/*===== Today =====*/

/** Calls `notify` at each local midnight, so a tab left open overnight moves on to the new day. */
function subscribeToMidnight(notify: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    timer = setTimeout(() => {
      notify();
      arm();
    }, midnight.getTime() - Date.now());
  };
  arm();
  return () => clearTimeout(timer);
}

const readToday = () => formatDate(new Date(), { day: "numeric", month: "long" });

/**
 * Today's date, as a reading on the glass. Empty until hydration: the server doesn't know the browser's time zone, so
 * around midnight its day would be the wrong one.
 */
function Today() {
  const today = useSyncExternalStore(subscribeToMidnight, readToday, () => "");
  return <span className="font-mono text-caption whitespace-nowrap text-glass-muted">{today}</span>;
}

/*===== Account =====*/

/** The viewer's cap on the glass: their picture, or their initial, opening the account menu. */
function AccountMenu({ viewer }: { viewer: Viewer }) {
  const signOut = useSignOut();
  const initial = Array.from(viewer.name.trim())[0] ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="glass-cap" size="icon-xs" aria-label={m.nav_account()} />}>
        {viewer.avatarUrl ? (
          <img src={viewer.avatarUrl} alt="" className="size-full object-cover" />
        ) : initial ? (
          <span aria-hidden="true">{initial}</span>
        ) : (
          <UserIcon />
        )}
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
        <DropdownMenuItem render={<Link to="/profile" />}>
          <UserIcon />
          {m.nav_profile()}
        </DropdownMenuItem>
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
 * The instrument's top strip: display glass from edge to edge, with the main navigation printed on it, then the tools
 * and readings. Below `lg` the navigation drops to its own row. It spans the whole window, not the content width, so
 * its edges line up with the board, which needs every column it can get. `search` and `bell` are the signed-in
 * viewer's search field and notifications.
 */
export function SiteHeader({ viewer, search, bell }: { viewer: Viewer | null; search?: ReactNode; bell?: ReactNode }) {
  const localeLinks = useLocaleLinks();
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <header className="relative z-10 flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 border-b border-glass-foreground/14 bg-glass px-3 py-2 text-glass-foreground lg:flex-nowrap lg:py-0">
      {/*------ Navigation ------*/}
      <nav aria-label={m.nav_main()} className="order-last w-full overflow-x-auto lg:order-none lg:w-auto">
        <ul className="flex items-center gap-0.5">
          {NAV_ITEMS.filter((item) => isListedFor({ audience: item.audience, role: viewer?.role })).map((item) => {
            const current = isCurrent({ to: item.to, pathname });
            return (
              <li key={item.to}>
                {/* `exact` keeps the router from calling "/" current on every page; `isCurrent` decides here */}
                <Link
                  to={item.to}
                  activeOptions={{ exact: true }}
                  aria-current={current ? "page" : undefined}
                  className={cn(buttonVariants({ variant: "glass", size: "sm" }), "gap-2.5 px-3")}
                >
                  <Led signal={current ? "action" : "glass"} state={current ? "on" : "off"} size="sm" />
                  {item.label()}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/*------ Tools And Readings ------*/}
      <div className="ms-auto flex min-w-0 items-center gap-3">
        {search}
        {viewer && (
          <>
            <Today />
            <span aria-hidden="true" className="h-5 w-px bg-glass-foreground/20" />
          </>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          {bell}
          <LocaleSwitcher links={localeLinks} variant="glass" />
          <ThemeToggle variant="glass" />
        </div>
        {viewer ? (
          <AccountMenu viewer={viewer} />
        ) : (
          // A link styled as a button: `<Button render={<Link />}>` would announce it as a button (`role="button"`).
          <Link to="/auth" className={buttonVariants({ variant: "glass-cap", size: "xs" })}>
            {m.nav_sign_in()}
          </Link>
        )}
      </div>
    </header>
  );
}
