import type { ReactElement } from "react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";

import { LoginPage } from "@/features/auth/pages/Login/Login.page";
import { BeaconDetailsPage } from "@/features/beacons/pages/BeaconDetails/BeaconDetails.page";
import { BeaconsDashboardPage } from "@/features/beacons/pages/BeaconsDashboard/BeaconsDashboard.page";
import { MailsDashboardPage } from "@/features/mails/pages/MailsDashboard/MailsDashboard.page";
import { AdminNotificationLogsPage } from "@/features/admin-notifications/pages/AdminNotificationLogs/AdminNotificationLogs.page";
import { ServicesPage } from "@/features/services/pages/Services/Services.page";
import { SmtpPage } from "@/features/smtp/pages/Smtp/Smtp.page";
import { CollectionRunsPage } from "@/features/vulnerability-monitoring/pages/CollectionRuns/CollectionRuns.page";
import { VulnerabilityDetailsPage } from "@/features/vulnerability-monitoring/pages/VulnerabilityDetails/VulnerabilityDetails.page";
import { VulnerabilityFeedPage } from "@/features/vulnerability-monitoring/pages/VulnerabilityFeed/VulnerabilityFeed.page";
import { VulnerabilitySourcesPage } from "@/features/vulnerability-monitoring/pages/VulnerabilitySources/VulnerabilitySources.page";
import { WatchRulesPage } from "@/features/vulnerability-monitoring/pages/WatchRules/WatchRules.page";
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
              <Route path="/vulnerability-monitoring" component={VulnerabilityFeedPage} />
              <Route path="/vulnerability-monitoring/sources" component={VulnerabilitySourcesPage} />
              <Route path="/vulnerability-monitoring/watch-rules" component={WatchRulesPage} />
              <Route path="/vulnerability-monitoring/runs" component={CollectionRunsPage} />
              <Route path="/vulnerability-monitoring/:id" component={VulnerabilityDetailsPage} />
              <Route path="/owa" component={RedirectToOwaBeacons} />
              <Route path="/owa/beacons" component={OwaBeaconsDashboardPage} />
              <Route path="/owa/beacons/:beaconId" component={OwaBeaconDetailsPage} />
              <Route path="/owa/emails" component={OwaMailsDashboardPage} />
              <Route path="/owa/admin-notifications" component={OwaAdminNotificationLogsPage} />
              <Route path="/zimbra" component={RedirectToZimbraEmails} />
              <Route path="/zimbra/emails" component={ZimbraMailsDashboardPage} />
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

function ZimbraMailsDashboardPage(): ReactElement {
  return <MailsDashboardPage serviceKey="zimbra" />;
}

function OwaAdminNotificationLogsPage(): ReactElement {
  return <AdminNotificationLogsPage serviceKey="owa" />;
}

function RedirectToOwaBeacons(): ReactElement | null {
  return <RedirectToPath path="/owa/beacons" />;
}

function RedirectToZimbraEmails(): ReactElement | null {
  return <RedirectToPath path="/zimbra/emails" />;
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
