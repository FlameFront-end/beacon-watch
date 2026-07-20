import { createBrowserRouter, Navigate } from "react-router-dom";

import { Layout } from "@/shared/widgets/Layout/Layout";

import { LoginPage } from "@/features/auth/pages/Login/Login.page";
import { BeaconDetailsPage } from "@/features/beacons/pages/BeaconDetails/BeaconDetails.page";
import { BeaconsDashboardPage } from "@/features/beacons/pages/BeaconsDashboard/BeaconsDashboard.page";
import { MailsDashboardPage } from "@/features/mails/pages/MailsDashboard/MailsDashboard.page";
import { RequireAuth } from "./RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
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
        path: "/mails",
        element: <MailsDashboardPage />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
