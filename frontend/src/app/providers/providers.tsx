import type { PropsWithChildren, ReactElement } from "react";

import { ThemeProvider } from "@/shared/hooks/use-theme";

export function Providers({ children }: PropsWithChildren): ReactElement {
  return <ThemeProvider>{children}</ThemeProvider>;
}
