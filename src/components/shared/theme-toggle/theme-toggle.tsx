import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { useTheme } from "#/hooks/use-theme";
import { m } from "#/paraglide/messages";

/*===== Theme Toggle =====*/
/**
 * Switches between light and dark and saves the choice. A latching key ("dark mode", sunk while
 * dark). The icon is chosen with CSS (`dark:`), so it's right on the server-rendered page too.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      aria-label={m.theme_dark_mode()}
      aria-pressed={theme === null ? undefined : isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
    </Button>
  );
}
