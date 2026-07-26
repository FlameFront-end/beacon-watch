import type { ReactElement } from "react";

import { Providers } from "./providers/providers";
import { AppRouter } from "./router/router";

export function App(): ReactElement {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
