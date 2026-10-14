"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

const ElementFocus = createContext({
  focus: { node: "", index: 0 },
  reveal: (node: string, index: number) => {
    void node;
    void index;
  },
});
export const useElementFocus = () => useContext(ElementFocus);
export function ElementFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState({ node: "", index: 0 });
  return (
    <ElementFocus.Provider
      value={{ focus, reveal: (node, index) => setFocus({ node, index }) }}
    >
      {children}
    </ElementFocus.Provider>
  );
}
