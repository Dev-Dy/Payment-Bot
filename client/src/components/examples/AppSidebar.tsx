import { AppSidebar } from '../AppSidebar';
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-[500px] w-full border rounded-lg overflow-hidden">
        <AppSidebar />
        <div className="flex-1 p-6 bg-background">
          <div className="text-lg font-semibold mb-2">Main Content Area</div>
          <div className="text-muted-foreground">
            This is where the main dashboard content would be displayed.
            Click the sidebar items to navigate between different sections.
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}