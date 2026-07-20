import type { JSX, PropsWithChildren } from "react";

import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, Inbox, LogOut, MoonStar, Radio, SunMedium } from "lucide-react";
import clsx from "clsx";

import { Button } from "@/shared/kit";
import { useAuth } from "@/shared/hooks/use-auth";
import { useTheme } from "@/shared/hooks/use-theme";

import styles from "./Layout.module.scss";
import { Logo } from "./Logo";

export function Layout({ children }: PropsWithChildren): JSX.Element {
  const location = useLocation();
  const { logout, username } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const title =
    location.pathname === "/mails"
      ? "Mail intake"
      : location.pathname.startsWith("/beacons/")
        ? "Beacon details"
        : "BeaconWatch";

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand} aria-label="BeaconWatch home">
            <Logo />
            <div>
              <strong>BeaconWatch</strong>
              <span>Local beacon dashboard</span>
            </div>
          </Link>

          <nav className={styles.nav} aria-label="Primary navigation">
            <NavLink
              to="/"
              className={({ isActive }) => clsx(styles.navLink, isActive && styles.activeNavLink)}
            >
              <Radio size={14} />
              <span>Beacons</span>
            </NavLink>
            <NavLink
              to="/mails"
              className={({ isActive }) => clsx(styles.navLink, isActive && styles.activeNavLink)}
            >
              <Inbox size={14} />
              <span>Mails</span>
            </NavLink>
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

      <main className={styles.main}>{children ?? <Outlet />}</main>
    </div>
  );
}
