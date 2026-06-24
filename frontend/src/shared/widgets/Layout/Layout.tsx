import type { JSX, PropsWithChildren } from "react";

import { Link, Outlet, useLocation } from "react-router-dom";
import { Activity, MoonStar, SunMedium } from "lucide-react";

import { Button } from "@/shared/kit";
import { useTheme } from "@/shared/hooks/use-theme";

import styles from "./Layout.module.scss";
import { Logo } from "./Logo";

export function Layout({ children }: PropsWithChildren): JSX.Element {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const title = location.pathname.startsWith("/beacons/")
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

          <div className={styles.headerMeta}>
            <div className={styles.pageTitle}>
              <Activity size={15} />
              <span>{title}</span>
            </div>
            <Button
              variant="secondary"
              leftIcon={theme === "dark" ? <SunMedium size={14} /> : <MoonStar size={14} />}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children ?? <Outlet />}</main>
    </div>
  );
}
