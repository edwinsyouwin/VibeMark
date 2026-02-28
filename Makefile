.PHONY: dev dev-api dev-frontend install install-api install-frontend

# Run both API and frontend dev servers concurrently
dev:
	@echo "Starting Vibemark dev servers..."
	@trap 'kill 0' INT; \
		$(MAKE) dev-api & \
		$(MAKE) dev-frontend & \
		wait

dev-api:
	cd "$(CURDIR)" && .venv/bin/uvicorn vibemark.api.app:app --reload --port 8000

dev-frontend:
	cd "$(CURDIR)/frontend" && npm run dev

install: install-api install-frontend

install-api:
	pip install -e ".[web]"

install-frontend:
	cd "$(CURDIR)/frontend" && npm install
