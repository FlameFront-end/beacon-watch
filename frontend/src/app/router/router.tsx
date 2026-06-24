import { createBrowserRouter, Navigate } from "react-router-dom";

import { Layout } from "@/shared/widgets/Layout/Layout";

import { BeaconDetailsPage } from "@/features/beacons/pages/BeaconDetails/BeaconDetails.page";
import { BeaconsDashboardPage } from "@/features/beacons/pages/BeaconsDashboard/BeaconsDashboard.page";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <BeaconsDashboardPage />,
      },
      {
        path: "/beacons/:beaconId",
        element: <BeaconDetailsPage />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
