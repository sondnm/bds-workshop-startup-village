#!/usr/bin/env python3
"""
Test script to verify all imports work correctly
"""

def test_imports():
    """Test all imports from utils module"""
    print("🧪 Testing imports from utils module...")
    
    try:
        # Test basic imports
        from utils import BirdeyeDataServices
        print("✅ BirdeyeDataServices imported successfully")
        
        from utils import format_currency
        print("✅ format_currency imported successfully")
        
        from utils import create_price_chart
        print("✅ create_price_chart imported successfully")
        
        from utils import create_portfolio_chart
        print("✅ create_portfolio_chart imported successfully")
        
        from utils import create_portfolio_pie_chart
        print("✅ create_portfolio_pie_chart imported successfully")
        
        from utils import create_candlestick_chart
        print("✅ create_candlestick_chart imported successfully")
        
        from utils import format_transaction_data
        print("✅ format_transaction_data imported successfully")
        
        from utils import check_api_key
        print("✅ check_api_key imported successfully")
        
        print("\n🎉 All imports successful!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_api_initialization():
    """Test API initialization"""
    print("\n🔑 Testing API initialization...")
    
    try:
        from utils import BirdeyeDataServices, check_api_key
        
        # Test standard API
        if check_api_key('standard'):
            birdeye_standard = BirdeyeDataServices(api_key_type='standard')
            print("✅ Standard API initialized successfully")
        else:
            print("⚠️ Standard API key not found or invalid")
            
        # Test business API
        if check_api_key('business'):
            birdeye_business = BirdeyeDataServices(api_key_type='business')
            print("✅ Business API initialized successfully")
        else:
            print("⚠️ Business API key not found or invalid")
            
        return True
        
    except Exception as e:
        print(f"❌ API initialization error: {e}")
        return False

def test_utility_functions():
    """Test utility functions"""
    print("\n🛠️ Testing utility functions...")
    
    try:
        from utils import format_currency
        
        # Test format_currency
        test_amount = 1234567.89
        formatted = format_currency(test_amount)
        print(f"✅ format_currency test: {test_amount} -> {formatted}")
        
        return True
        
    except Exception as e:
        print(f"❌ Utility function error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting comprehensive import and functionality tests...\n")
    
    success = True
    success &= test_imports()
    success &= test_api_initialization()
    success &= test_utility_functions()
    
    print("\n" + "="*50)
    if success:
        print("🎉 ALL TESTS PASSED! Workshop is ready to go!")
    else:
        print("❌ Some tests failed. Please check the errors above.")
    print("="*50)
