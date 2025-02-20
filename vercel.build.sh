#!/bin/bash
set -e

# Install Python dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Build frontend
cd frontend
npm install
npm run build 