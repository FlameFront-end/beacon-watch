import type { PropsWithChildren, ReactElement } from "react";

import { AuthProvider } from "@/shared/hooks/use-auth";
import { ThemeProvider } from "@/shared/hooks/use-theme";

export function Providers({ children }: PropsWithChildren): ReactElement {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
