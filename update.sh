#!/bin/bash
# F1 Fast Lap Challenge - Update Script
# Führt ein vollständiges Update durch

echo "🏎️ F1 Fast Lap Challenge - Update"
echo "=================================="
echo ""

# Stoppe Container
echo "⏹️  Container stoppen..."
docker compose down

# Neu bauen mit neuem Code
echo "🔨 Neu bauen..."
docker compose up -d --build

echo ""
echo "✅ Update abgeschlossen!"
echo ""
echo "🌐 Die App ist erreichbar unter:"
echo "   http://localhost:8080"
echo ""
echo "📋 Logs anzeigen: docker compose logs -f"
