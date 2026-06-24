import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";

import clsx from "clsx";

import { Spinner } from "../../UI/Spinner/Spinner";
import styles from "./Button.module.scss";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string | undefined;
};

export function Button({
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || isLoading}
      className={clsx(styles.button, styles[variant], fullWidth && styles.fullWidth, className)}
    >
      {isLoading ? <Spinner size={14} /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
