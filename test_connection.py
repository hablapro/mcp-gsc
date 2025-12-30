#!/usr/bin/env python3
"""
Test script to verify Google Search Console connection
"""

import os
import sys
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the functions from gsc_server
try:
    from gsc_server import get_gsc_service
    print("✓ Successfully imported GSC server module")
except ImportError as e:
    print(f"✗ Failed to import GSC server module: {e}")
    sys.exit(1)

def test_connection():
    """Test the connection to Google Search Console API"""
    print("\n" + "="*60)
    print("Google Search Console Connection Test")
    print("="*60 + "\n")
    
    # Check environment variables
    print("1. Checking environment variables...")
    gsc_creds = os.environ.get("GSC_CREDENTIALS_PATH")
    oauth_creds = os.environ.get("GSC_OAUTH_CLIENT_SECRETS_FILE")
    skip_oauth = os.environ.get("GSC_SKIP_OAUTH", "").lower() in ("true", "1", "yes")
    
    print(f"   GSC_CREDENTIALS_PATH: {'Set' if gsc_creds else 'Not set'}")
    print(f"   GSC_OAUTH_CLIENT_SECRETS_FILE: {'Set' if oauth_creds else 'Not set'}")
    print(f"   GSC_SKIP_OAUTH: {skip_oauth}")
    
    # Check for credential files
    print("\n2. Checking credential files...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check service account file
    service_account_file = os.path.join(script_dir, "service_account_credentials.json")
    client_secrets_file = os.path.join(script_dir, "client_secrets.json")
    token_file = os.path.join(script_dir, "token.json")
    
    print(f"   service_account_credentials.json: {'Found' if os.path.exists(service_account_file) else 'Not found'}")
    print(f"   client_secrets.json: {'Found' if os.path.exists(client_secrets_file) else 'Not found'}")
    print(f"   token.json (OAuth token): {'Found' if os.path.exists(token_file) else 'Not found'}")
    
    # Try to establish connection
    print("\n3. Attempting to connect to Google Search Console API...")
    try:
        service = get_gsc_service()
        print("   ✓ Successfully connected to GSC API!")
        
        # Try to list properties
        print("\n4. Testing API access by listing properties...")
        try:
            site_list = service.sites().list().execute()
            sites = site_list.get("siteEntry", [])
            
            if not sites:
                print("   No Search Console properties found.")
                print("   This could mean:")
                print("   - The service account doesn't have access to any properties")
                print("   - You need to add the service account email to your GSC properties")
            else:
                print(f"   ✓ Found {len(sites)} Search Console properties:")
                print("\n   Properties:")
                for i, site in enumerate(sites, 1):
                    site_url = site.get("siteUrl", "Unknown")
                    permission = site.get("permissionLevel", "Unknown permission")
                    print(f"   {i}. {site_url} ({permission})")
                
                # Test with the first property if available
                if sites:
                    print("\n5. Testing search analytics on first property...")
                    first_site = sites[0]["siteUrl"]
                    try:
                        # Simple query for the last 7 days
                        from datetime import timedelta
                        end_date = datetime.now().date()
                        start_date = end_date - timedelta(days=7)
                        
                        request = {
                            "startDate": start_date.strftime("%Y-%m-%d"),
                            "endDate": end_date.strftime("%Y-%m-%d"),
                            "dimensions": [],
                            "rowLimit": 1
                        }
                        
                        response = service.searchanalytics().query(
                            siteUrl=first_site, 
                            body=request
                        ).execute()
                        
                        if response.get("rows"):
                            row = response["rows"][0]
                            print(f"   ✓ Successfully retrieved data for {first_site}")
                            print(f"     Total clicks (last 7 days): {row.get('clicks', 0)}")
                            print(f"     Total impressions: {row.get('impressions', 0)}")
                        else:
                            print(f"   No data available for {first_site} in the last 7 days")
                            
                    except Exception as e:
                        print(f"   ✗ Error testing search analytics: {e}")
                        
        except Exception as e:
            print(f"   ✗ Error listing properties: {e}")
            print(f"   Error type: {type(e).__name__}")
            
    except Exception as e:
        print(f"   ✗ Failed to connect: {e}")
        print(f"   Error type: {type(e).__name__}")
        
        # Provide helpful debugging info
        if "service_account_credentials.json" in str(e):
            print("\n   Tip: Make sure your service account credentials file is in the correct location")
            print(f"   Expected locations: {service_account_file}")
        elif "client_secrets.json" in str(e):
            print("\n   Tip: OAuth client secrets file not found")
            print(f"   Expected location: {client_secrets_file}")
        elif "401" in str(e) or "403" in str(e):
            print("\n   Tip: Authentication failed. Check your credentials and permissions")
    
    print("\n" + "="*60)
    print("Test completed")
    print("="*60)

if __name__ == "__main__":
    test_connection()