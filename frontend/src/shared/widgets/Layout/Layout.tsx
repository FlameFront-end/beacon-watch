import type { JSX, PropsWithChildren } from "react";

import { Link, useLocation } from "wouter";
import { Activity, Inbox, LogOut, MoonStar, Radio, SunMedium } from "lucide-react";
import clsx from "clsx";

import { Button } from "@/shared/kit";
import { useAuth } from "@/shared/hooks/use-auth";
import { useTheme } from "@/shared/hooks/use-theme";

import styles from "./Layout.module.scss";
import { Logo } from "./Logo";

export function Layout({ children }: PropsWithChildren): JSX.Element {
  const [location] = useLocation();
  const { logout, username } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const title =
    location === "/mails"
      ? "Mail intake"
      : location.startsWith("/beacons/")
        ? "Beacon details"
        : "BeaconWatch";

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
              <Radio size={14} />
              <span>Beacons</span>
            </Link>
            <Link
              href="/mails"
              className={clsx(styles.navLink, location === "/mails" && styles.activeNavLink)}
              aria-current={location === "/mails" ? "page" : undefined}
            >
              <Inbox size={14} />
              <span>Mails</span>
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

      <main className={styles.main}>{children}</main>
    </div>
  );
}
