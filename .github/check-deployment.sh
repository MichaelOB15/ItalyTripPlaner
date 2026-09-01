#!/bin/bash

# Quick deployment status checker
# Usage: ./check-deployment.sh

set -e

echo "🔍 Checking Deployment Status..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${BLUE}Recent Workflow Runs:${NC}"
echo "─────────────────────────────────────────────"
gh run list --workflow=ci-cd.yml --limit 5

echo ""
echo -e "${BLUE}Latest Run Details:${NC}"
echo "─────────────────────────────────────────────"
LATEST_RUN=$(gh run list --workflow=ci-cd.yml --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -n "$LATEST_RUN" ]; then
    gh run view $LATEST_RUN
    
    echo ""
    echo -e "${BLUE}Quick Actions:${NC}"
    echo "View logs: gh run view $LATEST_RUN --log"
    echo "Watch live: gh run watch $LATEST_RUN"
    echo "Rerun: gh run rerun $LATEST_RUN"
else
    echo "No workflow runs found"
fi

# Check AWS deployment (if AWS CLI available)
if command -v aws &> /dev/null && aws sts get-caller-identity &> /dev/null 2>&1; then
    echo ""
    echo -e "${BLUE}AWS Deployment Status:${NC}"
    echo "─────────────────────────────────────────────"
    
    # Check CloudFormation stack
    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name ItalyTripPlannerStack \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    echo "Stack Status: $STACK_STATUS"
    
    if [ "$STACK_STATUS" != "NOT_FOUND" ]; then
        # Get outputs
        echo ""
        echo "Stack Outputs:"
        aws cloudformation describe-stacks \
            --stack-name ItalyTripPlannerStack \
            --query 'Stacks[0].Outputs' \
            --output table
        
        # Get CloudFront URL
        CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
            --stack-name ItalyTripPlannerStack \
            --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$CLOUDFRONT_URL" ]; then
            echo ""
            echo -e "${GREEN}Application URL: $CLOUDFRONT_URL${NC}"
            
            # Test if URL is accessible
            if curl -s -o /dev/null -w "%{http_code}" "$CLOUDFRONT_URL" | grep -q "200\|301\|302"; then
                echo -e "${GREEN}✓ Application is accessible${NC}"
            else
                echo -e "${YELLOW}⚠ Application may not be accessible yet${NC}"
            fi
        fi
    fi
fi

echo ""
echo "─────────────────────────────────────────────"
echo "For more details, visit:"
echo "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
