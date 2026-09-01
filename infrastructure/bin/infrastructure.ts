#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { InfrastructureStack } from '../lib/infrastructure-stack';
import { UserAuthStack } from '../lib/user-auth-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Create the User Authentication stack with Cognito first
const userAuthStack = new UserAuthStack(app, 'ItalyTripPlannerUserAuthStack', {
  env,
  
  description: 'User authentication infrastructure for Italy Trip Planner (Cognito User Pool)',
  
  tags: {
    Project: 'ItalyTripPlanner',
    ManagedBy: 'AWS-CDK',
    Environment: 'Production',
  },
});

// Create the Italy Trip Planner infrastructure stack, passing the User Pool
new InfrastructureStack(app, 'ItalyTripPlannerStack', {
  // Use current AWS CLI configuration for account and region
  env,
  
  // Pass the User Pool from UserAuthStack for Cognito authorizer
  userPool: userAuthStack.userPool,
  
  // Stack description
  description: 'AWS infrastructure for Italy Trip Planner application (S3, CloudFront, API Gateway, Lambda)',
  
  // Stack tags
  tags: {
    Project: 'ItalyTripPlanner',
    ManagedBy: 'AWS-CDK',
    Environment: 'Production',
  },
});
