import type { JSX, PropsWithChildren } from "react";

import { Link, useLocation } from "wouter";
import { Activity, Home, LogOut, Mail, MoonStar, SunMedium } from "lucide-react";
import clsx from "clsx";

import { getRegisteredService } from "@/shared/config/services";
import { Button } from "@/shared/kit";
import { useAuth } from "@/shared/hooks/use-auth";
import { useTheme } from "@/shared/hooks/use-theme";

import styles from "./Layout.module.scss";
import { Logo } from "./Logo";
import { ServiceNavigation } from "../ServiceNavigation/ServiceNavigation";

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
        : location.startsWith("/owa/beacons/")
        ? "Beacon details"
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
          </nav>

          <div className={styles.headerMeta}>
            <div className={styles.pageTitle}>
              <Activity size={15} />
              <span>{title}</span>
            </div>
            <div className={styles.userName}>{username}</div>
            <Button
              variant="secondary"
              leftIcon={theme === "dark" ? <SunMedium size={14} /> : <MoonStar size={14} />}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<LogOut size={14} />}
              onClick={() => void logout()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {activeService ? <ServiceNavigation service={activeService} /> : null}
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
