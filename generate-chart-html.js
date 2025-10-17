const fs = require('fs');
const path = require('path');
require('dotenv').config();

// API configuration
const BDS_API_KEY = process.env.BDS_API_KEY || process.env.BDS_STANDARD_API_KEY;
const BDS_BASE_URL = 'https://public-api.birdeye.so';
const BDS_WS_URL = 'wss://public-api.birdeye.so/socket/base';

// WETH token address
const SOL_ADDRESS = '0x4200000000000000000000000000000000000006';

console.log('🚀 BDS Chart HTML Generator');
console.log('📊 Generating standalone HTML chart...');

if (!BDS_API_KEY) {
    console.error('❌ Error: BDS_API_KEY not found in environment variables');
    console.log('Please add BDS_API_KEY=your_api_key_here to your .env file');
    process.exit(1);
}

// Generate standalone HTML chart
function generateChartHTML() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BDS Real-time Candlestick Chart</title>
    <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #1e1e1e;
            color: white;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .chart-container {
            width: 100%;
            height: 600px;
            background-color: #2a2a2a;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            align-items: center;
            flex-wrap: wrap;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .status.connected { background-color: #4caf50; }
        .status.disconnected { background-color: #f44336; }
        .status.connecting { background-color: #ff9800; }
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 2px;
        }
        .btn-primary { background-color: #2196f3; color: white; }
        .btn-success { background-color: #4caf50; color: white; }
        .btn-danger { background-color: #f44336; color: white; }
        .btn-warning { background-color: #ff9800; color: white; }
        input, select {
            padding: 8px;
            border: 1px solid #555;
            border-radius: 4px;
            background-color: #333;
            color: white;
            margin: 2px;
        }
        .info-panel {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-card {
            background-color: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .info-card h3 {
            margin: 0 0 10px 0;
            color: #2196f3;
        }
        .info-card .value {
            font-size: 18px;
            font-weight: bold;
        }
        .token-info {
            background-color: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .token-header {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .token-details h2 {
            margin: 0;
            color: #2196f3;
        }
        .token-address {
            font-family: monospace;
            font-size: 12px;
            color: #888;
        }
        .highlight-target {
            transition: all 0.3s ease;
        }
        .highlight {
            background-color: #4caf50 !important;
            color: white !important;
            transform: scale(1.05);
            border-radius: 4px;
            padding: 0;
        }
        .transactions-panel {
            background-color: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            max-height: 300px;
            overflow-y: auto;
        }
        .transaction-item {
            padding: 8px;
            border-bottom: 1px solid #404040;
            font-size: 12px;
            font-family: monospace;
        }
        .transaction-item:last-child {
            border-bottom: none;
        }
        .transaction-buy {
            border-left: 3px solid #4caf50;
        }
        .transaction-sell {
            border-left: 3px solid #f44336;
        }
        #log {
            background-color: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
            height: 200px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Birdeye Data Services - Real-time Candlestick Chart</h1>
        </div>
        
        <div class="controls">
            <input type="text" id="tokenAddressInput" placeholder="Token Address" value="${SOL_ADDRESS}">
            <select id="timeframe">
                <option value="1m">1 minute</option>
                <option value="5m">5 minutes</option>
                <option value="15m">15 minutes</option>
                <option value="1H">1 hour</option>
                <option value="4H">4 hours</option>
                <option value="1D" selected>1 day</option>
            </select>
            <button id="loadChart" class="btn-primary">Load Chart</button>
            <button id="connectWs" class="btn-success">Connect WebSocket</button>
            <button id="disconnectWs" class="btn-danger">Disconnect</button>
            <button id="refreshPage" class="btn-warning">🔄 Refresh Page</button>
        </div>
        
        <div id="status" class="status disconnected">
            Status: Disconnected
        </div>

        <div class="token-info">
            <div class="token-header">
                <img id="tokenLogo" src="" alt="Token Logo" style="width: 40px; height: 40px; border-radius: 50%; display: none;">
                <div class="token-details">
                    <h2 id="tokenSymbol">Token</h2>
                    <div id="tokenAddress" class="token-address"></div>
                </div>
            </div>
        </div>

        <div class="info-panel">
            <div class="info-card">
                <h3>Current Price</h3>
                <div id="currentPrice" class="value highlight-target">$0.00</div>
            </div>
            <div class="info-card">
                <h3>24h Change</h3>
                <div id="priceChange" class="value highlight-target">0.00%</div>
            </div>
            <div class="info-card">
                <h3>Market Cap</h3>
                <div id="marketCap" class="value highlight-target">$0</div>
            </div>
            <div class="info-card">
                <h3>Liquidity</h3>
                <div id="liquidity" class="value highlight-target">$0</div>
            </div>
            <div class="info-card">
                <h3>24h Volume</h3>
                <div id="volume24h" class="value highlight-target">$0</div>
            </div>
        </div>

        <div class="transactions-panel">
            <h3>🔄 Live Transactions</h3>
            <div id="transactionsList">
                <div class="transaction-item">No transactions yet...</div>
            </div>
        </div>

        <div id="chartContainer" class="chart-container"></div>
        
        <div id="log">
            <div>📊 Chart initialized. Click "Load Chart" to fetch historical data.</div>
        </div>
    </div>

    <script>
        // Configuration
        const BDS_API_KEY = '${BDS_API_KEY}';
        const BDS_BASE_URL = '${BDS_BASE_URL}';
        const BDS_WS_URL = '${BDS_WS_URL}';
        
        // Chart configuration
        let chart;
        let candlestickSeries;
        let volumeSeries;
        let ws;
        let currentCandle = null;
        let candleStartTime = null;

        // Token stats and transactions
        let tokenStats = {};
        let transactions = [];
        let maxTransactions = 20;
        
        // Initialize chart
        function initChart() {
            const chartContainer = document.getElementById('chartContainer');
            
            chart = LightweightCharts.createChart(chartContainer, {
                width: chartContainer.clientWidth,
                height: 600,
                layout: {
                    backgroundColor: '#2a2a2a',
                    textColor: '#ffffff',
                },
                grid: {
                    vertLines: {
                        color: '#404040',
                    },
                    horzLines: {
                        color: '#404040',
                    },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: '#555555',
                },
                timeScale: {
                    borderColor: '#555555',
                    timeVisible: true,
                    secondsVisible: false,
                },
            });
            
            // Add candlestick series
            candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: '#4caf50',
                downColor: '#f44336',
                borderDownColor: '#f44336',
                borderUpColor: '#4caf50',
                wickDownColor: '#f44336',
                wickUpColor: '#4caf50',
            });
            
            // Add volume series
            volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });
            
            log('📈 Chart initialized successfully');
        }

        // Load initial token stats
        async function loadTokenStats() {
            const tokenAddress = document.getElementById('tokenAddressInput').value;

            if (!tokenAddress) {
                return;
            }

            try {
                log(\`📊 Loading token stats for \${tokenAddress.substring(0, 8)}...\`);

                // Call token overview API
                const response = await fetch(\`\${BDS_BASE_URL}/defi/token_overview?address=\${tokenAddress}\`, {
                    headers: {
                        'X-API-KEY': BDS_API_KEY,
                        'x-chain': 'base',
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (result.success && result.data) {
                    const data = result.data;
                    tokenStats = {
                        symbol: data.symbol || 'Unknown',
                        logoURI: data.logoURI || '',
                        price: data.price || 0,
                        priceChange24h: data.priceChange24hPercent || 0,
                        marketCap: data.marketCap || 0,
                        liquidity: data.liquidity || 0,
                        volume24h: data.v24hUSD || 0
                    };

                    updateTokenDisplay();
                    log(\`✅ Token stats loaded for \${tokenStats.symbol}\`);
                } else {
                    log(\`❌ Failed to load token stats: \${result.message || 'Unknown error'}\`);
                }
            } catch (error) {
                log(\`❌ Error loading token stats: \${error.message}\`);
            }
        }

        // Load historical OHLCV data directly from Birdeye API
        async function loadHistoricalData() {
            const tokenAddress = document.getElementById('tokenAddressInput').value;
            const timeframe = document.getElementById('timeframe').value;
            
            if (!tokenAddress) {
                log('❌ Please enter a token address');
                return;
            }

            // Load token stats first
            await loadTokenStats();

            try {
                log(\`🔄 Loading historical data for \${tokenAddress.substring(0, 8)}...\`);
                
                // Call Birdeye API directly
                const response = await fetch(\`\${BDS_BASE_URL}/defi/v3/ohlcv?address=\${tokenAddress}&type=\${timeframe}&time_to=\${Math.floor(Date.now() / 1000)}&mode=count&count_limit=500\`, {
                    headers: {
                        'X-API-KEY': BDS_API_KEY,
                        'x-chain': 'base',
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                if (result.success && result.data && result.data.items) {
                    const candleData = result.data.items.map(item => ({
                        time: item.unix_time,
                        open: parseFloat(item.o),
                        high: parseFloat(item.h),
                        low: parseFloat(item.l),
                        close: parseFloat(item.c),
                    }));
                    
                    const volumeData = result.data.items.map(item => ({
                        time: item.unix_time,
                        value: parseFloat(item.v),
                        color: parseFloat(item.c) >= parseFloat(item.o) ? '#4caf50' : '#f44336'
                    }));
                    
                    candlestickSeries.setData(candleData);
                    volumeSeries.setData(volumeData);
                    
                    // Update current price
                    if (candleData.length > 0) {
                        const lastCandle = candleData[candleData.length - 1];
                    }
                    
                    log(\`✅ Loaded \${candleData.length} historical candles\`);
                } else {
                    log(\`❌ Failed to load historical data: \${result.message || 'Unknown error'}\`);
                }
            } catch (error) {
                log(\`❌ Error loading data: \${error.message}\`);
            }
        }

        // Update token display
        function updateTokenDisplay() {
            if (tokenStats.symbol) {
                document.getElementById('tokenSymbol').textContent = tokenStats.symbol;
                document.getElementById('tokenAddress').textContent = document.getElementById('tokenAddressInput').value;

                if (tokenStats.logoURI) {
                    const logoImg = document.getElementById('tokenLogo');
                    logoImg.src = tokenStats.logoURI;
                    logoImg.style.display = 'block';
                }

                updateCurrentPrice(tokenStats.price);
                updatePriceChange(tokenStats.priceChange24h);
                updateMarketCap(tokenStats.marketCap);
                updateLiquidity(tokenStats.liquidity);
                updateVolume24h(tokenStats.volume24h);
            }
        }

        // Update functions with highlighting
        function updateCurrentPrice(price) {
            const element = document.getElementById('currentPrice');
            element.textContent = \`$\${formatNumber(price)}\`;
            highlightUpdate(element);
        }

        function updatePriceChange(change) {
            const element = document.getElementById('priceChange');
            const isPositive = change >= 0;
            element.textContent = \`\${isPositive ? '+' : ''}\${change.toFixed(2)}%\`;
            element.style.color = isPositive ? '#4caf50' : '#f44336';
            highlightUpdate(element);
        }

        function updateMarketCap(marketCap) {
            const element = document.getElementById('marketCap');
            element.textContent = \`$\${formatNumber(marketCap)}\`;
            highlightUpdate(element);
        }

        function updateLiquidity(liquidity) {
            const element = document.getElementById('liquidity');
            element.textContent = \`$\${formatNumber(liquidity)}\`;
            highlightUpdate(element);
        }

        function updateVolume24h(volume) {
            const element = document.getElementById('volume24h');
            element.textContent = \`$\${formatNumber(volume)}\`;
            highlightUpdate(element);
        }

        // Highlight update function
        function highlightUpdate(element) {
            element.classList.add('highlight');
            setTimeout(() => {
                element.classList.remove('highlight');
            }, 1000);
        }

        // Format number function
        function formatNumber(num) {
            if (num >= 1e9) {
                return (num / 1e9).toFixed(2) + 'B';
            } else if (num >= 1e6) {
                return (num / 1e6).toFixed(2) + 'M';
            } else if (num >= 1e3) {
                return (num / 1e3).toFixed(2) + 'K';
            } else if (num >= 1) {
                return num.toFixed(2);
            } else {
                return num.toFixed(6);
            }
        }

        // Add transaction to list
        function addTransaction(txData) {
            const transactionsList = document.getElementById('transactionsList');

            // Create transaction item
            const txItem = document.createElement('div');
            txItem.className = \`transaction-item \${txData.side === 'buy' ? 'transaction-buy' : 'transaction-sell'}\`;

            const timestamp = new Date(txData.blockUnixTime * 1000).toLocaleTimeString();
            const fromAmount = txData.from?.uiAmount || 0;
            const fromSymbol = txData.from?.symbol || 'Unknown';
            const toAmount = txData.to?.uiAmount || 0;
            const toSymbol = txData.to?.symbol || 'Unknown';
            const volumeUSD = txData.volumeUSD || 0;

            txItem.innerHTML = \`
                <div>[\${timestamp}] \${txData.side.toUpperCase()}</div>
                <div>\${fromAmount.toFixed(4)} \${fromSymbol} → \${toAmount.toFixed(4)} \${toSymbol}</div>
                <div>Volume: $\${volumeUSD.toFixed(2)}</div>
            \`;

            // Add to beginning of list
            if (transactionsList.firstChild && transactionsList.firstChild.textContent !== 'No transactions yet...') {
                transactionsList.insertBefore(txItem, transactionsList.firstChild);
            } else {
                transactionsList.innerHTML = '';
                transactionsList.appendChild(txItem);
            }

            // Keep only last maxTransactions
            while (transactionsList.children.length > maxTransactions) {
                transactionsList.removeChild(transactionsList.lastChild);
            }
        }

        // Connect WebSocket directly to Birdeye
        function connectWebSocket() {
            const tokenAddress = document.getElementById('tokenAddressInput').value;
            const timeframe = document.getElementById('timeframe').value;

            if (!tokenAddress) {
                log('❌ Please enter a token address');
                return;
            }

            if (ws && ws.readyState === WebSocket.OPEN) {
                log('⚠️ WebSocket already connected');
                return;
            }

            updateStatus('connecting', 'Connecting to Birdeye WebSocket...');
            log(\`🔌 Connecting to Birdeye WebSocket for \${tokenAddress.substring(0, 8)}...\`);

            // Connect directly to Birdeye WebSocket
            ws = new WebSocket(\`\${BDS_WS_URL}?x-api-key=\${BDS_API_KEY}\`, 'echo-protocol');

            ws.onopen = function() {
                updateStatus('connected', 'WebSocket Connected to Birdeye');
                log('✅ WebSocket connected to Birdeye successfully');

                // Subscribe to price updates using Birdeye protocol
                setTimeout(() => {
                    const subscribeMessage = {
                        type: 'SUBSCRIBE_PRICE',
                        data: {
                            "queryType": "simple",
                            address: tokenAddress,
                            currency: 'usd',
                            chartType: timeframe,
                        }
                    };

                    ws.send(JSON.stringify(subscribeMessage));
                    log(\`📡 Subscribed to price updates for \${tokenAddress.substring(0, 8)}...\`);

                    // Subscribe to token stats updates
                    const subscribeStatsMessage = {
                        type: 'SUBSCRIBE_TOKEN_STATS',
                        data: {
                            address: tokenAddress,
                            select: {
                              price: true,
                              liquidity: true,
                              marketcap: true,
                              trade_data: {
                                volume: true,
                                price_change: true,
                                intervals: ["24h"],
                              },
                            },
                        }
                    };
                    ws.send(JSON.stringify(subscribeStatsMessage));
                    log(\`📊 Subscribed to token stats for \${tokenAddress.substring(0, 8)}...\`);

                    // Subscribe to transactions
                    const subscribeTxMessage = {
                        type: 'SUBSCRIBE_TXS',
                        data: {
                            address: tokenAddress
                        }
                    };
                    ws.send(JSON.stringify(subscribeTxMessage));
                    log(\`🔄 Subscribed to transactions for \${tokenAddress.substring(0, 8)}...\`);
                }, 1000);
            };

            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    log(\`❌ Error parsing WebSocket message: \${error.message}\`);
                }
            };

            ws.onclose = function() {
                updateStatus('disconnected', 'WebSocket Disconnected');
                log('🔌 WebSocket disconnected from Birdeye');
            };

            ws.onerror = function(error) {
                updateStatus('disconnected', 'WebSocket Error');
                log(\`❌ WebSocket error: \${error.message || 'Connection failed'}\`);
            };
        }

        // Handle WebSocket messages
        function handleWebSocketMessage(data) {
            if (data.type === 'PRICE_DATA' && data.data) {
                // Handle OHLCV data from WebSocket
                const ohlcvData = data.data;
                console.log('PRICE_DATA:', ohlcvData);

                if (ohlcvData.unixTime) {
                    // Update candlestick series with OHLCV data
                    const candleData = {
                        time: ohlcvData.unixTime,
                        open: parseFloat(ohlcvData.o, 4),
                        high: parseFloat(ohlcvData.h),
                        low: parseFloat(ohlcvData.l),
                        close: parseFloat(ohlcvData.c)
                    };

                    candlestickSeries.update(candleData);

                    // Update volume series if volume data is available
                    if (ohlcvData.v !== undefined) {
                        const volumeData = {
                            time: ohlcvData.unixTime,
                            value: parseFloat(ohlcvData.v),
                            color: candleData.close >= candleData.open ? '#4caf50' : '#f44336'
                        };
                        volumeSeries.update(volumeData);
                    }

                    // Update current price
                    updateCurrentPrice(candleData.close);
                }
            } else if (data.type === 'TOKEN_STATS_DATA' && data.data) {
                // Handle token stats updates
                const statsData = data.data;

                if (statsData.price !== undefined) {
                    tokenStats.price = statsData.price;
                    updateCurrentPrice(statsData.price);
                }

                if (statsData.price_change_24h_percent !== undefined) {
                    tokenStats.priceChange24h = statsData.price_change_24h_percent;
                    updatePriceChange(statsData.price_change_24h_percent);
                }

                if (statsData.marketcap !== undefined) {
                    tokenStats.marketCap = statsData.marketcap;
                    updateMarketCap(statsData.marketcap);
                }

                if (statsData.liquidity !== undefined) {
                    tokenStats.liquidity = statsData.liquidity;
                    updateLiquidity(statsData.liquidity);
                }

                if (statsData.volume_24h_usd !== undefined) {
                    tokenStats.volume24h = statsData.volume_24h_usd;
                    updateVolume24h(statsData.volume_24h_usd);
                }
            } else if (data.type === 'TXS_DATA' && data.data) {
                // Handle transaction data
                const txData = data.data;

                addTransaction(txData);
            }
        }

        // Update real-time candle
        function updateRealTimeCandle(price, timestamp) {
            const timeframe = document.getElementById('timeframe').value;
            let intervalSeconds;

            switch(timeframe) {
                case '1m': intervalSeconds = 60; break;
                case '5m': intervalSeconds = 300; break;
                case '15m': intervalSeconds = 900; break;
                case '1H': intervalSeconds = 3600; break;
                case '4H': intervalSeconds = 14400; break;
                case '1D': intervalSeconds = 86400; break;
                default: intervalSeconds = 86400;
            }

            const candleTime = Math.floor(timestamp / intervalSeconds) * intervalSeconds;

            if (!currentCandle || candleStartTime !== candleTime) {
                // Start new candle
                currentCandle = {
                    time: candleTime,
                    open: price,
                    high: price,
                    low: price,
                    close: price
                };
                candleStartTime = candleTime;
                candlestickSeries.update(currentCandle);
            } else {
                // Update existing candle
                currentCandle.open = currentCandle.open;
                currentCandle.high = Math.max(currentCandle.high, price);
                currentCandle.low = Math.min(currentCandle.low, price);
                currentCandle.close = price;
                candlestickSeries.update(currentCandle);
            }
        }

        // Update status
        function updateStatus(status, message) {
            const statusEl = document.getElementById('status');
            statusEl.className = \`status \${status}\`;
            statusEl.textContent = \`Status: \${message}\`;
        }

        // Log function
        function log(message) {
            const logEl = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            logEl.innerHTML += \`<div>[\${timestamp}] \${message}</div>\`;
            logEl.scrollTop = logEl.scrollHeight;
        }

        // Disconnect WebSocket
        function disconnectWebSocket() {
            if (ws) {
                ws.close();
                ws = null;
            }
        }

        // Refresh page
        function refreshPage() {
            window.location.reload();
        }

        // Event listeners
        document.getElementById('loadChart').addEventListener('click', loadHistoricalData);
        document.getElementById('connectWs').addEventListener('click', connectWebSocket);
        document.getElementById('disconnectWs').addEventListener('click', disconnectWebSocket);
        document.getElementById('refreshPage').addEventListener('click', refreshPage);

        // Handle window resize
        window.addEventListener('resize', () => {
            if (chart) {
                chart.applyOptions({
                    width: document.getElementById('chartContainer').clientWidth
                });
            }
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            initChart();
            log('🚀 Application initialized. Ready to load chart data.');
        });
    </script>
</body>
</html>`;

    return html;
}

// Generate the HTML file
const htmlContent = generateChartHTML();
const outputPath = path.join(__dirname, 'bds-realtime-chart.html');

try {
    fs.writeFileSync(outputPath, htmlContent);
    console.log(`✅ HTML chart generated successfully!`);
    console.log(`📄 File saved as: ${outputPath}`);
    console.log(`🌐 Open the file in your browser to use the chart`);
} catch (error) {
    console.error(`❌ Error generating HTML file: ${error.message}`);
    process.exit(1);
}
