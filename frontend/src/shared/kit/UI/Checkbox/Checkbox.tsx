import { Check } from "lucide-react";
import clsx from "clsx";
import {
  useId,
  type InputHTMLAttributes,
  type JSX,
  type ReactNode,
} from "react";

import styles from "./Checkbox.module.scss";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  readonly label: ReactNode;
  readonly description?: ReactNode;
};

export function Checkbox({
  label,
  description,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}: CheckboxProps): JSX.Element {
  const generatedId = useId().replaceAll(":", "");
  const inputId = id ?? `checkbox-${generatedId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <label className={clsx(styles.root, className)} htmlFor={inputId}>
      <input
        {...inputProps}
        id={inputId}
        type="checkbox"
        className={styles.input}
        aria-describedby={describedBy}
      />
      <span className={styles.box} aria-hidden="true">
        <Check size={12} strokeWidth={3} />
      </span>
      <span className={styles.content}>
        <span className={styles.label}>{label}</span>
        {description ? (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
