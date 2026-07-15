import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TagParser } from '../../src/core/TagParser';

describe('TagParser.parseBrowserListTag', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('valid @browsers: tag parsing', () => {
    it('should parse a multi-browser tag: @browsers:chromium,firefox', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:chromium,firefox']);
      expect(result).toEqual({ browsers: ['chromium', 'firefox'], valid: true });
    });

    it('should parse a single browser tag: @browsers:webkit', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:webkit']);
      expect(result).toEqual({ browsers: ['webkit'], valid: true });
    });

    it('should parse all three browsers: @browsers:chromium,firefox,webkit', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:chromium,firefox,webkit']);
      expect(result).toEqual({ browsers: ['chromium', 'firefox', 'webkit'], valid: true });
    });

    it('should handle case-insensitive tag prefix: @Browsers:Chromium,Firefox', () => {
      const result = TagParser.parseBrowserListTag(['@Browsers:Chromium,Firefox']);
      expect(result).toEqual({ browsers: ['chromium', 'firefox'], valid: true });
    });

    it('should trim whitespace around browser entries', () => {
      const result = TagParser.parseBrowserListTag(['@browsers: chromium , firefox ']);
      expect(result).toEqual({ browsers: ['chromium', 'firefox'], valid: true });
    });

    it('should deduplicate browser entries', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:chromium,chromium,firefox']);
      expect(result).toEqual({ browsers: ['chromium', 'firefox'], valid: true });
    });
  });

  describe('no @browsers: tag present', () => {
    it('should return empty browsers with valid=true when no tags', () => {
      const result = TagParser.parseBrowserListTag([]);
      expect(result).toEqual({ browsers: [], valid: true });
    });

    it('should return empty browsers with valid=true when only other tags present', () => {
      const result = TagParser.parseBrowserListTag(['@smoke', '@regression', '@device:iPhone14']);
      expect(result).toEqual({ browsers: [], valid: true });
    });

    it('should return empty browsers with valid=true when only legacy tags present', () => {
      const result = TagParser.parseBrowserListTag(['@chromium-only']);
      expect(result).toEqual({ browsers: [], valid: true });
    });
  });

  describe('invalid browser names (Requirement 3.5)', () => {
    it('should ignore invalid browser name and log warning', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:edge,chromium']);
      expect(result).toEqual({ browsers: ['chromium'], valid: true });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unrecognized browser name "edge"')
      );
    });

    it('should log warning with valid browsers list', () => {
      TagParser.parseBrowserListTag(['@browsers:opera,chromium']);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Valid browsers are: chromium, firefox, webkit')
      );
    });

    it('should filter multiple invalid entries and keep valid ones', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:edge,opera,chromium,safari']);
      expect(result).toEqual({ browsers: ['chromium'], valid: true });
      expect(warnSpy).toHaveBeenCalledTimes(3); // edge, opera, safari
    });
  });

  describe('empty browser list after filtering (Requirement 3.6)', () => {
    it('should return validation error when all entries are invalid', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:edge,opera']);
      expect(result.valid).toBe(false);
      expect(result.browsers).toEqual([]);
      expect(result.error).toContain('no valid browser names');
    });

    it('should return validation error for single invalid entry', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:safari']);
      expect(result.valid).toBe(false);
      expect(result.browsers).toEqual([]);
      expect(result.error).toContain('no valid browser names');
    });
  });

  describe('conflict with legacy tags (Requirement 3.4)', () => {
    it('should return error when @browsers: combined with @X-only tag', () => {
      const result = TagParser.parseBrowserListTag(['@chromium-only', '@browsers:chromium,firefox']);
      expect(result.valid).toBe(false);
      expect(result.browsers).toEqual([]);
      expect(result.error).toContain('Conflicting browser tag formats');
      expect(result.error).toContain('@chromium-only');
    });

    it('should return error when @browsers: combined with @skip-X tag', () => {
      const result = TagParser.parseBrowserListTag(['@skip-webkit', '@browsers:chromium,firefox']);
      expect(result.valid).toBe(false);
      expect(result.browsers).toEqual([]);
      expect(result.error).toContain('Conflicting browser tag formats');
      expect(result.error).toContain('@skip-webkit');
    });

    it('should return error when @browsers: combined with multiple legacy tags', () => {
      const result = TagParser.parseBrowserListTag([
        '@chromium-only',
        '@skip-firefox',
        '@browsers:webkit',
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Conflicting browser tag formats');
    });
  });

  describe('edge cases', () => {
    it('should use only the first @browsers: tag if multiple present', () => {
      const result = TagParser.parseBrowserListTag([
        '@browsers:chromium',
        '@browsers:firefox',
      ]);
      expect(result.browsers).toEqual(['chromium']);
      expect(result.valid).toBe(true);
    });

    it('should handle @browsers: tag mixed with non-browser tags', () => {
      const result = TagParser.parseBrowserListTag([
        '@smoke',
        '@browsers:firefox,webkit',
        '@regression',
      ]);
      expect(result).toEqual({ browsers: ['firefox', 'webkit'], valid: true });
    });

    it('should handle empty comma-separated entries gracefully', () => {
      const result = TagParser.parseBrowserListTag(['@browsers:chromium,,firefox']);
      expect(result).toEqual({ browsers: ['chromium', 'firefox'], valid: true });
    });
  });
});
