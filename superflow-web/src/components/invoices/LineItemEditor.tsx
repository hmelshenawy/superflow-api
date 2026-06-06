"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateLineItemInput } from "@/lib/invoices";

const LINE_TYPES = [
  { value: "labour", label: "Labour" },
  { value: "part", label: "Part" },
  { value: "other", label: "Other" },
] as const;

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCents(value: string) {
  const num = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

function calcLineTotal(item: CreateLineItemInput) {
  const qty = Math.max(0, item.quantity || 0);
  const price = Math.max(0, item.unit_price_cents || 0);
  const disc = Math.max(0, item.discount_cents || 0);
  return Math.max(0, qty * price - disc);
}

interface LineItemEditorProps {
  items: CreateLineItemInput[];
  onChange: (items: CreateLineItemInput[]) => void;
  readOnly?: boolean;
}

export function LineItemEditor({ items, onChange, readOnly }: LineItemEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addItem = () => {
    onChange([
      ...items,
      {
        type: "labour",
        description: "",
        quantity: 1,
        unit_price_cents: 0,
        discount_cents: 0,
        vat_rate: 0,
        vat_applicable: true,
        sort_order: items.length + 1,
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<CreateLineItemInput>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const moved = items[dragIndex];
    const next = [...items];
    next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_100px_1fr_80px_100px_80px_100px_auto] gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2">
        <span />
        <span>Type</span>
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit (AED)</span>
        <span className="text-right">Disc (AED)</span>
        <span className="text-right">Line Total</span>
        <span />
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          draggable={!readOnly}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          className={cn(
            "grid grid-cols-[auto_100px_1fr_80px_100px_80px_100px_auto] items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm",
            dragIndex === index && "opacity-60",
          )}
        >
          <div className="cursor-grab text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          <Select
            value={item.type}
            onValueChange={(v) => updateItem(index, { type: v as any })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={item.description}
            onChange={(e) => updateItem(index, { description: e.target.value })}
            placeholder="Description"
            className="h-8 rounded-lg text-xs"
            disabled={readOnly}
          />

          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 0) })}
            className="h-8 rounded-lg text-xs text-right"
            disabled={readOnly}
          />

          <Input
            value={formatCents(item.unit_price_cents)}
            onChange={(e) => updateItem(index, { unit_price_cents: parseCents(e.target.value) })}
            placeholder="0.00"
            className="h-8 rounded-lg text-xs text-right"
            disabled={readOnly}
          />

          <Input
            value={formatCents(item.discount_cents || 0)}
            onChange={(e) => updateItem(index, { discount_cents: parseCents(e.target.value) })}
            placeholder="0.00"
            className="h-8 rounded-lg text-xs text-right"
            disabled={readOnly}
          />

          <div className="text-right text-xs font-semibold text-foreground">
            {formatCents(calcLineTotal(item))}
          </div>

          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-600"
              onClick={() => removeItem(index)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}

      {!readOnly && (
        <Button
          variant="outline"
          className="h-9 rounded-xl border-dashed text-xs"
          onClick={addItem}
        >
          + Add line item
        </Button>
      )}
    </div>
  );
}
