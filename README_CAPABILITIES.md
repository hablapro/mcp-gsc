# Google Search Console MCP Server - Capabilities Overview

A Model Context Protocol (MCP) server that connects Google Search Console with Claude AI, enabling SEO analysis through natural language conversations.

## Core Capabilities

### Property Management
- **List Properties** - View all GSC properties in your account
- **Add Site** - Add new sites to your GSC properties  
- **Remove Site** - Remove sites from your GSC properties
- **Site Details** - Get detailed site information including verification status

### Search Analytics & Performance
- **Search Analytics** - Top search queries and pages with metrics (impressions, clicks, CTR, position)
- **Performance Overview** - Performance summaries and trends
- **Advanced Analytics** - Search analytics with advanced filtering options
- **Period Comparison** - Compare performance between different time periods
- **Page-Query Analysis** - Analyze search terms driving traffic to specific pages

### URL Inspection & Indexing
- **URL Inspection** - Detailed URL inspection for indexing status
- **Batch Inspection** - Inspect multiple URLs simultaneously
- **Indexing Issues** - Check for indexing problems across pages
- **Pattern Analysis** - Identify crawling and indexing patterns

### Sitemap Management
- **List Sitemaps** - View all sitemaps with status information
- **Submit Sitemap** - Submit new sitemaps to Google
- **Delete Sitemap** - Remove existing sitemaps
- **Sitemap Details** - Get detailed sitemap information and error reports
- **Comprehensive Management** - Full sitemap management operations

## Advanced Features

- **Dual Authentication**: OAuth (personal account) + Service Account support
- **Data Visualization**: Claude creates charts, graphs, and visual analysis
- **Batch Processing**: Handle multiple URLs or queries simultaneously
- **Trend Analysis**: Compare performance across time periods
- **Device Analysis**: Mobile vs desktop performance comparison
- **Position Analysis**: Ranking performance and opportunity identification

## Total Available Tools: 19

## Authentication Methods

### OAuth Authentication (Recommended)
Uses your personal Google account with the same access as your normal GSC usage.

### Service Account Authentication  
Uses service account credentials for automated scripts and workflows.

## Data Visualization Capabilities

Claude can generate various visualizations:
- Trend charts for performance over time
- Comparison graphs between periods/dimensions  
- Performance distribution analysis
- Correlation analysis between metrics
- Heatmaps for complex datasets

## Technical Details

- **Language**: Python 3.11+
- **Framework**: FastMCP (Model Context Protocol)
- **Google APIs**: Search Console API v1
- **Scopes**: `https://www.googleapis.com/auth/webmasters`
- **Authentication**: OAuth 2.0 + Service Account support

## Use Cases

- **SEO Analysis**: Analyze search performance and identify opportunities
- **Technical SEO**: Check indexing status and crawling issues
- **Content Strategy**: Understand which queries drive traffic
- **Performance Monitoring**: Track trends and compare time periods
- **Sitemap Management**: Monitor and maintain XML sitemaps
- **Competitive Analysis**: Compare performance across different periods

## Integration Benefits

- **Natural Language Interface**: Ask Claude questions about your SEO data
- **Automated Analysis**: Claude provides insights and recommendations
- **Visual Reports**: Generate charts and graphs for better understanding
- **Batch Operations**: Process multiple URLs or queries at once
- **Historical Analysis**: Compare performance across different time periods

This MCP server transforms Google Search Console from a manual interface into an AI-powered SEO analysis tool accessible through conversational AI.