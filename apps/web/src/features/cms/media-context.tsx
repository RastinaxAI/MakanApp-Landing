"use client";
import { createContext } from "react";
import type { MediaAsset } from "./types";
export const MediaUpdates = createContext<(asset: MediaAsset) => void>(
  () => undefined,
);
