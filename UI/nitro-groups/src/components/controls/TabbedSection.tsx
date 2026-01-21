"use client";

import { ReactNode, useState, Children, isValidElement } from "react";

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
}

export default function TabbedSection({ children }: TabbedSectionProps) {
  const tabs: { title: string; tabKey: string; content: ReactNode }[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement<TabItemProps>(child) && child.type === TabItem) {
      tabs.push({
        title: child.props.title,
        tabKey: child.props.tabKey,
        content: child.props.children,
      });
    }
  });

  const [selectedKey, setSelectedKey] = useState(tabs[0]?.tabKey || "");

  const activeTab = tabs.find((t) => t.tabKey === selectedKey);

  return (
    <div className="mx-auto mt-5 px-3">
      <nav className="flex justify-around mb-2 overflow-x-auto bg-muted text-muted-foreground p-[3px] rounded-2xl">
        {tabs.map((tab) => {
          const isSelected = tab.tabKey === selectedKey;
          const tabClass = isSelected
            ? "py-[2px] px-4 bg-card text-white w-full font-semibold transition-colors duration-200 cursor-pointer whitespace-nowrap rounded-2xl"
            : "py-[2px] px-4 text-white w-full hover:bg-card/50 transition-colors duration-200 cursor-pointer whitespace-nowrap rounded-2xl";

          return (
            <button
              key={tab.tabKey}
              className={tabClass}
              onClick={() => setSelectedKey(tab.tabKey)}
            >
              {tab.title}
            </button>
          );
        })}
      </nav>

      <div className="p-2 rounded-xl shadow-lg">
        {activeTab ? (
          activeTab.content
        ) : (
          <p className="text-white">Selecciona una sección para ver el contenido.</p>
        )}
      </div>
    </div>
  );
}
