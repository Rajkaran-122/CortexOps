#!/bin/bash

# CortexOps API Gateway Test Script

echo "==============================="
echo "Testing GET /v1/health..."
echo "==============================="
curl -s http://localhost:3000/v1/health

echo -e "\n\n==============================="
echo "Testing POST /v1/health..."
echo "==============================="
curl -X POST -s http://localhost:3000/v1/health

echo -e "\n\n==============================="
echo "Testing POST /v1/research..."
echo "==============================="
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"What was the revenue of Apple in 2023?"}' \
  -s http://localhost:3000/v1/research
echo -e "\n"
