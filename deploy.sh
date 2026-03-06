#!/usr/bin/env bash
#
# deploy.sh — Deploy frontend & backend to Google Cloud Run
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated  (gcloud auth login)
#   2. A GCP project created and selected       (gcloud config set project <id>)
#   3. Billing enabled on the project
#   4. Cloud Run & Artifact Registry APIs enabled
#
# Usage:
#   ./deploy.sh                 # deploy both
#   ./deploy.sh frontend        # deploy frontend only
#   ./deploy.sh backend         # deploy backend only
#
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)
REGION="us-central1"                       # change if needed
REPO_NAME="spike-prime-virtual"            # Artifact Registry repo name

FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${GCP_PROJECT}/${REPO_NAME}/frontend"
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${GCP_PROJECT}/${REPO_NAME}/backend"

FRONTEND_SERVICE="spikeprime-frontend"
BACKEND_SERVICE="spikeprime-backend"

DOMAIN="spikeprimevirtual.com"
API_DOMAIN="api.spikeprimevirtual.com"

# ─── Helpers ────────────────────────────────────────────────────────────────
info()  { printf "\n\033[1;34m▸ %s\033[0m\n" "$*"; }
ok()    { printf "\033[1;32m✔ %s\033[0m\n" "$*"; }
fail()  { printf "\033[1;31m✖ %s\033[0m\n" "$*"; exit 1; }

ensure_apis() {
  info "Enabling required GCP APIs …"
  gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    --quiet
  ok "APIs enabled"
}

ensure_repo() {
  info "Ensuring Artifact Registry repository exists …"
  if ! gcloud artifacts repositories describe "$REPO_NAME" \
       --location="$REGION" --format="value(name)" &>/dev/null; then
    gcloud artifacts repositories create "$REPO_NAME" \
      --repository-format=docker \
      --location="$REGION" \
      --description="Code Pybricks container images" \
      --quiet
    ok "Repository created"
  else
    ok "Repository already exists"
  fi
}

configure_docker() {
  info "Configuring Docker for Artifact Registry …"
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
  ok "Docker configured"
}

# ─── Deploy Frontend ────────────────────────────────────────────────────────
deploy_frontend() {
  info "Building frontend Docker image …"
  docker build -t "${FRONTEND_IMAGE}:latest" ./frontend
  ok "Frontend image built"

  info "Pushing frontend image …"
  docker push "${FRONTEND_IMAGE}:latest"
  ok "Frontend image pushed"

  info "Deploying frontend to Cloud Run …"
  gcloud run deploy "$FRONTEND_SERVICE" \
    --image="${FRONTEND_IMAGE}:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=256Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=5 \
    --quiet
  ok "Frontend deployed"

  FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --format="value(status.url)")
  ok "Frontend URL: $FRONTEND_URL"
}

# ─── Deploy Backend ─────────────────────────────────────────────────────────
deploy_backend() {
  info "Building backend Docker image …"
  docker build -t "${BACKEND_IMAGE}:latest" ./backend
  ok "Backend image built"

  info "Pushing backend image …"
  docker push "${BACKEND_IMAGE}:latest"
  ok "Backend image pushed"

  info "Deploying backend to Cloud Run …"
  gcloud run deploy "$BACKEND_SERVICE" \
    --image="${BACKEND_IMAGE}:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --update-env-vars="^||^CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}" \
    --quiet
  ok "Backend deployed"

  BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" --format="value(status.url)")
  ok "Backend URL: $BACKEND_URL"

  echo ""
  echo "⚠  Remember to set secrets (run once):"
  echo "   gcloud run services update $BACKEND_SERVICE --region=$REGION \\"
  echo "     --set-env-vars=GEMINI_API_KEY=<key>,GCP_PROJECT_ID=${GCP_PROJECT}"
}

# ─── Domain mapping instructions ────────────────────────────────────────────
print_domain_instructions() {
  echo ""
  info "Domain mapping (run once after first deploy):"
  echo ""
  echo "  # Map frontend"
  echo "  gcloud beta run domain-mappings create \\"
  echo "    --service=$FRONTEND_SERVICE --domain=$DOMAIN --region=$REGION"
  echo ""
  echo "  gcloud beta run domain-mappings create \\"
  echo "    --service=$FRONTEND_SERVICE --domain=www.$DOMAIN --region=$REGION"
  echo ""
  echo "  # Map backend API"
  echo "  gcloud beta run domain-mappings create \\"
  echo "    --service=$BACKEND_SERVICE --domain=$API_DOMAIN --region=$REGION"
  echo ""
  echo "  Then add the DNS records shown above at name.com (see DEPLOYMENT.md)."
}

# ─── Main ───────────────────────────────────────────────────────────────────
main() {
  [[ -z "$GCP_PROJECT" ]] && fail "No GCP project set. Run: gcloud config set project <id>"

  info "Project: $GCP_PROJECT  |  Region: $REGION"

  ensure_apis
  ensure_repo
  configure_docker

  TARGET="${1:-all}"

  case "$TARGET" in
    frontend) deploy_frontend ;;
    backend)  deploy_backend ;;
    all)
      deploy_frontend
      deploy_backend
      ;;
    *) fail "Unknown target: $TARGET. Use: frontend | backend | all" ;;
  esac

  print_domain_instructions
  echo ""
  ok "Deployment complete!"
}

main "$@"
