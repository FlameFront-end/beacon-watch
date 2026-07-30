import type { JSX, PropsWithChildren } from "react";

import { Link, useLocation } from "wouter";
import { Activity, Home, LogOut, Mail, MoonStar, ShieldAlert, SunMedium, Webhook } from "lucide-react";
import clsx from "clsx";

import { getRegisteredService } from "@/shared/config/services";
import { Button } from "@/shared/kit";
import { useAuth } from "@/shared/hooks/use-auth";
import { useTheme } from "@/shared/hooks/use-theme";

import styles from "./Layout.module.scss";
import { Logo } from "./Logo";
import { ServiceNavigation } from "../ServiceNavigation/ServiceNavigation";
import { VulnerabilityNavigation } from "../VulnerabilityNavigation/VulnerabilityNavigation";

export function Layout({ children }: PropsWithChildren): JSX.Element {
  const [location] = useLocation();
  const { logout, username } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const serviceKey = location.split("/")[1] ?? "";
  const activeService = getRegisteredService(serviceKey);

  const title =
    location === "/"
      ? "Services"
      : location === "/smtp"
        ? "SMTP"
        : location.startsWith("/callbacks")
          ? "Callbacks"
        : location.startsWith("/owa/beacons/")
        ? "Beacon details"
        : location.startsWith("/vulnerability-monitoring")
          ? "Vulnerability monitoring"
          : activeService?.name ?? "BeaconWatch";

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="BeaconWatch home">
            <Logo />
            <div>
              <strong>BeaconWatch</strong>
              <span>Local beacon dashboard</span>
            </div>
          </Link>

          <nav className={styles.nav} aria-label="Primary navigation">
            <Link
              href="/"
              className={clsx(styles.navLink, location === "/" && styles.activeNavLink)}
              aria-current={location === "/" ? "page" : undefined}
            >
              <Home size={14} aria-hidden="true" />
              <span>Home</span>
            </Link>
            <Link
              href="/smtp"
              className={clsx(styles.navLink, location === "/smtp" && styles.activeNavLink)}
              aria-current={location === "/smtp" ? "page" : undefined}
            >
              <Mail size={14} aria-hidden="true" />
              <span>SMTP</span>
            </Link>
            <Link
              href="/vulnerability-monitoring"
              className={clsx(
                styles.navLink,
                location.startsWith("/vulnerability-monitoring") && styles.activeNavLink,
              )}
              aria-current={location.startsWith("/vulnerability-monitoring") ? "page" : undefined}
            >
              <ShieldAlert size={14} aria-hidden="true" />
              <span>Vulnerabilities</span>
            </Link>
            <Link
              href="/callbacks"
              className={clsx(styles.navLink, location.startsWith("/callbacks") && styles.activeNavLink)}
              aria-current={location.startsWith("/callbacks") ? "page" : undefined}
            >
              <Webhook size={14} aria-hidden="true" />
              <span>Callbacks</span>
            </Link>
          </nav>

          <div className={styles.headerMeta}>
            <div className={styles.pageTitle}>
              <Activity size={15} />
              <span>{title}</span>
            </div>
            <div className={styles.userName}>{username}</div>
            <Button
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className={styles.iconButton}
              variant="secondary"
              leftIcon={theme === "dark" ? <SunMedium size={14} /> : <MoonStar size={14} />}
              onClick={toggleTheme}
            >
              <span className={styles.optionalButtonText}>{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>
            <Button
              aria-label="Logout"
              className={styles.iconButton}
              variant="secondary"
              leftIcon={<LogOut size={14} />}
              onClick={() => void logout()}
            >
              <span className={styles.optionalButtonText}>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {activeService ? <ServiceNavigation service={activeService} /> : null}
        {location.startsWith("/vulnerability-monitoring") ? (
          <VulnerabilityNavigation currentPath={location} />
        ) : null}
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
