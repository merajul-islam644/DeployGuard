import { Bell, TriangleAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../shared/ui/dropdown-menu";

// The issues raised by failed checks are the app's notifications: this menu
// surfaces the open count and links straight to the Issues list.
export function NotificationsMenu({ openIssues, onNavigate }: { openIssues: number; onNavigate: (path: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="icon-button" aria-label="Notifications" data-count={openIssues || undefined}>
        <Bell size={18} />
        {openIssues ? <span className="bell-badge">{openIssues > 9 ? "9+" : openIssues}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[300px]">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {openIssues ? (
          <DropdownMenuItem onSelect={() => onNavigate("/issues")}>
            <TriangleAlert size={18} className="text-[hsl(var(--warning-fg))]" />
            <span>
              {openIssues} open {openIssues === 1 ? "issue" : "issues"} need attention
            </span>
          </DropdownMenuItem>
        ) : (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <Bell size={22} className="text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No open issues right now.</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}