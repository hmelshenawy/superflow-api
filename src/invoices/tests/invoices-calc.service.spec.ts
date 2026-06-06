import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceCalcService } from '../invoices-calc.service';

describe('InvoiceCalcService', () => {
  let service: InvoiceCalcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceCalcService],
    }).compile();
    service = module.get<InvoiceCalcService>(InvoiceCalcService);
  });

  describe('calculateLine', () => {
    it('calculates line total and VAT correctly', () => {
      const result = service.calculateLine({
        quantity: 2,
        unit_price_cents: 10000,
        discount_cents: 1000,
        vat_rate: 0.05,
        vat_applicable: true,
      });
      expect(result.line_total_cents).toBe(19000); // 2*10000 - 1000
      expect(result.line_vat_cents).toBe(950); // 19000 * 0.05
    });

    it('returns zero VAT for VAT-exempt line', () => {
      const result = service.calculateLine({
        quantity: 1,
        unit_price_cents: 5000,
        discount_cents: 0,
        vat_rate: 0.05,
        vat_applicable: false,
      });
      expect(result.line_total_cents).toBe(5000);
      expect(result.line_vat_cents).toBe(0);
    });

    it('clamps negative line total to zero', () => {
      const result = service.calculateLine({
        quantity: 1,
        unit_price_cents: 1000,
        discount_cents: 2000,
        vat_rate: 0.05,
        vat_applicable: true,
      });
      expect(result.line_total_cents).toBe(0);
      expect(result.line_vat_cents).toBe(0);
    });

    it('handles zero quantity', () => {
      const result = service.calculateLine({
        quantity: 0,
        unit_price_cents: 10000,
        discount_cents: 0,
        vat_rate: 0.05,
        vat_applicable: true,
      });
      expect(result.line_total_cents).toBe(0);
      expect(result.line_vat_cents).toBe(0);
    });

    it('handles max discount (unit price fully discounted)', () => {
      const result = service.calculateLine({
        quantity: 1,
        unit_price_cents: 10000,
        discount_cents: 10000,
        vat_rate: 0.05,
        vat_applicable: true,
      });
      expect(result.line_total_cents).toBe(0);
      expect(result.line_vat_cents).toBe(0);
    });
  });

  describe('recalculate', () => {
    it('recalculates full invoice totals', () => {
      const lines = [
        { quantity: 2, unit_price_cents: 10000, discount_cents: 1000, vat_rate: 0.05, vat_applicable: true },
        { quantity: 1, unit_price_cents: 5000, discount_cents: 0, vat_rate: 0.05, vat_applicable: true },
      ];
      const result = service.recalculate(lines, 500);
      expect(result.totals.subtotal_cents).toBe(24000); // 19000 + 5000
      expect(result.totals.tax_total_cents).toBe(1200); // 950 + 250
      expect(result.totals.discount_total_cents).toBe(1500); // 1000 + 0 + 500 global
      expect(result.totals.grand_total_cents).toBe(25200); // 24000 + 1200
    });

    it('handles mixed VAT rates', () => {
      const lines = [
        { quantity: 1, unit_price_cents: 10000, discount_cents: 0, vat_rate: 0.05, vat_applicable: true },
        { quantity: 1, unit_price_cents: 5000, discount_cents: 0, vat_rate: 0.0, vat_applicable: true },
      ];
      const result = service.recalculate(lines);
      expect(result.totals.subtotal_cents).toBe(15000);
      expect(result.totals.tax_total_cents).toBe(500); // 10000 * 0.05 + 0
    });
  });
});
