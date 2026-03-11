import { createContext, useContext, useRef } from 'react';

export interface GridHeightContextValue {
  registerBox: (id: number, height: number) => void;
  unregisterBox: (id: number) => void;
  getBoxId: () => number;
  syncedHeight: number | null;
  enabled: boolean;
}

export const GridHeightContext = createContext<GridHeightContextValue | null>(
  null,
);

export function useGridHeight(): GridHeightContextValue | null {
  return useContext(GridHeightContext);
}

let nextBoxId = 0;
export function useBoxId(): number {
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) {
    idRef.current = nextBoxId++;
  }
  return idRef.current;
}
