#!/bin/bash

# CI/CD Pipeline Validation Script
# This script checks if the CI/CD pipeline is properly configured

set -e

echo "🔍 Validating CI/CD Pipeline Configuration..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Check 1: Workflow file exists
echo "Checking workflow file..."
if [ -f ".github/workflows/ci-cd.yml" ]; then
    print_status 0 "Workflow file exists"
else
    print_status 1 "Workflow file missing"
fi

# Check 2: Backend structure
echo ""
echo "Checking backend structure..."
if [ -f "pom.xml" ]; then
    print_status 0 "Root pom.xml exists"
else
    print_status 1 "Root pom.xml missing"
fi

if [ -d "lambda-functions" ]; then
    print_status 0 "Lambda functions directory exists"
else
    print_status 1 "Lambda functions directory missing"
fi

if [ -d "models" ]; then
    print_status 0 "Models directory exists"
else
    print_status 1 "Models directory missing"
fi

if [ -d "common" ]; then
    print_status 0 "Common directory exists"
else
    print_status 1 "Common directory missing"
fi

# Check 3: Frontend structure
echo ""
echo "Checking frontend structure..."
if [ -d "frontend" ]; then
    print_status 0 "Frontend directory exists"
else
    print_status 1 "Frontend directory missing"
fi

if [ -f "frontend/package.json" ]; then
    print_status 0 "Frontend package.json exists"
    
    # Check for required scripts
    if grep -q '"lint"' frontend/package.json; then
        print_status 0 "Frontend lint script defined"
    else
        print_status 1 "Frontend lint script missing"
    fi
    
    if grep -q '"test"' frontend/package.json; then
        print_status 0 "Frontend test script defined"
    else
        print_status 1 "Frontend test script missing"
    fi
    
    if grep -q '"build"' frontend/package.json; then
        print_status 0 "Frontend build script defined"
    else
        print_status 1 "Frontend build script missing"
    fi
else
    print_status 1 "Frontend package.json missing"
fi

# Check 4: Infrastructure structure
echo ""
echo "Checking infrastructure structure..."
if [ -d "infrastructure" ]; then
    print_status 0 "Infrastructure directory exists"
else
    print_status 1 "Infrastructure directory missing"
fi

if [ -f "infrastructure/package.json" ]; then
    print_status 0 "Infrastructure package.json exists"
else
    print_status 1 "Infrastructure package.json missing"
fi

if [ -f "infrastructure/cdk.json" ]; then
    print_status 0 "CDK configuration exists"
else
    print_status 1 "CDK configuration missing"
fi

# Check 5: Git configuration
echo ""
echo "Checking Git configuration..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_status 0 "Git repository initialized"
    
    # Check for main branch
    if git show-ref --verify --quiet refs/heads/main; then
        print_status 0 "Main branch exists"
    elif git show-ref --verify --quiet refs/heads/master; then
        print_warning "Using 'master' branch instead of 'main' - consider updating workflow"
    else
        print_status 1 "Neither 'main' nor 'master' branch found"
    fi
    
    # Check for remote
    if git remote -v | grep -q origin; then
        print_status 0 "Git remote 'origin' configured"
    else
        print_status 1 "Git remote 'origin' not configured"
    fi
else
    print_status 1 "Not a Git repository"
fi

# Check 6: Required tools
echo ""
echo "Checking required tools..."

if command -v mvn &> /dev/null; then
    MVN_VERSION=$(mvn -version | head -n 1)
    print_status 0 "Maven installed ($MVN_VERSION)"
else
    print_status 1 "Maven not installed"
fi

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js installed ($NODE_VERSION)"
else
    print_status 1 "Node.js not installed"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status 0 "npm installed ($NPM_VERSION)"
else
    print_status 1 "npm not installed"
fi

if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version)
    print_status 0 "AWS CLI installed ($AWS_VERSION)"
else
    print_warning "AWS CLI not installed (required for manual deployments)"
fi

if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version | head -n 1)
    print_status 0 "GitHub CLI installed ($GH_VERSION)"
else
    print_warning "GitHub CLI not installed (optional, useful for workflow management)"
fi

# Check 7: Documentation
echo ""
echo "Checking documentation..."
if [ -f ".github/CICD_SETUP.md" ]; then
    print_status 0 "CI/CD setup guide exists"
else
    print_warning "CI/CD setup guide missing"
fi

if [ -f ".github/secrets.example.md" ]; then
    print_status 0 "Secrets template exists"
else
    print_warning "Secrets template missing"
fi

if [ -f ".github/QUICK_REFERENCE.md" ]; then
    print_status 0 "Quick reference guide exists"
else
    print_warning "Quick reference guide missing"
fi

# Check 8: Build validation (optional)
echo ""
echo "Checking if builds work locally..."

# Backend build test
if command -v mvn &> /dev/null; then
    echo "Testing backend build..."
    if mvn clean compile -q > /dev/null 2>&1; then
        print_status 0 "Backend builds successfully"
    else
        print_warning "Backend build has issues - run 'mvn clean compile' to see details"
    fi
else
    print_warning "Cannot test backend build (Maven not installed)"
fi

# Frontend build test
if [ -d "frontend" ] && command -v npm &> /dev/null; then
    echo "Testing frontend dependencies..."
    if [ -d "frontend/node_modules" ]; then
        print_status 0 "Frontend dependencies installed"
    else
        print_warning "Frontend dependencies not installed - run 'cd frontend && npm install'"
    fi
else
    print_warning "Cannot test frontend (npm not installed or frontend directory missing)"
fi

# Check 9: GitHub Actions status (if gh CLI available)
echo ""
echo "Checking GitHub Actions status..."
if command -v gh &> /dev/null; then
    if gh auth status &> /dev/null; then
        print_status 0 "GitHub CLI authenticated"
        
        # Check for recent workflow runs
        if gh run list --limit 1 &> /dev/null; then
            print_status 0 "Can access GitHub Actions workflows"
        else
            print_warning "Cannot access workflow runs (may not have any yet)"
        fi
    else
        print_warning "GitHub CLI not authenticated - run 'gh auth login'"
    fi
else
    print_warning "GitHub CLI not available - cannot check Actions status"
fi

# Check 10: AWS credentials (if AWS CLI available)
echo ""
echo "Checking AWS configuration..."
if command -v aws &> /dev/null; then
    if aws sts get-caller-identity &> /dev/null; then
        AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        print_status 0 "AWS credentials configured (Account: $AWS_ACCOUNT)"
    else
        print_warning "AWS credentials not configured locally (not required for CI/CD)"
    fi
else
    print_warning "AWS CLI not available - cannot check credentials"
fi

# Summary
echo ""
echo "================================"
echo "Validation Summary"
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $WARNINGS warning(s)${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Fix any errors shown above"
echo "2. Configure GitHub secrets (see .github/secrets.example.md)"
echo "3. Push to main branch to trigger first deployment"
echo "4. Monitor deployment at: https://github.com/YOUR_USERNAME/YOUR_REPO/actions"

if [ $ERRORS -eq 0 ]; then
    exit 0
else
    exit 1
fi
