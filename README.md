# Birdeye Data Services API Workshop - Building Powerful Blockchain Data Applications

Welcome to the Birdeye Data Services API Workshop! This hands-on session will teach you how to build powerful blockchain data applications using Birdeye Data Services' comprehensive APIs and WebSocket services.

## 🚀 What You'll Learn

### Section 1: Token Information Querying
- Fetch newly listed tokens
- Get real-time token prices
- Access token metadata and trading data
- Create interactive price charts
- Display recent transactions

### Section 2: Wallet Portfolio Management
- Calculate current net worth
- Build portfolio charts
- Analyze token holdings
- Real-time updates via WebSocket
- Interactive token exploration

### Section 3: Real-time OHLCV Updates & Professional Charts
- Generate standalone HTML charts with TradingView integration
- Real-time WebSocket OHLCV data updates
- Professional candlestick and volume visualization
- Multiple timeframes (1m, 5m, 15m, 1H, 4H, 1D)
- Direct connection to Birdeye API (no server required)

## 📋 Prerequisites

- Basic Python knowledge
- Jupyter Notebook environment
- Node.js (for Section 3 chart generation)
- Internet connection for API calls

## 🛠 Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Create Birdeye Data Services Account

1. Visit [Birdeye Data Services Documentation](https://docs.birdeye.so/docs/bds-getting-started)
2. Sign up for a free account
3. Generate your API key from the dashboard

### 3. Configure API Key

Create a `.env` file in the project root:

```
BDS_STANDARD_API_KEY=your_standard_api_key_here
BDS_API_KEY=your_business_api_key_here
```

**Important**: Never commit your API key to version control!

## 📚 Workshop Structure

1. **00_Introduction.ipynb** - Workshop overview and setup
2. **01_Token_Information.ipynb** - Token querying and analysis
3. **02_Wallet_Portfolio.ipynb** - Portfolio management and WebSocket
4. **03_Realtime_Updates.ipynb** - Real-time OHLCV updates and professional charts
5. **utils.py** - Shared utility functions

### Chart Generator Files
- **generate-chart-html.js** - HTML chart generator script
- **package.json** - Node.js dependencies
- **CHART_README.md** - Chart setup and usage guide

## 🔗 Useful Links

- [Birdeye Data Services API Documentation](https://docs.birdeye.so/reference)
- [WebSocket Guide](https://docs.birdeye.so/docs/websocket)

## 🎯 Learning Objectives

By the end of this workshop, you'll be able to:
- Integrate Birdeye Data Services APIs into your applications
- Build real-time data visualizations
- Implement WebSocket connections for live updates
- Create professional-grade blockchain data dashboards
- Generate standalone HTML charts with TradingView integration
- Build real-time OHLCV candlestick charts
- Connect directly to Birdeye WebSocket for live market data

## 🤝 Support

If you encounter any issues during the workshop:
1. Check the troubleshooting section in each notebook
2. Refer to the Birdeye Data Services documentation
3. Ask questions during the session

Let's build something amazing! 🚀
