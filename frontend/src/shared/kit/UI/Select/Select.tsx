import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";

import { findNextEnabledOptionIndex } from "./select-navigation";
import styles from "./Select.module.scss";

export type SelectOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
};

type SelectProps<T extends string> = {
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (value: T) => void;
  readonly ariaLabel: string;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
};

type MenuPosition = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly maxHeight: number;
};

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 4;
const MAX_MENU_HEIGHT = 260;
const MIN_MENU_HEIGHT = 96;

export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  name,
  disabled = false,
  placeholder = "Select",
  className,
}: SelectProps<T>): JSX.Element {
  const listboxId = `select-${useId().replaceAll(":", "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : findNextEnabledOptionIndex(options, -1, 1));
  }, [isOpen, options, selectedIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    const updateMenuPosition = (): void => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const desiredHeight = Math.min(menu.scrollHeight, MAX_MENU_HEIGHT);
      const spaceBelow = window.innerHeight - triggerRect.bottom - MENU_GAP - VIEWPORT_MARGIN;
      const spaceAbove = triggerRect.top - MENU_GAP - VIEWPORT_MARGIN;
      const isAbove = spaceBelow < Math.min(desiredHeight, MIN_MENU_HEIGHT) && spaceAbove > spaceBelow;
      const availableHeight = isAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(MIN_MENU_HEIGHT, Math.min(MAX_MENU_HEIGHT, availableHeight));
      const renderedHeight = Math.min(desiredHeight, maxHeight);
      const unclampedLeft = triggerRect.left;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, unclampedLeft),
        window.innerWidth - triggerRect.width - VIEWPORT_MARGIN,
      );
      const top = isAbove
        ? Math.max(VIEWPORT_MARGIN, triggerRect.top - MENU_GAP - renderedHeight)
        : triggerRect.bottom + MENU_GAP;

      setMenuPosition({
        top,
        left,
        width: triggerRect.width,
        maxHeight,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }

    menuRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const selectOption = (option: SelectOption<T>): void => {
    if (!option.disabled && option.value !== value) {
      onChange(option.value);
    }

    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : findNextEnabledOptionIndex(options, -1, 1));
        return;
      }

      setActiveIndex((currentIndex) => findNextEnabledOptionIndex(options, currentIndex, direction));
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(
        event.key === "Home"
          ? findNextEnabledOptionIndex(options, -1, 1)
          : findNextEnabledOptionIndex(options, 0, -1),
      );
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      const activeOption = options[activeIndex];
      if (activeOption) {
        selectOption(activeOption);
      }
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const menu = isOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={`${ariaLabel} options`}
          className={styles.menu}
          style={{
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            width: menuPosition?.width,
            maxHeight: menuPosition?.maxHeight,
            visibility: menuPosition ? "visible" : "hidden",
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <div
                key={option.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                data-option-index={index}
                className={clsx(
                  styles.option,
                  isSelected && styles.selected,
                  isActive && styles.active,
                  option.disabled && styles.disabled,
                )}
                onPointerMove={() => {
                  if (!option.disabled) {
                    setActiveIndex(index);
                  }
                }}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={13} aria-hidden="true" /> : null}
              </div>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={clsx(styles.root, className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        className={clsx(styles.trigger, isOpen && styles.open)}
        onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
        onKeyDown={handleKeyDown}
      >
        <span className={clsx(styles.value, !selectedOption && styles.placeholder)}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown size={14} aria-hidden="true" className={styles.chevron} />
      </button>
      {menu}
    </div>
  );
}
