# CI/CD Quick Reference Guide

Quick commands and procedures for the Italy Trip Planner CI/CD pipeline.

## 🚀 Quick Start

### First-Time Setup
```bash
# 1. Configure GitHub secrets (see secrets.example.md)
# 2. Push to main branch
git push origin main

# 3. Monitor deployment
# Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

## 📋 Common Operations

### Trigger a Deployment
```bash
# Push to main branch
git checkout main
git pull
git push origin main
```

### Test Before Deploying
```bash
# Create a pull request
git checkout -b feature/my-feature
git add .
git commit -m "Add new feature"
git push origin feature/my-feature
# Open PR on GitHub - lint and test will run automatically
```

### View Deployment Status
```bash
# Via GitHub CLI
gh run list --limit 5

# View specific run
gh run view RUN_ID

# View logs
gh run view RUN_ID --log
```

### Manual Deployment (Bypass CI/CD)
```bash
# Full manual deployment
./scripts/manual-deploy.sh

# Or step-by-step:
mvn clean package                    # Build backend
cd frontend && npm run build         # Build frontend
cd ../infrastructure && npx cdk deploy --all  # Deploy
```

## 🔧 Troubleshooting

### Pipeline Fails at Backend Test
```bash
# Run tests locally
mvn test

# Run specific test
mvn test -Dtest=ClassName#methodName

# Debug with verbose output
mvn test -X
```

### Pipeline Fails at Frontend Test
```bash
# Run tests locally
cd frontend
npm test

# Run with coverage
npm run test:coverage

# Debug specific test
npm test -- PlaceCard.test.tsx
```

### Pipeline Fails at Deploy
```bash
# Check AWS credentials
aws sts get-caller-identity

# View CloudFormation stack status
aws cloudformation describe-stacks --stack-name ItalyTripPlannerStack

# View stack events
aws cloudformation describe-stack-events --stack-name ItalyTripPlannerStack --max-items 20

# View CDK diff before deploying
cd infrastructure
npx cdk diff
```

### CloudFront Not Updating
```bash
# Invalidate CloudFront cache manually
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name ItalyTripPlannerStack \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## 📊 Monitoring

### View Recent Deployments
```bash
# Via GitHub CLI
gh run list --workflow=ci-cd.yml --limit 10

# Via AWS CloudFormation
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?starts_with(StackName, 'ItalyTripPlanner')]"
```

### View Application Logs
```bash
# Lambda function logs
aws logs tail /aws/lambda/GetPlacesFunction --follow

# API Gateway logs
aws logs tail /aws/apigateway/ItalyTripPlannerAPI --follow
```

### Check Application Health
```bash
# Get API endpoint
API_URL=$(aws cloudformation describe-stacks \
  --stack-name ItalyTripPlannerStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayURL'].OutputValue" \
  --output text)

# Test places endpoint
curl "$API_URL/places"

# Test with filters
curl "$API_URL/places?cities=Rome,Florence"
```

## 🔐 Security Operations

### Rotate AWS Credentials
```bash
# 1. Create new access key
aws iam create-access-key --user-name github-actions-deploy

# 2. Update GitHub secrets with new keys

# 3. Delete old access key
aws iam delete-access-key \
  --user-name github-actions-deploy \
  --access-key-id OLD_KEY_ID
```

### Review IAM Permissions
```bash
# List user policies
aws iam list-attached-user-policies --user-name github-actions-deploy

# Get policy version
aws iam get-policy-version \
  --policy-arn POLICY_ARN \
  --version-id v1
```

## 🛠️ Advanced Operations

### Deploy to Different Environment
```yaml
# Modify workflow to add environment parameter
# Then deploy with:
gh workflow run ci-cd.yml -f environment=staging
```

### Rollback Deployment
```bash
# Via CloudFormation (automatic rollback on failure)
# Or manually revert to previous version:

# 1. Get previous stack version
aws cloudformation list-stack-resources --stack-name ItalyTripPlannerStack

# 2. Redeploy previous code version
git checkout PREVIOUS_COMMIT_SHA
git push origin main --force
```

