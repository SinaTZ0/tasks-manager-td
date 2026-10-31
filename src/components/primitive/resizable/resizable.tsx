import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "#/lib/utils";
import { resizableGripClasses, resizableHandleClasses, resizablePanelGroupClasses } from "./resizable.styles";

/*===== Resizable =====*/

function ResizablePanelGroup({ className, ...props }: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(resizablePanelGroupClasses, className)}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(resizableHandleClasses, className)}
      {...props}
    >
      {withHandle && <div className={resizableGripClasses} />}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
