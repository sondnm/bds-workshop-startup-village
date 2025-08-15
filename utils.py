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

    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('BIRDEYE_API_KEY')
        self.base_url = "https://public-api.birdeye.so"
        self.headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }

        if not self.api_key:
            raise ValueError("API key not found. Please set BIRDEYE_API_KEY in .env file")

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
        """Get token metadata and trading data"""
        return self._make_request("/defi/token_overview", {"address": address})
    
    def get_price_history(self, address, address_type="token", type_="1D"):
        """Get historical price data"""
        params = {
            "address": address,
            "address_type": address_type,
            "type": type_
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
    
    def get_ohlcv_data(self, address, type_="1D"):
        """Get OHLCV candlestick data"""
        params = {"address": address, "type": type_}
        return self._make_request("/defi/v3/ohlcv", params)


class BirdeyeDataServicesWebSocket:
    """WebSocket client for real-time Birdeye Data Services data"""

    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('BIRDEYE_API_KEY')
        self.ws_url = "wss://public-api.birdeye.so/socket"
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


def create_price_chart(price_data, token_symbol="Token"):
    """Create interactive price chart using Plotly"""
    if not price_data or 'data' not in price_data:
        print(f"❌ No price data available for {token_symbol}")
        return None

    items = price_data['data'].get('items', [])
    if not items:
        print(f"⚠️ No price history data points available for {token_symbol}")
        print("This might be due to API limitations or the token being too new.")

        # Create a demo chart with sample data
        from datetime import datetime, timedelta

        print(f"📊 Creating demo chart for {token_symbol}...")

        # Generate sample data for demonstration
        dates = [datetime.now() - timedelta(hours=i) for i in range(24, 0, -1)]
        base_price = 100.0
        import random
        prices = [base_price + random.gauss(0, 5) for _ in dates]

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=dates,
            y=prices,
            mode='lines',
            name=f'{token_symbol} Price (Demo Data)',
            line=dict(color='#FF6B6B', width=2, dash='dash')
        ))

        fig.update_layout(
            title=f'{token_symbol} Price History (Demo Data)',
            xaxis_title='Time',
            yaxis_title='Price (USD)',
            template='plotly_dark',
            height=400,
            annotations=[
                dict(
                    x=0.5, y=0.95,
                    xref='paper', yref='paper',
                    text='⚠️ Demo data - Real data not available',
                    showarrow=False,
                    font=dict(color='orange', size=12)
                )
            ]
        )

        return fig

    # Create chart with real data
    df = pd.DataFrame(items)
    df['datetime'] = pd.to_datetime(df['unixTime'], unit='s')

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df['datetime'],
        y=df['value'],
        mode='lines',
        name=f'{token_symbol} Price',
        line=dict(color='#00D4AA', width=2)
    ))

    fig.update_layout(
        title=f'{token_symbol} Price History',
        xaxis_title='Time',
        yaxis_title='Price (USD)',
        template='plotly_dark',
        height=400
    )

    return fig


def create_candlestick_chart(ohlcv_data, token_symbol="Token"):
    """Create candlestick chart for OHLCV data"""
    if not ohlcv_data or 'data' not in ohlcv_data:
        return None
    
    df = pd.DataFrame(ohlcv_data['data']['items'])
    df['datetime'] = pd.to_datetime(df['unixTime'], unit='s')
    
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
        return None
    
    df = pd.DataFrame(net_worth_data['data'])
    df['datetime'] = pd.to_datetime(df['unixTime'], unit='s')
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df['datetime'],
        y=df['totalUsd'],
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


def format_transaction_data(tx_data):
    """Format transaction data for display"""
    if not tx_data or 'data' not in tx_data:
        return pd.DataFrame()
    
    transactions = []
    for tx in tx_data['data']['items']:
        transactions.append({
            'Time': datetime.fromtimestamp(tx.get('blockUnixTime', 0)).strftime('%Y-%m-%d %H:%M:%S'),
            'Type': tx.get('txType', 'Unknown'),
            'Amount': f"{tx.get('changeAmount', 0):.6f}",
            'USD Value': f"${tx.get('changeAmountUsd', 0):.2f}",
            'From': tx.get('from', '')[:10] + '...' if tx.get('from') else '',
            'To': tx.get('to', '')[:10] + '...' if tx.get('to') else '',
            'Signature': tx.get('txHash', '')[:10] + '...' if tx.get('txHash') else ''
        })
    
    return pd.DataFrame(transactions)


def format_currency(value):
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


def check_api_key():
    """Check if API key is properly configured"""
    api_key = os.getenv('BIRDEYE_API_KEY')
    if not api_key:
        print("❌ API key not found!")
        print("Please create a .env file with your BIRDEYE_API_KEY")
        return False
    else:
        print("✅ API key found!")
        return True

# Create an alias for backward compatibility
BirdeyeAPI = BirdeyeDataServices
