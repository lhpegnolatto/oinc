"use client";

import {
  CATEGORY_ICON_KEYS,
  type CategoryIconKey,
} from "@oinc/api/category-appearance";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COLOR_PRESETS } from "@/lib/color-presets";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON_COMPONENTS } from "../lib/category-icons";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

// Mirrors wallets/components/wallet-appearance-picker.tsx — same
// color-picking UI, categories' own curated icon vocabulary.
export function CategoryAppearancePicker({
  color,
  icon,
  onColorChange,
  onIconChange,
}: {
  color: string;
  icon: CategoryIconKey;
  onColorChange: (color: string) => void;
  onIconChange: (icon: CategoryIconKey) => void;
}) {
  const [hexInput, setHexInput] = useState(color);
  const Icon = CATEGORY_ICON_COMPONENTS[icon];

  function handleColorChange(next: string) {
    onColorChange(next);
    setHexInput(next);
  }

  return (
    <Popover onOpenChange={(open) => open && setHexInput(color)}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{ backgroundColor: color }}
          />
        }
      >
        <Icon className="size-5 text-white" />
        <span className="sr-only">Choose icon and color</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-medium text-muted-foreground">Icon</p>
          <div className="grid grid-cols-6 gap-1">
            {CATEGORY_ICON_KEYS.map((key) => {
              const OptionIcon = CATEGORY_ICON_COMPONENTS[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === icon}
                  onClick={() => onIconChange(key)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                    key === icon && "bg-accent text-accent-foreground",
                  )}
                >
                  <OptionIcon className="size-4" />
                  <span className="sr-only">{key}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <p className="text-xs font-medium text-muted-foreground">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={preset === color}
                onClick={() => handleColorChange(preset)}
                className={cn(
                  "size-6 rounded-full ring-1 ring-foreground/10",
                  preset === color &&
                    "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                )}
                style={{ backgroundColor: preset }}
              >
                <span className="sr-only">{preset}</span>
              </button>
            ))}
          </div>
          <HexColorPicker
            color={color}
            onChange={handleColorChange}
            style={{ width: "100%" }}
          />
          <Input
            value={hexInput}
            onChange={(event) => {
              const next = event.target.value;
              setHexInput(next);
              if (HEX_COLOR_REGEX.test(next)) {
                onColorChange(next);
              }
            }}
            aria-label="Hex color"
            placeholder="#71717a"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
