#!/bin/bash

# Birdeye Data Services Workshop - Jupyter Book Build Script

echo "🚀 Building Birdeye Data Services Workshop with Jupyter Book..."

# Install requirements
echo "📦 Installing requirements..."
pip install -r requirements-book.txt

# Clean previous builds
echo "🧹 Cleaning previous builds..."
jupyter-book clean .

# Build the book
echo "📚 Building Jupyter Book..."
jupyter-book build .

# Build JupyterLite
echo "🔬 Building JupyterLite..."
jupyter lite build --contents . --output-dir _build/lite

echo "✅ Build complete!"
echo ""
echo "📖 Jupyter Book: Open _build/html/index.html"
echo "🔬 JupyterLite: Open _build/lite/index.html"
echo ""
echo "🌐 To serve locally:"
echo "   Jupyter Book: python -m http.server 8000 --directory _build/html"
echo "   JupyterLite: python -m http.server 8001 --directory _build/lite"
