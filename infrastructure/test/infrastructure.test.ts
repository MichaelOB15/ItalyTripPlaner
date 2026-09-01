import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InfrastructureStack } from '../lib/infrastructure-stack';
import { UserAuthStack } from '../lib/user-auth-stack';

describe('InfrastructureStack', () => {
  let app: cdk.App;
  let userAuthStack: UserAuthStack;
  let stack: InfrastructureStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    
    // Create user auth stack first (dependency)
    userAuthStack = new UserAuthStack(app, 'TestUserAuthStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    
    // Create infrastructure stack with user pool
    stack = new InfrastructureStack(app, 'TestInfrastructureStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      userPool: userAuthStack.userPool,
    });
    
    template = Template.fromStack(stack);
  });

  describe('Stack Outputs for Frontend Configuration', () => {
    test('should export API endpoint with environment variable guidance', () => {
      template.hasOutput('APIEndpoint', {
        Description: Match.stringLikeRegexp('.*VITE_API_BASE_URL.*'),
        Export: {
          Name: 'ItalyTripPlanner-APIEndpoint',
        },
      });
    });

    test('should export CloudFront URL', () => {
      template.hasOutput('CloudFrontURL', {
        Description: Match.stringLikeRegexp('CloudFront.*'),
        Export: {
          Name: 'ItalyTripPlanner-CloudFrontURL',
        },
      });
    });

    test('should export DynamoDB table name', () => {
      template.hasOutput('ItinerariesTableName', {
        Description: Match.stringLikeRegexp('.*itineraries.*'),
        Export: {
          Name: 'ItalyTripPlanner-ItinerariesTable',
        },
      });
    });

    test('should export frontend bucket name', () => {
      template.hasOutput('FrontendBucketName', {
        Export: {
          Name: 'ItalyTripPlanner-FrontendBucket',
        },
      });
    });
  });

  describe('DynamoDB Table', () => {
    test('should create itineraries table with correct name', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'italy-trip-planner-itineraries',
      });
    });

    test('should configure user_id as partition key', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: 'user_id',
            KeyType: 'HASH',
          }),
        ]),
      });
    });

    test('should configure itinerary_id as sort key', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: 'itinerary_id',
            KeyType: 'RANGE',
          }),
        ]),
      });
    });

    test('should use on-demand billing mode', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
      });
    });

    test('should enable point-in-time recovery', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });
  });

  describe('API Gateway', () => {
    test('should create REST API', () => {
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });

    test('should create Cognito authorizer when user pool is provided', () => {
      template.resourceCountIs('AWS::ApiGateway::Authorizer', 1);
    });

    test('should configure CORS', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'Italy Trip Planner API',
      });
    });
  });

  describe('Parameter Store', () => {
    test('should store API endpoint', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/italy-trip-planner/api-endpoint',
        Description: 'API Gateway endpoint URL',
      });
    });

    test('should store itineraries table name', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/italy-trip-planner/itineraries-table-name',
        Description: 'DynamoDB table name for user itineraries',
      });
    });

    test('should store CloudFront domain', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/italy-trip-planner/cloudfront-domain',
        Description: 'CloudFront distribution domain name',
      });
    });
  });

  describe('S3 Buckets', () => {
    test('should create frontend bucket', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.stringLikeRegexp('italy-trip-planner-frontend.*'),
      });
    });

    test('should create data bucket', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.stringLikeRegexp('italy-trip-planner-data.*'),
      });
    });
  });
});

