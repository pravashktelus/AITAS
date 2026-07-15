import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessibilityEngine } from '../../src/core/AccessibilityEngine';

// Mock Logger to suppress output during tests
vi.mock('../../src/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock DataStore
vi.mock('../../src/utils/DataStore', () => ({
  DataStore: {
    set: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock fs to avoid file system operations
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('AccessibilityEngine - Mobile Accessibility Checks', () => {
  let engine: AccessibilityEngine;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      locator: vi.fn(),
      evaluate: vi.fn(),
      url: vi.fn().mockReturnValue('https://example.com'),
      title: vi.fn().mockResolvedValue('Test Page'),
      on: vi.fn(),
      accessibility: { snapshot: vi.fn() },
    };
    engine = new AccessibilityEngine(mockPage);
  });

  describe('auditMobileAccessibility', () => {
    it('should return empty array for non-mobile viewport (> 767px)', async () => {
      const result = await engine.auditMobileAccessibility(1024);
      expect(result).toEqual([]);
    });

    it('should return empty array for viewport exactly at 768px', async () => {
      const result = await engine.auditMobileAccessibility(768);
      expect(result).toEqual([]);
    });

    it('should run mobile checks for viewport at 767px', async () => {
      // Mock no interactive elements and no reflow issue
      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });
      mockPage.evaluate.mockResolvedValue(767); // scrollWidth = viewportWidth

      const result = await engine.auditMobileAccessibility(767);
      expect(result).toEqual([]);
    });

    it('should run mobile checks for viewport at 320px', async () => {
      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });
      mockPage.evaluate.mockResolvedValue(320);

      const result = await engine.auditMobileAccessibility(320);
      expect(result).toEqual([]);
    });

    it('should combine touch target and reflow violations', async () => {
      // Mock a small button element
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(false),
        boundingBox: vi.fn().mockResolvedValue({ width: 30, height: 30, x: 0, y: 0 }),
        evaluate: vi.fn().mockResolvedValue('button'),
        getAttribute: vi.fn().mockImplementation((attr: string) => {
          if (attr === 'id') return Promise.resolve('btn1');
          if (attr === 'aria-label') return Promise.resolve(null);
          return Promise.resolve(null);
        }),
        innerText: vi.fn().mockResolvedValue('Click'),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });
      // scrollWidth exceeds viewportWidth
      mockPage.evaluate.mockResolvedValue(500);

      const result = await engine.auditMobileAccessibility(375);
      // Should have both touch target and reflow violation
      expect(result.length).toBe(2);
      expect(result.some(v => v.rule === 'touch-target-size')).toBe(true);
      expect(result.some(v => v.rule === 'content-reflow')).toBe(true);
    });
  });

  describe('checkAllTouchTargets', () => {
    it('should return empty array when no interactive elements exist', async () => {
      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result).toEqual([]);
    });

    it('should return empty array when all elements meet minimum size', async () => {
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(false),
        boundingBox: vi.fn().mockResolvedValue({ width: 48, height: 48, x: 0, y: 0 }),
        evaluate: vi.fn().mockResolvedValue('button'),
        getAttribute: vi.fn().mockResolvedValue(null),
        innerText: vi.fn().mockResolvedValue('OK'),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result).toEqual([]);
    });

    it('should report violation when width < minSize', async () => {
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(false),
        boundingBox: vi.fn().mockResolvedValue({ width: 30, height: 48, x: 0, y: 0 }),
        evaluate: vi.fn().mockResolvedValue('a'),
        getAttribute: vi.fn().mockImplementation((attr: string) => {
          if (attr === 'id') return Promise.resolve(null);
          if (attr === 'aria-label') return Promise.resolve('My Link');
          return Promise.resolve(null);
        }),
        innerText: vi.fn().mockResolvedValue('Link text'),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result.length).toBe(1);
      expect(result[0].rule).toBe('touch-target-size');
      expect(result[0].severity).toBe('moderate');
      expect(result[0].wcagCriteria).toBe('WCAG 2.5.5 Target Size');
      expect(result[0].description).toContain('30x48');
    });

    it('should report violation when height < minSize', async () => {
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(false),
        boundingBox: vi.fn().mockResolvedValue({ width: 48, height: 20, x: 0, y: 0 }),
        evaluate: vi.fn().mockResolvedValue('input'),
        getAttribute: vi.fn().mockImplementation((attr: string) => {
          if (attr === 'id') return Promise.resolve('email-input');
          if (attr === 'aria-label') return Promise.resolve(null);
          return Promise.resolve(null);
        }),
        innerText: vi.fn().mockResolvedValue(''),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result.length).toBe(1);
      expect(result[0].description).toContain('48x20');
      expect(result[0].element).toContain('#email-input');
    });

    it('should skip hidden elements', async () => {
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(true),
        boundingBox: vi.fn().mockResolvedValue({ width: 10, height: 10, x: 0, y: 0 }),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result).toEqual([]);
    });

    it('should skip elements with no bounding box', async () => {
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(false),
        boundingBox: vi.fn().mockResolvedValue(null),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result).toEqual([]);
    });

    it('should not report violation at exactly 44x44', async () => {
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(false),
        boundingBox: vi.fn().mockResolvedValue({ width: 44, height: 44, x: 0, y: 0 }),
        evaluate: vi.fn().mockResolvedValue('button'),
        getAttribute: vi.fn().mockResolvedValue(null),
        innerText: vi.fn().mockResolvedValue('OK'),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result).toEqual([]);
    });

    it('should report violation at 43x44 (just under minSize for width)', async () => {
      const mockElement = {
        isHidden: vi.fn().mockResolvedValue(false),
        boundingBox: vi.fn().mockResolvedValue({ width: 43, height: 44, x: 0, y: 0 }),
        evaluate: vi.fn().mockResolvedValue('button'),
        getAttribute: vi.fn().mockImplementation((attr: string) => {
          if (attr === 'id') return Promise.resolve(null);
          if (attr === 'aria-label') return Promise.resolve(null);
          return Promise.resolve(null);
        }),
        innerText: vi.fn().mockResolvedValue('X'),
      };

      mockPage.locator.mockReturnValue({ all: vi.fn().mockResolvedValue([mockElement]) });

      const result = await engine.checkAllTouchTargets(44);
      expect(result.length).toBe(1);
    });
  });

  describe('checkContentReflow', () => {
    it('should return empty array when scrollWidth equals viewport width', async () => {
      mockPage.evaluate.mockResolvedValue(375);

      const result = await engine.checkContentReflow(375);
      expect(result).toEqual([]);
    });

    it('should return empty array when scrollWidth is less than viewport width', async () => {
      mockPage.evaluate.mockResolvedValue(300);

      const result = await engine.checkContentReflow(375);
      expect(result).toEqual([]);
    });

    it('should report violation when scrollWidth exceeds viewport width', async () => {
      mockPage.evaluate.mockResolvedValue(500);

      const result = await engine.checkContentReflow(375);
      expect(result.length).toBe(1);
      expect(result[0].rule).toBe('content-reflow');
      expect(result[0].severity).toBe('moderate');
      expect(result[0].wcagCriteria).toBe('WCAG 2.1 — 1.4.10 Reflow (Level AA)');
      expect(result[0].description).toContain('500');
      expect(result[0].description).toContain('375');
    });

    it('should include viewport and scroll width metadata in description', async () => {
      mockPage.evaluate.mockResolvedValue(800);

      const result = await engine.checkContentReflow(320);
      expect(result[0].description).toContain('scrollWidth (800px)');
      expect(result[0].description).toContain('viewport width (320px)');
    });
  });
});
