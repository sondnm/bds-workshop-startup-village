const fs = require('fs');
const path = require('path');
require('dotenv').config();

// API configuration
const BDS_API_KEY = process.env.BDS_API_KEY || process.env.BDS_STANDARD_API_KEY;
const BDS_BASE_URL = 'https://public-api.birdeye.so';
const BDS_WS_URL = 'wss://public-api.birdeye.so/socket/solana';

// SOL token address
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';

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
            <input type="text" id="tokenAddress" placeholder="Token Address" value="${SOL_ADDRESS}">
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
        let updateCount = 0;
        let currentCandle = null;
        let candleStartTime = null;
        
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
        
        // Load historical OHLCV data directly from Birdeye API
        async function loadHistoricalData() {
            const tokenAddress = document.getElementById('tokenAddress').value;
            const timeframe = document.getElementById('timeframe').value;
            
            if (!tokenAddress) {
                log('❌ Please enter a token address');
                return;
            }
            
            try {
                log(\`🔄 Loading historical data for \${tokenAddress.substring(0, 8)}...\`);
                
                // Call Birdeye API directly
                const response = await fetch(\`\${BDS_BASE_URL}/defi/v3/ohlcv?address=\${tokenAddress}&type=\${timeframe}&time_to=\${Math.floor(Date.now() / 1000)}&mode=count&count_limit=200\`, {
                    headers: {
                        'X-API-KEY': BDS_API_KEY,
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

        // Connect WebSocket directly to Birdeye
        function connectWebSocket() {
            const tokenAddress = document.getElementById('tokenAddress').value;
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
                    log(\`📡 Subscribed to Birdeye price updates for \${tokenAddress.substring(0, 8)}...\`);
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
                console.log(ohlcvData);

                if (ohlcvData.unixTime) {
                    // Update candlestick series with OHLCV data
                    const candleData = {
                        time: ohlcvData.unixTime,
                        open: parseFloat(ohlcvData.o),
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

                    log(\`📊 OHLCV update: O=$\${candleData.open.toFixed(6)} H=$\${candleData.high.toFixed(6)} L=$\${candleData.low.toFixed(6)} C=$\${candleData.close.toFixed(6)} V=\${ohlcvData.v || 0} at \${new Date(ohlcvData.unixTime * 1000).toLocaleTimeString()}\`);
                }
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
    console.log(`\n📋 Features:`);
    console.log(`   • Direct connection to Birdeye API`);
    console.log(`   • Real-time WebSocket updates`);
    console.log(`   • TradingView Lightweight Charts`);
    console.log(`   • Standalone HTML file (no server required)`);
} catch (error) {
    console.error(`❌ Error generating HTML file: ${error.message}`);
    process.exit(1);
}
