import type { ReactElement } from "react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";

import { LoginPage } from "@/features/auth/pages/Login/Login.page";
import { BeaconDetailsPage } from "@/features/beacons/pages/BeaconDetails/BeaconDetails.page";
import { BeaconsDashboardPage } from "@/features/beacons/pages/BeaconsDashboard/BeaconsDashboard.page";
import { MailsDashboardPage } from "@/features/mails/pages/MailsDashboard/MailsDashboard.page";
import { ServicesPage } from "@/features/services/pages/Services/Services.page";
import { SmtpPage } from "@/features/smtp/pages/Smtp/Smtp.page";
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
              <Route path="/" component={ServicesPage} />
              <Route path="/smtp" component={SmtpPage} />
              <Route path="/owa" component={RedirectToOwaBeacons} />
              <Route path="/owa/beacons" component={OwaBeaconsDashboardPage} />
              <Route path="/owa/beacons/:beaconId" component={OwaBeaconDetailsPage} />
              <Route path="/owa/emails" component={OwaMailsDashboardPage} />
              <Route component={RedirectToHome} />
            </Switch>
          </Layout>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function OwaBeaconsDashboardPage(): ReactElement {
  return <BeaconsDashboardPage serviceKey="owa" />;
}

function OwaBeaconDetailsPage(): ReactElement {
  return <BeaconDetailsPage serviceKey="owa" />;
}

function OwaMailsDashboardPage(): ReactElement {
  return <MailsDashboardPage serviceKey="owa" />;
}

function RedirectToOwaBeacons(): ReactElement | null {
  return <RedirectToPath path="/owa/beacons" />;
}

function RedirectToHome(): ReactElement | null {
  return <RedirectToPath path="/" />;
}

function RedirectToPath({ path }: { readonly path: string }): ReactElement | null {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate(path, { replace: true });
  }, [navigate, path]);

  return null;
}
