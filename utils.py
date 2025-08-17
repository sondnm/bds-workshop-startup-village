"""
Utility functions for Birdeye Data Services API Workshop
"""

import os
import requests
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import json
import websocket
import threading
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class BirdeyeDataServices:
    """Custom wrapper for Birdeye Data Services API requests"""

    def __init__(self, api_key_type='standard'):
        if api_key_type == 'standard':
            self.api_key = os.getenv('BDS_STANDARD_API_KEY')
            if not self.api_key:
                raise ValueError("BDS_STANDARD_API_KEY not found in environment variables")
        elif api_key_type == 'business':
            self.api_key = os.getenv('BDS_API_KEY')
            if not self.api_key:
                raise ValueError("BDS_API_KEY not found in environment variables")
        else:
            raise ValueError("api_key_type must be 'standard' or 'business'")

        self.base_url = "https://public-api.birdeye.so"
        self.headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }

    def _make_request(self, endpoint, params=None):
        """Make HTTP request to Birdeye Data Services API"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"API request failed: {e}")
            return None
    
    # Token-related methods
    def get_new_listings(self, limit=50):
        """Get newly listed tokens"""
        return self._make_request("/defi/v2/tokens/new_listing", {"limit": limit})
    
    def get_token_price(self, address):
        """Get current token price"""
        return self._make_request("/defi/price", {"address": address})
    
    def get_token_overview(self, address):
        """Get token metadata and trading data (deprecated - use get_token_market_data for standard API)"""
        return self._make_request("/defi/token_overview", {"address": address})

    def get_token_market_data(self, address):
        """Get token market data (available for standard API key)"""
        return self._make_request("/defi/v3/token/market-data", {"address": address})

    def get_token_list(self, limit=20, min_liquidity=100000, max_liquidity=10000000, sort_by="v24hUSD", sort_type="desc"):
        """Get token list with filtering and sorting"""
        params = {
            "limit": limit,
            "min_liquidity": min_liquidity,
            "max_liquidity": max_liquidity,
            "sort_by": sort_by,
            "sort_type": sort_type
        }
        return self._make_request("/defi/tokenlist", params)
    
    def get_price_history(self, address, address_type="token", type_="1D", time_from=None, time_to=None):
        """Get historical price data"""
        params = {
            "address": address,
            "address_type": address_type,
            "type": type_,
            "time_from": time_from or int((datetime.now() - timedelta(days=30)).timestamp()),
            "time_to": time_to or int(datetime.now().timestamp()),
        }
        return self._make_request("/defi/history_price", params)
    
    def get_token_transactions(self, address, limit=20):
        """Get recent token transactions"""
        params = {"address": address, "limit": limit}
        return self._make_request("/defi/v3/token/txs", params)
    
    # Wallet-related methods
    def get_wallet_net_worth(self, wallet_address):
        """Get current wallet net worth"""
        return self._make_request("/wallet/v2/current-net-worth", {"wallet": wallet_address})
    
    def get_wallet_net_worth_history(self, wallet_address):
        """Get wallet net worth history"""
        return self._make_request("/wallet/v2/net-worth", {"wallet": wallet_address})
    
    def get_wallet_net_worth_details(self, wallet_address):
        """Get detailed breakdown of wallet holdings"""
        return self._make_request("/wallet/v2/net-worth-details", {"wallet": wallet_address})
    
    def get_ohlcv_data(self, address, type_="1D", time_from=None, time_to=None):
        """Get OHLCV candlestick data"""
        params = {
                "address": address,
                "type": type_,
                "time_from": time_from or int((datetime.now() - timedelta(days=30)).timestamp()),
                "time_to": time_to or int(datetime.now().timestamp()),
                }
        return self._make_request("/defi/v3/ohlcv", params)


class BirdeyeDataServicesWebSocket:
    """WebSocket client for real-time Birdeye Data Services data"""

    def __init__(self, api_key_type='business'):
        if api_key_type == 'standard':
            self.api_key = os.getenv('BDS_STANDARD_API_KEY')
        elif api_key_type == 'business':
            self.api_key = os.getenv('BDS_API_KEY')
        else:
            raise ValueError("api_key_type must be 'standard' or 'business'")

        if not self.api_key:
            raise ValueError(f"API key not found for {api_key_type} tier")

        self.ws_url = "wss://public-api.birdeye.so/socket/solana?x-api-key={self.api_key}"
        self.ws = None
        self.callbacks = {}
        
    def connect(self):
        """Connect to WebSocket"""
        def on_message(ws, message):
            data = json.loads(message)
            msg_type = data.get('type')
            if msg_type in self.callbacks:
                self.callbacks[msg_type](data)
        
        def on_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_close(ws, close_status_code, close_msg):
            print("WebSocket connection closed")
        
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            subprotocols=["echo-protocol"],
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # Start WebSocket in a separate thread
        self.ws_thread = threading.Thread(target=self.ws.run_forever)
        self.ws_thread.daemon = True
        self.ws_thread.start()
        time.sleep(1)  # Wait for connection
    
    def subscribe_price(self, address, callback):
        """Subscribe to price updates"""
        self.callbacks['PRICE_DATA'] = callback
        message = {
            "type": "SUBSCRIBE_PRICE",
            "data": {
                "address": address,
                "apikey": self.api_key
            }
        }
        if self.ws:
            self.ws.send(json.dumps(message))
    
    def subscribe_transactions(self, address, callback):
        """Subscribe to transaction updates"""
        self.callbacks['TXS_DATA'] = callback
        message = {
            "type": "SUBSCRIBE_TXS",
            "data": {
                "address": address,
                "apikey": self.api_key
            }
        }
        if self.ws:
            self.ws.send(json.dumps(message))
    
    def close(self):
        """Close WebSocket connection"""
        if self.ws:
            self.ws.close()


def create_price_chart(price_data, token_address):
    """Create interactive price chart using Plotly"""
    if not price_data or 'data' not in price_data:
        print(f"❌ No price data available for {token_address}")
        return None

    items = price_data['data'].get('items', [])
    if not items:
        print(f"⚠️No price  history data points available for {token_address}")
        print("This might be due to API limitations or the token being too new.")
        print("📊 No chart will be displayed - only real data is shown.")
        return None

    # Create chart with real data
    df = pd.DataFrame(items)
    df['datetime'] = pd.to_datetime(df['unixTime'], unit='s')

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df['datetime'],
        y=df['value'],
        mode='lines',
        name=f'{token_address} Price',
        line=dict(color='#00D4AA', width=2)
    ))

    fig.update_layout(
        title=f'{token_address} Price History',
        xaxis_title='Time',
        yaxis_title='Price (USD)',
        template='plotly_dark',
        height=400
    )

    return fig


def create_candlestick_chart(ohlcv_data, token_symbol="Token"):
    """Create candlestick chart for OHLCV data"""
    if not ohlcv_data or 'data' not in ohlcv_data:
        print("No OHLCV data available")
        return None

    items = ohlcv_data['data'].get('items', [])
    if not items:
        print("No OHLCV items available")
        return None

    df = pd.DataFrame(items)

    # Check for required OHLCV fields - use unix_time instead of unixTime
    required_fields = ['o', 'h', 'l', 'c', 'unix_time']
    missing_fields = [field for field in required_fields if field not in df.columns]

    if missing_fields:
        print(f"Missing OHLCV fields: {missing_fields}")
        print(f"Available fields: {list(df.columns)}")
        return None

    df['datetime'] = pd.to_datetime(df['unix_time'], unit='s')

    fig = go.Figure(data=go.Candlestick(
        x=df['datetime'],
        open=df['o'],
        high=df['h'],
        low=df['l'],
        close=df['c'],
        name=token_symbol
    ))

    fig.update_layout(
        title=f'{token_symbol} OHLCV Chart',
        xaxis_title='Time',
        yaxis_title='Price (USD)',
        template='plotly_dark',
        height=500
    )

    return fig


def create_portfolio_chart(net_worth_data):
    """Create portfolio net worth chart"""
    if not net_worth_data or 'data' not in net_worth_data:
        print("No portfolio data available")
        return None

    data = net_worth_data['data']

    # Handle different response formats
    if isinstance(data, dict) and 'history' in data:
        # Net worth history response format
        history = data['history']
        if not history:
            print("No history data available")
            return None
        df = pd.DataFrame(history)

        # Use correct field names for history
        timestamp_field = 'timestamp' if 'timestamp' in df.columns else 'unix_time'
        value_field = 'net_worth' if 'net_worth' in df.columns else 'value'

    elif isinstance(data, list):
        # Direct list format
        df = pd.DataFrame(data)
        timestamp_field = 'timestamp' if 'timestamp' in df.columns else 'timestamp'
        value_field = 'net_worth' if 'net_worth' in df.columns else 'value'
    else:
        print("Unexpected data format for portfolio chart")
        return None

    if df.empty:
        print("Empty portfolio data")
        return None

    # Check if required fields exist
    if timestamp_field not in df.columns or value_field not in df.columns:
        print(f"Missing required fields. Available: {list(df.columns)}")
        return None

    df['datetime'] = pd.to_datetime(df[timestamp_field], utc=True)

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df['datetime'],
        y=df[value_field],
        mode='lines+markers',
        name='Net Worth',
        line=dict(color='#FFD700', width=3),
        marker=dict(size=6)
    ))

    fig.update_layout(
        title='Portfolio Net Worth Over Time',
        xaxis_title='Date',
        yaxis_title='Net Worth (USD)',
        template='plotly_dark',
        height=400
    )

    return fig


def create_portfolio_pie_chart(net_worth_data, title="Portfolio Allocation"):
    """Create portfolio allocation pie chart"""
    if not net_worth_data or 'data' not in net_worth_data:
        print("No portfolio data available for pie chart")
        return None

    data = net_worth_data['data']

    # Get items from the response
    if 'items' not in data or not data['items']:
        print("No portfolio items available for pie chart")
        return None

    items = data['items']

    # Prepare data for pie chart
    symbols = []
    values = []
    colors = []

    # Color palette for the pie chart
    color_palette = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]

    for i, item in enumerate(items[:10]):  # Show top 10 holdings
        symbol = item.get('symbol', 'Unknown')
        value = float(item.get('value', 0))

        if value > 0:  # Only include tokens with value
            symbols.append(symbol)
            values.append(value)
            colors.append(color_palette[i % len(color_palette)])

    if not values:
        print("No tokens with value found for pie chart")
        return None

    # Create pie chart
    fig = go.Figure(data=go.Pie(
        labels=symbols,
        values=values,
        hole=0.3,  # Donut chart
        marker=dict(colors=colors),
        textinfo='label+percent',
        textposition='outside'
    ))

    fig.update_layout(
        title=title,
        template='plotly_dark',
        height=500,
        showlegend=True,
        legend=dict(
            orientation="v",
            yanchor="middle",
            y=0.5,
            xanchor="left",
            x=1.01
        )
    )

    return fig


def format_transaction_data(tx_data):
    """Format transaction data for display"""
    if not tx_data or 'data' not in tx_data:
        return pd.DataFrame()

    transactions = []
    for tx in tx_data['data']['items']:
        transactions.append({
            'Time': datetime.fromtimestamp(tx.get('block_unix_time', 0)).strftime('%Y-%m-%d %H:%M:%S') if tx.get('block_unix_time') else 'N/A',
            'Type': tx.get('tx_type', 'Unknown'),
            'Volume': f"{tx.get('volume', 0):.6f}" if tx.get('volume') else 'N/A',
            'USD Value': f"${tx.get('volume_usd', 0):.2f}" if tx.get('volume_usd') else 'N/A',
            'Side': tx.get('side', 'N/A'),
            'Source': tx.get('source', 'N/A'),
            'From': tx.get('from', {}).get('symbol', 'N/A') if isinstance(tx.get('from'), dict) else 'N/A',
            'To': tx.get('to', {}).get('symbol', 'N/A') if isinstance(tx.get('to'), dict) else 'N/A',
            'Hash': (tx.get('tx_hash', '') or '')[:10] + '...' if tx.get('tx_hash') else 'N/A'
        })

    return pd.DataFrame(transactions)


def format_currency(value):
    value = float(value)
    """Format currency values for display"""
    if value >= 1e9:
        return f"${value/1e9:.2f}B"
    elif value >= 1e6:
        return f"${value/1e6:.2f}M"
    elif value >= 1e3:
        return f"${value/1e3:.2f}K"
    else:
        return f"${value:.2f}"


def display_token_info(token_data):
    """Display formatted token information"""
    if not token_data or 'data' not in token_data:
        print("No token data available")
        return
    
    data = token_data['data']
    print("=" * 50)
    print(f"Token: {data.get('name', 'Unknown')} ({data.get('symbol', 'N/A')})")
    print(f"Address: {data.get('address', 'N/A')}")
    print(f"Current Price: ${data.get('price', 0):.6f}")
    print(f"Market Cap: {format_currency(data.get('mc', 0))}")
    print(f"24h Volume: {format_currency(data.get('v24hUSD', 0))}")
    print(f"24h Change: {data.get('priceChange24hPercent', 0):.2f}%")
    print("=" * 50)


def check_api_key(api_key_type='standard'):
    """Check if API key is properly configured"""
    if api_key_type == 'standard':
        api_key = os.getenv('BDS_STANDARD_API_KEY')
        key_name = 'BDS_STANDARD_API_KEY'
    elif api_key_type == 'business':
        api_key = os.getenv('BDS_API_KEY')
        key_name = 'BDS_API_KEY'
    else:
        print("❌ Invalid API key type!")
        return False

    if not api_key:
        print(f"❌ {key_name} not found!")
        print(f"Please add {key_name} to your .env file")
        return False
    else:
        print(f"✅ {key_name} found!")
        return True

# Create an alias for backward compatibility
BirdeyeAPI = BirdeyeDataServices
