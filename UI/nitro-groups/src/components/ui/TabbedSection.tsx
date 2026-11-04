"use client";

import { ReactNode, useId, useRef, useState, Children, isValidElement, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface TabItemProps {
  title: string;
  tabKey: string;
  children: ReactNode;
}

export function TabItem({ children }: TabItemProps) {
  return <>{children}</>;
}

interface TabbedSectionProps {
  children: ReactNode;
  /** Nombre accesible de la lista de pestañas. */
  label?: string;
  className?: string;
}

/**
 * Pestañas de texto con un subrayado acento de 2px en la activa. Patrón WAI-ARIA: flechas
 * izquierda/derecha, Inicio y Fin mueven el foco y activan; solo la pestaña activa entra en el
 * orden de tabulación.
 */
export default function TabbedSection({ children, label, className }: TabbedSectionProps) {
  const tabs: { title: string; tabKey: string; content: ReactNode }[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    const { title, tabKey, children: tabContent } = child.props as Partial<TabItemProps>;

    if (typeof title !== "string" || typeof tabKey !== "string") return;

    tabs.push({
      title,
      tabKey,
      content: tabContent,
    });
  });

  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [chosenKey, setSelectedKey] = useState("");

  // La pestaña activa se deriva: la elegida si sigue existiendo, si no la primera.
  const selectedKey = tabs.some((tab) => tab.tabKey === chosenKey) ? chosenKey : (tabs[0]?.tabKey ?? "");
  const activeTab = tabs.find((t) => t.tabKey === selectedKey);

  const tabId = (key: string) => `${baseId}-tab-${key}`;
  const panelId = (key: string) => `${baseId}-panel-${key}`;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = tabs.findIndex((t) => t.tabKey === selectedKey);
    if (current < 0) return;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    setSelectedKey(tabs[next].tabKey);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        // La línea base va como sombra interior: un borde real quedaría fuera del área que recorta
        // overflow-x-auto y taparía el subrayado de la pestaña activa.
        className="flex gap-8 overflow-x-auto shadow-[inset_0_-2px_0_var(--fondo-2)]"
      >
        {tabs.map((tab, i) => {
          const isSelected = tab.tabKey === selectedKey;
          return (
            <button
              key={tab.tabKey}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={tabId(tab.tabKey)}
              aria-selected={isSelected}
              aria-controls={panelId(tab.tabKey)}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedKey(tab.tabKey)}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 pb-3 pt-1 font-semibold transition-colors duration-150 focus-visible:-outline-offset-2",
                isSelected
                  ? "border-acento text-tinta"
                  : "border-transparent text-tinta-2 hover:border-fondo-3 hover:text-tinta",
              )}
            >
              {tab.title}
            </button>
          );
        })}
      </div>

      {activeTab && (
        <div
          role="tabpanel"
          id={panelId(activeTab.tabKey)}
          aria-labelledby={tabId(activeTab.tabKey)}
          tabIndex={0}
          className="focus-visible:outline-offset-8"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
