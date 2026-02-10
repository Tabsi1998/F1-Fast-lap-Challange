#!/bin/bash
# ============================================
# F1 FAST LAP CHALLENGE - DOCKER INSTALLATION
# ============================================
#
# Voraussetzungen: Docker & Docker Compose
#
# USAGE:
#   chmod +x docker-install.sh && ./docker-install.sh
#
# ============================================

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   F1 FAST LAP CHALLENGE - DOCKER SETUP       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker nicht gefunden!${NC}"
    echo ""
    echo "Installation:"
    echo "  Linux:   curl -fsSL https://get.docker.com | sh"
    echo "  Windows: https://www.docker.com/products/docker-desktop"
    echo "  macOS:   https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose nicht gefunden!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker gefunden${NC}"

# Determine compose command
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo ""
echo -e "${YELLOW}Baue und starte Container...${NC}"
echo ""

# Build and start
$COMPOSE_CMD up -d --build

echo ""
echo -e "${GREEN}✓ Container gestartet${NC}"
echo ""

# Wait for services
echo -e "${YELLOW}Warte auf Services...${NC}"
sleep 5

# Check if running
if docker ps | grep -q "f1-frontend"; then
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║         INSTALLATION ERFOLGREICH!                ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║                                                  ║"
    echo "║   🏎️  F1 Fast Lap Challenge läuft!               ║"
    echo "║                                                  ║"
    echo "║   URL:         http://localhost:8080             ║"
    echo "║   Admin Login: admin / admin                     ║"
    echo "║                                                  ║"
    echo "║   Befehle:                                       ║"
    echo "║   - Stoppen:   docker compose down               ║"
    echo "║   - Starten:   docker compose up -d              ║"
    echo "║   - Logs:      docker compose logs -f            ║"
    echo "║   - Neustart:  docker compose restart            ║"
    echo "║                                                  ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
else
    echo -e "${RED}Fehler: Container nicht gestartet${NC}"
    echo "Logs anzeigen mit: docker compose logs"
    exit 1
fi