### Debug Lambda Functions
```bash
# Invoke Lambda function locally
aws lambda invoke \
  --function-name GetPlacesFunction \
  --payload '{"queryStringParameters":{"cities":"Rome"}}' \
  response.json

cat response.json
```

### Update Environment Variables
```bash
# Update Parameter Store
aws ssm put-parameter \
  --name /italytrip/api/dataset-bucket \
  --value new-bucket-name \
  --overwrite

# No redeployment needed for Parameter Store changes
```

## 📈 Performance Optimization

### Check Build Times
```bash
# Via GitHub CLI
gh run list --workflow=ci-cd.yml --json conclusion,createdAt,updatedAt

# Calculate average build time
```

### Optimize Cache Usage
```yaml
# In workflow file, verify cache is configured:
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    
- uses: actions/setup-java@v4
  with:
    cache: 'maven'
```

## 🔍 Debugging Tips

### Enable Debug Logging
```bash
# Add to workflow file:
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Download Build Artifacts
```bash
# Via GitHub CLI
gh run download RUN_ID

# Via web: Actions → Run → Artifacts section
```

### Test CDK Changes Locally
```bash
cd infrastructure

# View changes without deploying
npx cdk diff

# Synthesize CloudFormation template
npx cdk synth > template.yaml
cat template.yaml
```

## 📝 Common Workflow Modifications

### Add New Job
```yaml
new-job:
  name: New Job
  runs-on: ubuntu-latest
  needs: [other-job]  # Optional: wait for other jobs
  steps:
    - uses: actions/checkout@v4
    - name: Run command
      run: echo "Hello"
```

### Add Slack Notifications
```yaml
- name: Notify Slack
  if: always()  # Run even if previous steps fail
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}"
      }
```

### Add Manual Approval
```yaml
deploy:
  environment:
    name: production
    # Add protection rules in GitHub Settings → Environments
```

## 📚 Useful Links

- **GitHub Actions Logs**: https://github.com/YOUR_USERNAME/YOUR_REPO/actions
- **AWS CloudFormation Console**: https://console.aws.amazon.com/cloudformation
- **AWS Lambda Console**: https://console.aws.amazon.com/lambda
- **CloudFront Console**: https://console.aws.amazon.com/cloudfront
- **API Gateway Console**: https://console.aws.amazon.com/apigateway

## ⚡ Performance Benchmarks

| Job | Expected Duration | Action if Slower |
|-----|------------------|------------------|
| Backend Lint | 1-2 min | Check Maven cache |
| Backend Test | 2-3 min | Optimize tests |
| Frontend Lint | 30-60 sec | Check npm cache |
| Frontend Test | 1-2 min | Optimize tests |
| Backend Build | 2-3 min | Check Maven cache |
| Frontend Build | 1-2 min | Check npm cache |
| Deploy | 3-5 min | Check AWS CloudFormation |

## 🚨 Alerts and Notifications

### Set Up GitHub Notifications
1. Go to repository Settings
2. Notifications → Emails
3. Configure build failure emails

### Set Up AWS Alarms
```bash
# Create CloudWatch alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## 💡 Best Practices

1. **Always test in PR before merging to main**
2. **Monitor deployment status actively**
3. **Keep dependencies up to date**
4. **Review build logs for warnings**
5. **Rotate AWS credentials regularly**
6. **Use semantic commit messages**
7. **Tag releases for easy rollback**
8. **Document any custom workflow changes**

## 🆘 Emergency Procedures

### Production is Down
```bash
# 1. Check application status
curl https://YOUR_CLOUDFRONT_URL

# 2. Check recent deployments
gh run list --limit 1

# 3. Rollback if needed
git revert HEAD
git push origin main

# 4. Monitor new deployment
gh run watch
```

### Secrets Compromised
```bash
# 1. Immediately rotate AWS keys
aws iam delete-access-key --user-name github-actions-deploy --access-key-id COMPROMISED_KEY
aws iam create-access-key --user-name github-actions-deploy

# 2. Update GitHub secrets
# 3. Redeploy
git commit --allow-empty -m "Force redeploy"
git push origin main
```
