# GitHub Actions CI/CD Pipeline

This directory contains the CI/CD pipeline configuration and documentation for the Italy Trip Planner application.

## 📁 Directory Contents

### Workflows
- **`workflows/ci-cd.yml`** - Main CI/CD pipeline configuration
  - Lint and test on pull requests
  - Full deployment pipeline on main branch push
  - Automated AWS deployment with CloudFront cache invalidation

### Documentation
- **`CICD_SETUP.md`** - Comprehensive setup guide with detailed instructions
- **`secrets.example.md`** - Template for configuring required GitHub secrets
- **`QUICK_REFERENCE.md`** - Quick reference for common CI/CD operations

### Scripts
- **`validate-cicd.sh`** - Validation script to check CI/CD readiness
- **`check-deployment.sh`** - Quick status checker for recent deployments

## 🚀 Quick Start

### 1. Configure GitHub Secrets

Add these secrets to your repository (Settings → Secrets and variables → Actions):

```
AWS_ACCESS_KEY_ID         - Your AWS access key
AWS_SECRET_ACCESS_KEY     - Your AWS secret key
AWS_ACCOUNT_ID            - Your 12-digit AWS account ID
VITE_API_ENDPOINT         - API Gateway URL (after first deployment)
```

See [`secrets.example.md`](./secrets.example.md) for detailed instructions.

### 2. Validate Setup

```bash
./.github/validate-cicd.sh
```

This checks:
- ✅ Workflow file exists
- ✅ Project structure is correct
- ✅ Required tools are installed
- ✅ Build scripts work locally

### 3. Trigger Deployment

Push to main branch:
```bash
git push origin main
```

Or create a pull request to run lint and test checks only.

### 4. Check Deployment Status

```bash
./.github/check-deployment.sh
```

Or visit: https://github.com/YOUR_USERNAME/YOUR_REPO/actions

## 📊 Pipeline Overview

### Pull Request Flow
```
PR Created → Backend Lint → Backend Test → Frontend Lint → Frontend Test → ✅ Ready to Merge
```

### Main Branch Flow
```
Push → Lint & Test → Build Backend → Build Frontend → Build Infrastructure → Deploy to AWS → ✅ Live
```

## 🔧 Jobs Explained

### Lint Jobs
- **Backend Lint**: Validates Java code compiles without errors
- **Frontend Lint**: Runs ESLint and Prettier checks

### Test Jobs
- **Backend Test**: Runs JUnit tests with coverage
- **Frontend Test**: Runs Vitest tests with coverage

### Build Jobs (Main branch only)
- **Backend Build**: Compiles Lambda functions, packages JARs
- **Frontend Build**: Builds production React app with Vite
- **Infrastructure Build**: Compiles TypeScript CDK code

### Deploy Job (Main branch only)
- Configures AWS credentials
- Downloads build artifacts
- Runs CDK deployment
- Invalidates CloudFront cache
- Outputs deployment URL

## 📚 Documentation Guide

### For First-Time Setup
Start with [`CICD_SETUP.md`](./CICD_SETUP.md) - includes:
- Architecture diagrams
- AWS IAM setup
- GitHub secrets configuration
- Troubleshooting guide

### For Daily Operations
Use [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) - includes:
- Common commands
- Troubleshooting procedures
- Monitoring commands
- Emergency procedures

### For Configuration
Use [`secrets.example.md`](./secrets.example.md) - includes:
- Secret templates
- How to obtain values
- Security best practices

## 🛠️ Helper Scripts

### Validate CI/CD Setup
```bash
./.github/validate-cicd.sh
```
Checks if everything is configured correctly before first deployment.

### Check Deployment Status
```bash
./.github/check-deployment.sh
```
Shows recent workflow runs and AWS deployment status.

## 🔐 Security

### Required Secrets
All sensitive credentials are stored as GitHub Secrets:
- AWS credentials never committed to repository
- API endpoints configured via environment variables
- Secrets accessible only to GitHub Actions

### Best Practices
- Rotate AWS credentials every 90 days
- Use minimal IAM permissions (see setup guide)
- Enable branch protection on main
- Require PR reviews before merging

## 🎯 Common Tasks

### Test Changes Before Merging
```bash
git checkout -b feature/my-feature
# Make changes
git push origin feature/my-feature
gh pr create
# Wait for checks to pass
```

### Deploy to Production
```bash
git checkout main
git merge feature/my-feature
git push origin main
# Automatic deployment triggered
```

### View Deployment Logs
```bash
gh run list --workflow=ci-cd.yml
gh run view RUN_ID --log
```

### Rollback Deployment
```bash
git revert HEAD
git push origin main
# Deploys previous version
```

## 📈 Performance

Expected job durations:
- **Lint**: 1-2 minutes
- **Test**: 2-3 minutes
- **Build**: 2-3 minutes
- **Deploy**: 3-5 minutes
- **Total**: ~10-15 minutes

## 💰 Cost

- **GitHub Actions**: Free (2,000 min/month for public repos)
- **AWS Deployments**: ~$0.01 per deployment
- **Total**: $0 (within free tiers)

## 🐛 Troubleshooting

### Pipeline Fails

**Check logs:**
```bash
gh run view --log
```

**Common issues:**
- AWS credentials not configured → Check secrets
- Build fails → Run builds locally to debug
- Tests fail → Fix tests before merging
- Deploy fails → Check CloudFormation console

### Deployment Not Working

**Check AWS stack:**
```bash
aws cloudformation describe-stacks --stack-name ItalyTripPlannerStack
```

**View stack events:**
```bash
aws cloudformation describe-stack-events --stack-name ItalyTripPlannerStack --max-items 20
```

### Need Help?

1. Check [`CICD_SETUP.md`](./CICD_SETUP.md) for detailed troubleshooting
2. Review [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) for common solutions
3. View GitHub Actions logs for error details
4. Check AWS CloudFormation console for deployment errors

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Repository Actions](../../actions) (update with your repo URL)

## 📝 Contributing

When modifying the CI/CD pipeline:

1. Test changes in a feature branch
2. Update documentation if needed
3. Run validation script: `./.github/validate-cicd.sh`
4. Create PR for review
5. Merge after approval

## 📄 License

See the main repository LICENSE file.

---

**Last Updated**: 2024
**Maintained By**: Italy Trip Planner Team
