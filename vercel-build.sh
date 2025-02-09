#!/bin/bash

# Install frontend dependencies and build
cd frontend
npm install
npm run build

# Move back to root and install Python dependencies
cd ..
pip install -r requirements.txt 