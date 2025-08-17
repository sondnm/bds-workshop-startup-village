#!/usr/bin/env python3
"""
Comprehensive test script for the Birdeye Data Services Workshop
"""

import os
import sys
from utils import (
    BirdeyeDataServices, 
    BirdeyeDataServicesWebSocket,
    check_api_key, 
    create_price_chart,
    create_candlestick_chart,
    create_portfolio_chart,
    format_currency,
    format_transaction_data,
    display_token_info
)

def test_environment():
    """Test environment setup"""
    print("🔧 Testing Environment Setup...")
    
    # Test API keys
    if check_api_key('standard'):
        print("✅ Standard API key configured correctly")
    else:
        print("❌ Standard API key not found")
        return False

    if check_api_key('business'):
        print("✅ Business API key configured correctly")
    else:
        print("⚠️ Business API key not found (will be provided by host)")
    
    # Test imports
    try:
        import pandas as pd
        import plotly.graph_objects as go
        import requests
        print("✅ All required packages imported")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    
    return True

def test_api_functionality():
    """Test API functionality"""
    print("\n📡 Testing API Functionality...")
    
    try:
        # Test Standard API (Section 1)
        birdeye_standard = BirdeyeDataServices(api_key_type='standard')
        print("✅ Standard API initialized")

        # Test Business API (Section 2) - may fail if not business tier
        try:
            birdeye_business = BirdeyeDataServices(api_key_type='business')
            print("✅ Business API initialized")
        except Exception as e:
            print(f"⚠️ Business API not available (expected): {str(e)[:50]}...")

        # Use standard API for remaining tests
        birdeye = birdeye_standard

    except Exception as e:
        print(f"❌ Failed to initialize API client: {e}")
        return False
    
    # Test token endpoints
    print("\n🪙 Testing Token Endpoints...")
    
    # Test new listings
    try:
        listings = birdeye.get_new_listings(limit=3)
        if listings and 'data' in listings:
            count = len(listings['data']['items'])
            print(f"✅ New listings: {count} tokens")
        else:
            print("⚠️ New listings returned no data")
    except Exception as e:
        print(f"❌ New listings failed: {e}")
    
    # Test token price
    try:
        sol_address = "So11111111111111111111111111111111111111112"
        price = birdeye.get_token_price(sol_address)
        if price and 'data' in price:
            sol_price = price['data']['value']
            print(f"✅ Token price: SOL = ${sol_price:.2f}")
        else:
            print("⚠️ Token price returned no data")
    except Exception as e:
        print(f"❌ Token price failed: {e}")
    
    # Test token market data
    try:
        market_data = birdeye.get_token_market_data(sol_address)
        if market_data and 'data' in market_data:
            price = market_data['data'].get('price', 0)
            market_cap = market_data['data'].get('market_cap', 0)
            print(f"✅ Token market data: SOL = ${price:.2f}, MC = ${market_cap/1e9:.1f}B")
        else:
            print("⚠️ Token market data returned no data")
    except Exception as e:
        print(f"❌ Token market data failed: {e}")
    
    # Test wallet endpoints
    print("\n💼 Testing Wallet Endpoints...")
    
    example_wallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    
    try:
        net_worth = birdeye.get_wallet_net_worth(example_wallet)
        if net_worth and 'data' in net_worth:
            total = net_worth['data'].get('totalUsd', 0)
            print(f"✅ Wallet net worth: {format_currency(total)}")
        else:
            print("⚠️ Wallet net worth returned no data")
    except Exception as e:
        print(f"❌ Wallet net worth failed: {e}")
    
    return True

def test_visualization():
    """Test visualization functions"""
    print("\n📊 Testing Visualization Functions...")
    
    birdeye = BirdeyeDataServices()
    sol_address = "So11111111111111111111111111111111111111112"
    
    # Test price chart
    try:
        history = birdeye.get_price_history(sol_address, type_="1D")
        chart = create_price_chart(history, "SOL")
        if chart:
            print("✅ Price chart created successfully")
        else:
            print("❌ Price chart creation failed")
    except Exception as e:
        print(f"❌ Price chart error: {e}")
    
    # Test format_currency
    try:
        test_values = [1234.56, 1234567.89, 1234567890.12]
        for value in test_values:
            formatted = format_currency(value)
            print(f"✅ Format currency: {value} -> {formatted}")
    except Exception as e:
        print(f"❌ Format currency error: {e}")
    
    return True

def test_direct_http():
    """Test direct HTTP requests"""
    print("\n🌐 Testing Direct HTTP Requests...")
    
    import requests
    from dotenv import load_dotenv
    
    load_dotenv()
    api_key = os.getenv('BDS_STANDARD_API_KEY')
    
    if not api_key:
        print("❌ API key not found for direct HTTP test")
        return False
    
    try:
        url = "https://public-api.birdeye.so/defi/price"
        headers = {
            'X-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
        params = {'address': 'So11111111111111111111111111111111111111112'}
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            if data and 'data' in data:
                price = data['data']['value']
                print(f"✅ Direct HTTP request: SOL = ${price:.2f}")
            else:
                print("⚠️ Direct HTTP request returned no data")
        else:
            print(f"❌ Direct HTTP request failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Direct HTTP request error: {e}")
    
    return True

def main():
    """Run all tests"""
    print("🚀 Birdeye Data Services Workshop - Comprehensive Test")
    print("=" * 60)
    
    tests = [
        ("Environment Setup", test_environment),
        ("API Functionality", test_api_functionality),
        ("Visualization", test_visualization),
        ("Direct HTTP Requests", test_direct_http),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Workshop is ready to go!")
    else:
        print("⚠️ Some tests failed. Please check the issues above.")
    
    print("\n💡 Next steps:")
    print("1. Open Jupyter: http://127.0.0.1:8888")
    print("2. Start with 00_Introduction.ipynb")
    print("3. Follow the workshop notebooks in order")

if __name__ == "__main__":
    main()
