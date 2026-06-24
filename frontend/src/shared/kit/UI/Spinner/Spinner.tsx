import type { JSX } from "react";

import styles from "./Spinner.module.scss";

type SpinnerProps = {
  size?: number;
};

export function Spinner({ size = 16 }: SpinnerProps): JSX.Element {
  return <span className={styles.spinner} style={{ width: size, height: size }} aria-hidden="true" />;
}
