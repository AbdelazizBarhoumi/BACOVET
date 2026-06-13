import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface FilterState {
  marque: string;
  atelier: string;
  ligne: string;
  of: string;
}

interface FilterContextType {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
  getFilterParams: () => Record<string, string>;
}

const DEFAULT_FILTERS: FilterState = {
  marque: "",
  atelier: "",
  ligne: "",
  of: "",
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value === "Toutes" || value === "Tous" ? "" : value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const getFilterParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.marque) params.marque = filters.marque;
    if (filters.atelier) params.atelier = filters.atelier;
    if (filters.ligne) params.ligne = filters.ligne;
    if (filters.of) params.of = filters.of;
    return params;
  }, [filters]);

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, getFilterParams }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
