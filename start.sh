#!/bin/bash
# Script de démarrage ExaMed
set -e

echo "=== ExaMed — Démarrage ==="

# Vérifier Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker non installé"
  exit 1
fi

# Démarrer les services
echo "▶ Démarrage des services..."
docker compose up -d postgres redis pdf-parser

echo "⏳ Attente PostgreSQL..."
sleep 5

echo "▶ Démarrage du backend..."
docker compose up -d backend

echo "⏳ Attente backend (migrations)..."
sleep 10

echo "▶ Seed admin..."
docker compose exec backend npx ts-node prisma/seed.ts 2>/dev/null || true

echo "▶ Démarrage du frontend..."
docker compose up -d frontend

echo ""
echo "✅ ExaMed démarré !"
echo ""
echo "  🌐 Application : http://localhost:3000"
echo "  🔧 API Backend : http://localhost:3001"
echo "  📚 API Docs    : http://localhost:3001/api/docs"
echo "  🐍 PDF Parser  : http://localhost:8000"
echo ""
echo "  👤 Admin : admin@examed.mr"
echo "  🔑 MDP   : Admin@ExaMed2024!"
echo ""
echo "⚠️  Changez le mot de passe admin en production !"
