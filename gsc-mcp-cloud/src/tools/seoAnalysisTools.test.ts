import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findHighPotentialKeywordsTool,
  checkPageExperienceTool,
  getCoverageReportTool,
  analyzeBacklinksTool,
  spotContentOpportunitiesTool,
  analyzeRegionalDevicePerformanceTool,
  analyzeAlgorithmImpactTool
} from './seoAnalysisTools';

// Mock the gscHelper module
vi.mock('../utils/gscHelper', () => ({
  getAuthenticatedClient: vi.fn(),
  calculatePercentageChange: vi.fn((before: number, after: number) => {
    if (before === 0) return after > 0 ? 100 : 0;
    return ((after - before) / before) * 100;
  }),
  formatChange: vi.fn((value: number, decimals = 1) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}`;
  }),
  formatDate: vi.fn((date: Date) => date.toISOString().split('T')[0]),
  getDateRange: vi.fn((days: number) => {
    const endDate = new Date('2025-12-30');
    const startDate = new Date('2025-12-30');
    startDate.setDate(startDate.getDate() - days);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }),
  getExpectedCTR: vi.fn((position: number) => {
    if (position <= 1) return 0.30;
    if (position <= 2) return 0.15;
    if (position <= 3) return 0.10;
    if (position <= 5) return 0.05;
    if (position <= 10) return 0.02;
    return 0.01;
  })
}));

import { getAuthenticatedClient } from '../utils/gscHelper';

// Mock environment
const mockEnv = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'https://test.com/callback',
  OAUTH_KV: {} as any
};

const mockParams = { env: mockEnv };

// Mock GSC client
const createMockClient = () => ({
  querySearchAnalytics: vi.fn(),
  inspectUrl: vi.fn(),
  listSitemaps: vi.fn()
});

describe('SEO Analysis Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findHighPotentialKeywordsTool', () => {
    it('should have correct name and description', () => {
      expect(findHighPotentialKeywordsTool.name).toBe('find_high_potential_keywords');
      expect(findHighPotentialKeywordsTool.description).toContain('striking distance');
    });

    it('should validate schema correctly', () => {
      const validInput = {
        site_url: 'https://example.com',
        days: 28,
        min_impressions: 100,
        ctr_threshold: 2,
        position_range_start: 11,
        position_range_end: 40
      };

      const result = findHighPotentialKeywordsTool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid site_url', () => {
      const invalidInput = {
        site_url: '',
        days: 28
      };

      const result = findHighPotentialKeywordsTool.schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject days outside valid range', () => {
      const invalidInput = {
        site_url: 'https://example.com',
        days: 600 // Max is 540
      };

      const result = findHighPotentialKeywordsTool.schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should return error when not authenticated', async () => {
      vi.mocked(getAuthenticatedClient).mockResolvedValue({ error: 'Not authenticated' });

      const result = await findHighPotentialKeywordsTool.execute(mockParams, {
        site_url: 'https://example.com',
        days: 28,
        min_impressions: 100,
        ctr_threshold: 2,
        position_range_start: 11,
        position_range_end: 40
      });

      expect(result.content[0].text).toBe('Not authenticated');
    });

    it('should return no data message when no rows', async () => {
      const mockClient = createMockClient();
      mockClient.querySearchAnalytics.mockResolvedValue({ rows: [] });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await findHighPotentialKeywordsTool.execute(mockParams, {
        site_url: 'https://example.com',
        days: 28,
        min_impressions: 100,
        ctr_threshold: 2,
        position_range_start: 11,
        position_range_end: 40
      });

      expect(result.content[0].text).toContain('No search data available');
    });

    it('should identify striking distance keywords', async () => {
      const mockClient = createMockClient();
      mockClient.querySearchAnalytics.mockResolvedValue({
        rows: [
          { keys: ['test keyword'], position: 15, impressions: 500, clicks: 10, ctr: 0.02 },
          { keys: ['another keyword'], position: 25, impressions: 300, clicks: 5, ctr: 0.017 },
          { keys: ['page 1 keyword'], position: 5, impressions: 1000, clicks: 100, ctr: 0.1 }
        ]
      });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await findHighPotentialKeywordsTool.execute(mockParams, {
        site_url: 'https://example.com',
        days: 28,
        min_impressions: 100,
        ctr_threshold: 2,
        position_range_start: 11,
        position_range_end: 40
      });

      const text = result.content[0].text as string;
      expect(text).toContain('STRIKING DISTANCE KEYWORDS');
      expect(text).toContain('test keyword');
      expect(text).toContain('another keyword');
      // page 1 keyword should not be in striking distance section
    });

    it('should identify CTR opportunities', async () => {
      const mockClient = createMockClient();
      mockClient.querySearchAnalytics.mockResolvedValue({
        rows: [
          { keys: ['low ctr keyword'], position: 3, impressions: 1000, clicks: 5, ctr: 0.005 }
        ]
      });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await findHighPotentialKeywordsTool.execute(mockParams, {
        site_url: 'https://example.com',
        days: 28,
        min_impressions: 100,
        ctr_threshold: 2,
        position_range_start: 11,
        position_range_end: 40
      });

      const text = result.content[0].text as string;
      expect(text).toContain('CTR OPPORTUNITY KEYWORDS');
      expect(text).toContain('low ctr keyword');
    });
  });

  describe('checkPageExperienceTool', () => {
    it('should have correct name and description', () => {
      expect(checkPageExperienceTool.name).toBe('check_page_experience');
      expect(checkPageExperienceTool.description).toContain('mobile usability');
    });

    it('should validate schema correctly', () => {
      const validInput = {
        site_url: 'https://example.com',
        urls: 'https://example.com/page1\nhttps://example.com/page2'
      };

      const result = checkPageExperienceTool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept comma-separated URLs', async () => {
      const mockClient = createMockClient();
      mockClient.inspectUrl.mockResolvedValue({
        inspectionResult: {
          mobileUsabilityResult: { verdict: 'PASS' },
          indexStatusResult: {
            crawledAs: 'MOBILE',
            lastCrawlTime: '2025-12-29T10:00:00Z',
            pageFetchState: 'SUCCESSFUL',
            robotsTxtState: 'ALLOWED',
            indexingState: 'INDEXING_ALLOWED'
          }
        }
      });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await checkPageExperienceTool.execute(mockParams, {
        site_url: 'https://example.com',
        urls: 'https://example.com/page1, https://example.com/page2'
      });

      // Should have called inspectUrl twice (once for each URL)
      expect(mockClient.inspectUrl).toHaveBeenCalledTimes(2);
    });

    it('should report mobile usability issues', async () => {
      const mockClient = createMockClient();
      mockClient.inspectUrl.mockResolvedValue({
        inspectionResult: {
          mobileUsabilityResult: {
            verdict: 'FAIL',
            issues: [{ issueType: 'MOBILE_FRIENDLY_ISSUE' }]
          },
          indexStatusResult: {
            crawledAs: 'MOBILE',
            pageFetchState: 'SUCCESSFUL',
            robotsTxtState: 'ALLOWED',
            indexingState: 'INDEXING_ALLOWED'
          }
        }
      });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await checkPageExperienceTool.execute(mockParams, {
        site_url: 'https://example.com',
        urls: 'https://example.com/page1'
      });

      const text = result.content[0].text as string;
      expect(text).toContain('Mobile Usability: FAIL');
      expect(text).toContain('Mobile Usability Fail: 1');
    });
  });

  describe('getCoverageReportTool', () => {
    it('should have correct name and description', () => {
      expect(getCoverageReportTool.name).toBe('get_coverage_report');
      expect(getCoverageReportTool.description).toContain('indexing');
    });

    it('should validate schema correctly', () => {
      const validInput = {
        site_url: 'https://example.com',
        urls: 'https://example.com/page1'
      };

      const result = getCoverageReportTool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should categorize indexed vs not indexed URLs', async () => {
      const mockClient = createMockClient();
      mockClient.inspectUrl
        .mockResolvedValueOnce({
          inspectionResult: {
            indexStatusResult: {
              verdict: 'PASS',
              coverageState: 'Indexed'
            }
          }
        })
        .mockResolvedValueOnce({
          inspectionResult: {
            indexStatusResult: {
              verdict: 'NEUTRAL',
              coverageState: 'Crawled - currently not indexed'
            }
          }
        });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await getCoverageReportTool.execute(mockParams, {
        site_url: 'https://example.com',
        urls: 'https://example.com/indexed\nhttps://example.com/not-indexed'
      });

      const text = result.content[0].text as string;
      expect(text).toContain('COVERAGE SUMMARY');
      expect(text).toContain('Indexed: 1');
    });
  });

  describe('analyzeBacklinksTool', () => {
    it('should have correct name and description', () => {
      expect(analyzeBacklinksTool.name).toBe('analyze_backlinks');
      expect(analyzeBacklinksTool.description).toContain('page authority');
      expect(analyzeBacklinksTool.description).toContain('NOT available via GSC API');
    });

    it('should validate schema correctly', () => {
      const validInput = {
        site_url: 'https://example.com',
        days: 28
      };

      const result = analyzeBacklinksTool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should identify top authority pages', async () => {
      const mockClient = createMockClient();
      mockClient.querySearchAnalytics.mockResolvedValue({
        rows: [
          { keys: ['/top-page'], clicks: 500, impressions: 10000 },
          { keys: ['/second-page'], clicks: 200, impressions: 5000 },
          { keys: ['/low-page'], clicks: 5, impressions: 100 }
        ]
      });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await analyzeBacklinksTool.execute(mockParams, {
        site_url: 'https://example.com',
        days: 28
      });

      const text = result.content[0].text as string;
      expect(text).toContain('TOP AUTHORITY PAGES');
      expect(text).toContain('/top-page');
      expect(text).toContain('IMPORTANT: External backlink data is NOT available');
    });
  });

  describe('spotContentOpportunitiesTool', () => {
    it('should have correct name and description', () => {
      expect(spotContentOpportunitiesTool.name).toBe('spot_content_opportunities');
      expect(spotContentOpportunitiesTool.description).toContain('rising');
      expect(spotContentOpportunitiesTool.description).toContain('declining');
    });

    it('should validate schema correctly', () => {
      const validInput = {
        site_url: 'https://example.com',
        recent_days: 14,
        comparison_days: 14,
        growth_threshold: 20
      };

      const result = spotContentOpportunitiesTool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should identify rising queries', async () => {
      const mockClient = createMockClient();
      // First call - recent period
      mockClient.querySearchAnalytics
        .mockResolvedValueOnce({
          rows: [
            { keys: ['rising keyword'], clicks: 100, impressions: 1000 },
            { keys: ['stable keyword'], clicks: 50, impressions: 500 }
          ]
        })
        // Second call - comparison period
        .mockResolvedValueOnce({
          rows: [
            { keys: ['rising keyword'], clicks: 20, impressions: 200 },
            { keys: ['stable keyword'], clicks: 48, impressions: 480 }
          ]
        })
        // Third call - recent pages
        .mockResolvedValueOnce({
          rows: [{ keys: ['/page1'], clicks: 100, impressions: 1000 }]
        })
        // Fourth call - comparison pages
        .mockResolvedValueOnce({
          rows: [{ keys: ['/page1'], clicks: 80, impressions: 800 }]
        });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await spotContentOpportunitiesTool.execute(mockParams, {
        site_url: 'https://example.com',
        recent_days: 14,
        comparison_days: 14,
        growth_threshold: 20
      });

      const text = result.content[0].text as string;
      expect(text).toContain('Content Opportunities Report');
      expect(text).toContain('EMERGING TOPICS');
    });

    it('should identify declining queries', async () => {
      const mockClient = createMockClient();
      mockClient.querySearchAnalytics
        .mockResolvedValueOnce({
          rows: [
            { keys: ['declining keyword'], clicks: 10, impressions: 100 }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { keys: ['declining keyword'], clicks: 100, impressions: 1000 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await spotContentOpportunitiesTool.execute(mockParams, {
        site_url: 'https://example.com',
        recent_days: 14,
        comparison_days: 14,
        growth_threshold: 20
      });

      const text = result.content[0].text as string;
      expect(text).toContain('DECLINING TOPICS');
    });
  });

  describe('analyzeRegionalDevicePerformanceTool', () => {
    it('should have correct name and description', () => {
      expect(analyzeRegionalDevicePerformanceTool.name).toBe('analyze_regional_device_performance');
      expect(analyzeRegionalDevicePerformanceTool.description).toContain('country');
      expect(analyzeRegionalDevicePerformanceTool.description).toContain('device');
    });

    it('should validate schema correctly', () => {
      const validInput = {
        site_url: 'https://example.com',
        days: 28,
        top_countries: 10
      };

      const result = analyzeRegionalDevicePerformanceTool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should analyze device breakdown', async () => {
      const mockClient = createMockClient();
      // Device query
      mockClient.querySearchAnalytics
        .mockResolvedValueOnce({
          rows: [
            { keys: ['MOBILE'], clicks: 500, impressions: 10000, ctr: 0.05, position: 8 },
            { keys: ['DESKTOP'], clicks: 300, impressions: 8000, ctr: 0.0375, position: 10 },
            { keys: ['TABLET'], clicks: 50, impressions: 1000, ctr: 0.05, position: 7 }
          ]
        })
        // Country query
        .mockResolvedValueOnce({
          rows: [
            { keys: ['usa'], clicks: 600, impressions: 12000, ctr: 0.05, position: 9 },
            { keys: ['gbr'], clicks: 100, impressions: 2000, ctr: 0.05, position: 8 }
          ]
        })
        // Country+device query
        .mockResolvedValueOnce({
          rows: [
            { keys: ['usa', 'MOBILE'], clicks: 400, impressions: 8000, ctr: 0.05, position: 8 },
            { keys: ['usa', 'DESKTOP'], clicks: 200, impressions: 4000, ctr: 0.05, position: 10 }
          ]
        });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await analyzeRegionalDevicePerformanceTool.execute(mockParams, {
        site_url: 'https://example.com',
        days: 28,
        top_countries: 5
      });

      const text = result.content[0].text as string;
      expect(text).toContain('DEVICE BREAKDOWN');
      expect(text).toContain('MOBILE');
      expect(text).toContain('DESKTOP');
      expect(text).toContain('TOP COUNTRIES');
      expect(text).toContain('usa');
    });
  });

  describe('analyzeAlgorithmImpactTool', () => {
    it('should have correct name and description', () => {
      expect(analyzeAlgorithmImpactTool.name).toBe('analyze_algorithm_impact');
      expect(analyzeAlgorithmImpactTool.description).toContain('before and after');
      expect(analyzeAlgorithmImpactTool.description).toContain('algorithm');
    });

    it('should validate schema correctly', () => {
      const validInput = {
        site_url: 'https://example.com',
        event_date: '2025-11-15',
        days_before: 14,
        days_after: 14
      };

      const result = analyzeAlgorithmImpactTool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidInput = {
        site_url: 'https://example.com',
        event_date: '15-11-2025', // Wrong format
        days_before: 14,
        days_after: 14
      };

      const result = analyzeAlgorithmImpactTool.schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should compare before and after periods', async () => {
      const mockClient = createMockClient();
      // The tool makes 6 API calls: before queries, after queries, before pages, after pages, before totals, after totals
      mockClient.querySearchAnalytics
        // Before period - queries
        .mockResolvedValueOnce({
          rows: [
            { keys: ['improved keyword'], clicks: 50, impressions: 500, ctr: 0.1, position: 5 },
            { keys: ['declined keyword'], clicks: 100, impressions: 1000, ctr: 0.1, position: 3 }
          ]
        })
        // After period - queries
        .mockResolvedValueOnce({
          rows: [
            { keys: ['improved keyword'], clicks: 100, impressions: 800, ctr: 0.125, position: 3 },
            { keys: ['declined keyword'], clicks: 20, impressions: 300, ctr: 0.067, position: 8 }
          ]
        })
        // Before period - pages
        .mockResolvedValueOnce({
          rows: [
            { keys: ['/winner-page'], clicks: 50, impressions: 500 },
            { keys: ['/loser-page'], clicks: 100, impressions: 1000 }
          ]
        })
        // After period - pages
        .mockResolvedValueOnce({
          rows: [
            { keys: ['/winner-page'], clicks: 100, impressions: 800 },
            { keys: ['/loser-page'], clicks: 30, impressions: 300 }
          ]
        })
        // Before totals
        .mockResolvedValueOnce({
          rows: [{ clicks: 150, impressions: 1500, ctr: 0.1, position: 4 }]
        })
        // After totals
        .mockResolvedValueOnce({
          rows: [{ clicks: 130, impressions: 1100, ctr: 0.118, position: 5 }]
        });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await analyzeAlgorithmImpactTool.execute(mockParams, {
        site_url: 'https://example.com',
        event_date: '2025-11-15',
        days_before: 14,
        days_after: 14
      });

      const text = result.content[0].text as string;
      expect(text).toContain('Algorithm/Update Impact Analysis');
      expect(text).toContain('OVERALL IMPACT');
      expect(text).toContain('Before');
      expect(text).toContain('After');
    });

    it('should identify winners and losers', async () => {
      const mockClient = createMockClient();
      // The tool makes 6 API calls
      mockClient.querySearchAnalytics
        // Before queries
        .mockResolvedValueOnce({
          rows: [{ keys: ['big winner'], clicks: 10, impressions: 100, ctr: 0.1, position: 20 }]
        })
        // After queries
        .mockResolvedValueOnce({
          rows: [{ keys: ['big winner'], clicks: 100, impressions: 500, ctr: 0.2, position: 5 }]
        })
        // Before pages
        .mockResolvedValueOnce({ rows: [] })
        // After pages
        .mockResolvedValueOnce({ rows: [] })
        // Before totals
        .mockResolvedValueOnce({
          rows: [{ clicks: 10, impressions: 100, ctr: 0.1, position: 20 }]
        })
        // After totals
        .mockResolvedValueOnce({
          rows: [{ clicks: 100, impressions: 500, ctr: 0.2, position: 5 }]
        });
      vi.mocked(getAuthenticatedClient).mockResolvedValue(mockClient as any);

      const result = await analyzeAlgorithmImpactTool.execute(mockParams, {
        site_url: 'https://example.com',
        event_date: '2025-11-15',
        days_before: 14,
        days_after: 14
      });

      const text = result.content[0].text as string;
      expect(text).toContain('WINNERS');
    });
  });
});

// Helper function tests are in gscHelper.test.ts
