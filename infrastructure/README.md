# Infrastructure

AWS CDK infrastructure for the Italy Trip Planner.

## Quick Start

```bash
npm install               # Install dependencies
cdk bootstrap            # First time only
cdk deploy               # Deploy to AWS
cdk destroy              # Delete stack (WARNING: destructive)
```

## Stack Components

- **S3 Buckets**: Frontend assets, datasets
- **CloudFront**: CDN distribution
- **API Gateway**: REST API
- **Lambda**: Serverless functions (Java 17)
- **DynamoDB**: Itinerary storage
- **Cognito**: User authentication
- **CloudWatch**: Logging

## Useful Commands

```bash
cdk diff                 # Preview changes
cdk synth                # Generate CloudFormation
cdk deploy --hotswap     # Fast Lambda-only updates
```

## Configuration

Stack is defined in `lib/infrastructure-stack.ts`

## Outputs

After deployment, get production URLs:

```bash
aws cloudformation describe-stacks \
  --stack-name ItalyTripPlannerStack \
  --query 'Stacks[0].Outputs'
```
