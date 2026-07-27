import type { JSX } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Inbox, Radio } from "lucide-react";
import clsx from "clsx";

import type { RegisteredService } from "@/shared/config/services";

import styles from "./ServiceNavigation.module.scss";

type ServiceNavigationProps = {
  readonly service: RegisteredService;
};

export function ServiceNavigation({ service }: ServiceNavigationProps): JSX.Element {
  const [location] = useLocation();
  const basePath = `/${service.key}`;

  return (
    <nav className={styles.nav} aria-label={`${service.name} navigation`}>
      <span className={styles.serviceName}>{service.name}</span>
      {service.capabilities.includes("beacons") ? (
        <Link
          href={`${basePath}/beacons`}
          className={clsx(
            styles.navLink,
            location.startsWith(`${basePath}/beacons`) && styles.activeNavLink,
          )}
          aria-current={location.startsWith(`${basePath}/beacons`) ? "page" : undefined}
        >
          <Radio size={14} aria-hidden="true" />
          <span>Beacons</span>
        </Link>
      ) : null}
      {service.capabilities.includes("emails") ? (
        <Link
          href={`${basePath}/emails`}
          className={clsx(
            styles.navLink,
            location === `${basePath}/emails` && styles.activeNavLink,
          )}
          aria-current={location === `${basePath}/emails` ? "page" : undefined}
        >
          <Inbox size={14} aria-hidden="true" />
          <span>Emails</span>
        </Link>
      ) : null}
      {service.key === "owa" ? (
        <Link
          href={`${basePath}/admin-notifications`}
          className={clsx(
            styles.navLink,
            location === `${basePath}/admin-notifications` && styles.activeNavLink,
          )}
          aria-current={location === `${basePath}/admin-notifications` ? "page" : undefined}
        >
          <Bell size={14} aria-hidden="true" />
          <span>Admin logs</span>
        </Link>
      ) : null}
    </nav>
  );
}
