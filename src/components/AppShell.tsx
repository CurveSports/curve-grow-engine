import { ReactNode } from "react";
import TopNav from "./TopNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="curve-container py-10">{children}</main>
    </div>
  );
}
