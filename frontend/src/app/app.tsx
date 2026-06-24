import type { ReactElement } from "react";
import { RouterProvider } from "react-router-dom";

import { Providers } from "./providers/providers";
import { router } from "./router/router";

export function App(): ReactElement {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
