import type { JSX, ReactNode } from "react";

import clsx from "clsx";

import styles from "./Tabs.module.scss";

export type TabItem<T extends string> = {
  id: T;
  label: ReactNode;
  disabled?: boolean;
};

type TabsProps<T extends string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: TabsProps<T>): JSX.Element {
  return (
    <div className={styles.tabs} role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            disabled={item.disabled}
            className={clsx(styles.tab, isActive && styles.active, item.disabled && styles.disabled)}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
