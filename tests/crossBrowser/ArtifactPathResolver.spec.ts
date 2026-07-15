import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  // Logger also imports fs, provide defaults
  readdirSync: vi.fn().mockReturnValue([]),
  unlinkSync: vi.fn(),
}));

import * as fs from 'fs';
import { ArtifactPathResolver } from '../../src/core/ArtifactPathResolver';

describe('ArtifactPathResolver', () => {
  const originalEnv = process.env.CROSS_BROWSER_TARGET;

  beforeEach(() => {
    delete process.env.CROSS_BROWSER_TARGET;
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CROSS_BROWSER_TARGET = originalEnv;
    } else {
      delete process.env.CROSS_BROWSER_TARGET;
    }
    vi.clearAllMocks();
  });

  describe('getCurrentBrowser()', () => {
    it('should return undefined when CROSS_BROWSER_TARGET is not set', () => {
      delete process.env.CROSS_BROWSER_TARGET;
      expect(ArtifactPathResolver.getCurrentBrowser()).toBeUndefined();
    });

    it('should return the browser name when CROSS_BROWSER_TARGET is set', () => {
      process.env.CROSS_BROWSER_TARGET = 'chromium';
      expect(ArtifactPathResolver.getCurrentBrowser()).toBe('chromium');
    });

    it('should return firefox when CROSS_BROWSER_TARGET is firefox', () => {
      process.env.CROSS_BROWSER_TARGET = 'firefox';
      expect(ArtifactPathResolver.getCurrentBrowser()).toBe('firefox');
    });

    it('should return webkit when CROSS_BROWSER_TARGET is webkit', () => {
      process.env.CROSS_BROWSER_TARGET = 'webkit';
      expect(ArtifactPathResolver.getCurrentBrowser()).toBe('webkit');
    });

    it('should return undefined for empty string env var', () => {
      process.env.CROSS_BROWSER_TARGET = '';
      expect(ArtifactPathResolver.getCurrentBrowser()).toBeUndefined();
    });
  });

  describe('resolve()', () => {
    it('should return flat path in normal mode (no CROSS_BROWSER_TARGET)', () => {
      delete process.env.CROSS_BROWSER_TARGET;

      const result = ArtifactPathResolver.resolve('screenshots', 'login-failure.png');
      const expected = path.join('reports', 'screenshots', 'login-failure.png');
      expect(result).toBe(expected);
    });

    it('should insert browser subdirectory in cross-browser mode', () => {
      process.env.CROSS_BROWSER_TARGET = 'chromium';

      const result = ArtifactPathResolver.resolve('screenshots', 'login-failure.png');
      const expected = path.join('reports', 'screenshots', 'chromium', 'login-failure.png');
      expect(result).toBe(expected);
    });

    it('should work with firefox browser target', () => {
      process.env.CROSS_BROWSER_TARGET = 'firefox';

      const result = ArtifactPathResolver.resolve('videos', 'test-recording.webm');
      const expected = path.join('reports', 'videos', 'firefox', 'test-recording.webm');
      expect(result).toBe(expected);
    });

    it('should work with webkit browser target', () => {
      process.env.CROSS_BROWSER_TARGET = 'webkit';

      const result = ArtifactPathResolver.resolve('logs', 'console-output.txt');
      const expected = path.join('reports', 'logs', 'webkit', 'console-output.txt');
      expect(result).toBe(expected);
    });

    it('should call ensureDir on the parent directory when dir does not exist', () => {
      process.env.CROSS_BROWSER_TARGET = 'chromium';
      vi.mocked(fs.existsSync).mockReturnValue(false);

      ArtifactPathResolver.resolve('screenshots', 'test.png');

      const expectedDir = path.join('reports', 'screenshots', 'chromium');
      expect(fs.existsSync).toHaveBeenCalledWith(expectedDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      delete process.env.CROSS_BROWSER_TARGET;
      vi.mocked(fs.existsSync).mockReturnValue(true);

      ArtifactPathResolver.resolve('screenshots', 'test.png');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('ensureDir()', () => {
    it('should create directory recursively when it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      ArtifactPathResolver.ensureDir('reports/screenshots/chromium');

      expect(fs.mkdirSync).toHaveBeenCalledWith('reports/screenshots/chromium', { recursive: true });
    });

    it('should not create directory when it already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      ArtifactPathResolver.ensureDir('reports/screenshots/chromium');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
