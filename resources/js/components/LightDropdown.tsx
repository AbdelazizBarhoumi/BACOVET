import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

// -------- Lightweight Dropdown (no Portal, no Popper.js, no animations) --------
// Replaces Radix Select which creates a Portal + Popper.js positioning on every
// open/close. This uses position:fixed instead — instant open/close.

export const LightDropdown = React.memo(function LightDropdown({
  value,
  onValueChange,
  disabled,
  className,
  placeholder,
  allowDeselect,
  children,
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  allowDeselect?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
  }, []);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    if (open) {
      setOpen(false);
    } else {
      updatePosition();
      setOpen(true);
    }
  }, [disabled, open, updatePosition]);

  // Close on outside click or scroll (but not scroll inside the dropdown)
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        contentRef.current && !contentRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      const target = e.target as Node;
      if (contentRef.current && contentRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  // Find label for current value by scanning children.
  // Prefer an explicit `label` prop on LightDropdownItem; fall back to children.
  const selectedLabel = useMemo(() => {
    let found: string | undefined;
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const cp = child.props as Record<string, unknown>;
      if (cp.value === value) {
        found = typeof cp.label === "string"
          ? cp.label
          : typeof cp.children === "string"
            ? cp.children
            : String(cp.children ?? "");
      }
    });
    return found;
  }, [value, children]);

  const triggerClasses = cn(
    "relative h-auto min-h-[28px] py-1.5 px-2.5 pr-7 text-xs bg-card border border-border rounded-md cursor-pointer text-left",
    "hover:border-primary/50 hover:bg-muted/20",
    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted-foreground",
    !value && "text-muted-foreground",
    className,
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={triggerClasses}
      >
        <span className="line-clamp-1">{selectedLabel || placeholder}</span>
        <svg className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-50 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div
          ref={contentRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 50 }}
          className="max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1"
        >
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            const childProps = child.props as Record<string, unknown>;
            if (childProps.value !== undefined && childProps.value !== null && typeof childProps.value === "string") {
              return (
                <div
                  role="option"
                  aria-selected={childProps.value === value}
                  onClick={() => {
                    const newVal = allowDeselect && childProps.value === value ? "" : String(childProps.value);
                    onValueChange?.(newVal);
                    setOpen(false);
                  }}
                  className={cn(
                    "text-xs cursor-pointer rounded-sm px-2 py-1.5 select-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    childProps.value === value && "bg-accent text-accent-foreground",
                    childProps.className as string,
                  )}
                >
                  {childProps.children as React.ReactNode}
                </div>
              );
            }
            return child;
          })}
        </div>
      )}
    </>
  );
});

// -------- Dropdown Item (plain div, no Radix) --------
export const LightDropdownItem = React.memo(function LightDropdownItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-value={value} className={cn("text-xs", className)}>
      {children}
    </div>
  );
});
