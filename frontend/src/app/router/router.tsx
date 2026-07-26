import type { ReactElement } from "react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";

import { LoginPage } from "@/features/auth/pages/Login/Login.page";
import { BeaconDetailsPage } from "@/features/beacons/pages/BeaconDetails/BeaconDetails.page";
import { BeaconsDashboardPage } from "@/features/beacons/pages/BeaconsDashboard/BeaconsDashboard.page";
import { MailsDashboardPage } from "@/features/mails/pages/MailsDashboard/MailsDashboard.page";
import { Layout } from "@/shared/widgets/Layout/Layout";

import { RequireAuth } from "./RequireAuth";

export function AppRouter(): ReactElement {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <RequireAuth>
          <Layout>
            <Switch>
              <Route path="/" component={BeaconsDashboardPage} />
              <Route path="/beacons/:beaconId" component={BeaconDetailsPage} />
              <Route path="/mails" component={MailsDashboardPage} />
              <Route component={RedirectToHome} />
            </Switch>
          </Layout>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function RedirectToHome(): ReactElement | null {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}
