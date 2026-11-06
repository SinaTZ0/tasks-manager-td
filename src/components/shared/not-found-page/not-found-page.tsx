import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, FolderKanbanIcon } from "lucide-react";

import { Button } from "#/components/primitive/button/button";
import { buttonVariants } from "#/components/primitive/button/button.styles";
import { Card, CardContent } from "#/components/primitive/card/card";
import { Display, DisplayLabel } from "#/components/primitive/display/display";
import { Led } from "#/components/primitive/led/led";
import { pageTitle } from "#/lib/site";
import { m } from "#/paraglide/messages";

/*===== Not Found Page =====*/

/** How many cells the dead level meter has: the rail's, with nothing on the line. */
const METER_CELLS = 12;

/**
 * The page for an address that leads nowhere, reported the way the instrument reports a fault: the glass prints 404 and
 * the address that failed, so a mistyped link can be read back, and two keys lead out. It prints its own title, because
 * a route that failed to load gives the document none.
 */
export function NotFoundPage() {
  const router = useRouter();
  const { pathname } = useLocation();

  return (
    <div className="flex justify-center px-6 py-20">
      <title>{pageTitle(m.root_not_found_title())}</title>
      <Card className="w-full max-w-2xl">
        <CardContent>
          <div className="flex flex-col gap-5">
            <Display size="lg">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2.5">
                  <Led signal="attention" state="on" size="sm" />
                  <DisplayLabel>{m.root_not_found_fault()}</DisplayLabel>
                </span>
                <span aria-hidden="true" className="flex w-32 gap-0.5">
                  {Array.from({ length: METER_CELLS }, (_, index) => (
                    <span key={index} className="h-1.5 flex-1 rounded-xs bg-glass-foreground/15" />
                  ))}
                </span>
              </div>
              <p dir="ltr" className="text-center font-mono text-fault tracking-readout">
                404
              </p>
              <div className="flex items-baseline justify-between gap-4 border-t border-glass-foreground/15 pt-3">
                <DisplayLabel>{m.root_not_found_address()}</DisplayLabel>
                <bdi dir="ltr" className="min-w-0 truncate font-mono text-body">
                  {pathname}
                </bdi>
              </div>
            </Display>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h1 className="font-heading text-h3">{m.root_not_found_title()}</h1>
                <p className="text-body-sm text-muted-foreground">{m.root_not_found_details()}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => router.history.back()}>
                  <ArrowLeftIcon data-icon="inline-start" className="rtl:-scale-x-100" />
                  {m.root_not_found_back()}
                </Button>
                {/* A link styled as a button: `<Button render={<Link />}>` would announce it as a button. */}
                <Link to="/" className={buttonVariants({ variant: "highlight" })}>
                  <FolderKanbanIcon data-icon="inline-start" />
                  {m.root_not_found_home()}
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
