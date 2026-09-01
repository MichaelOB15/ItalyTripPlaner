import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { UserAuthStack } from '../lib/user-auth-stack';

describe('UserAuthStack', () => {
  let app: cdk.App;
  let stack: UserAuthStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new UserAuthStack(app, 'TestUserAuthStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  describe('Cognito User Pool', () => {
    test('should create a User Pool with correct name', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'italy-trip-planner-users',
      });
    });

    test('should configure email as username', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
      });
    });

    test('should enable auto-verification of email', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AutoVerifiedAttributes: ['email'],
      });
    });

    test('should enable self sign-up', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: false,
        },
      });
    });

    test('should enforce password complexity requirements', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
            TemporaryPasswordValidityDays: 3,
          },
        },
      });
    });

    test('should configure email-only account recovery', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
      });
    });

    test('should configure email verification message', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EmailVerificationSubject: 'Verify your Italy Trip Planner account',
        EmailVerificationMessage: Match.stringLikeRegexp('.*verification code.*'),
      });
    });

    test('should have RETAIN deletion policy', () => {
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('should require email as a standard attribute', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Schema: Match.arrayWith([
          Match.objectLike({
            Name: 'email',
            Required: true,
            Mutable: true,
          }),
        ]),
      });
    });
  });

  describe('User Pool Client', () => {
    test('should create a User Pool Client', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'italy-trip-planner-web-client',
      });
    });

    test('should configure as public client (no secret)', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        GenerateSecret: false,
      });
    });

    test('should enable SRP and password auth flows', () => {
      const resources = template.findResources('AWS::Cognito::UserPoolClient');
      const clientResource = Object.values(resources)[0] as any;
      const authFlows = clientResource.Properties.ExplicitAuthFlows;
      
      expect(authFlows).toContain('ALLOW_USER_SRP_AUTH');
      expect(authFlows).toContain('ALLOW_USER_PASSWORD_AUTH');
      expect(authFlows).toContain('ALLOW_REFRESH_TOKEN_AUTH');
    });

    test('should configure token expiration - access: 1 hour', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        AccessTokenValidity: 60, // minutes
        TokenValidityUnits: Match.objectLike({
          AccessToken: 'minutes',
        }),
      });
    });

    test('should configure token expiration - refresh: 30 days', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        RefreshTokenValidity: 43200, // 30 days in minutes
        TokenValidityUnits: Match.objectLike({
          RefreshToken: 'minutes',
        }),
      });
    });

    test('should configure token expiration - id token: 1 hour', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        IdTokenValidity: 60, // minutes
        TokenValidityUnits: Match.objectLike({
          IdToken: 'minutes',
        }),
      });
    });

    test('should enable token revocation', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        EnableTokenRevocation: true,
      });
    });

    test('should prevent user existence errors', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'ENABLED',
      });
    });
  });

  describe('Parameter Store', () => {
    test('should create User Pool ID parameter', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/italy-trip-planner/cognito/user-pool-id',
        Description: 'Cognito User Pool ID for user authentication',
        Type: 'String',
      });
    });

    test('should create User Pool Client ID parameter', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/italy-trip-planner/cognito/user-pool-client-id',
        Description: 'Cognito User Pool Client ID for web application',
        Type: 'String',
      });
    });

    test('should create User Pool ARN parameter', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/italy-trip-planner/cognito/user-pool-arn',
        Description: 'Cognito User Pool ARN',
        Type: 'String',
      });
    });
  });

  describe('Stack Outputs', () => {
    test('should export AWS Region with environment variable guidance', () => {
      template.hasOutput('AwsRegion', {
        Description: Match.stringLikeRegexp('.*VITE_AWS_REGION.*'),
        Export: {
          Name: 'ItalyTripPlanner-AwsRegion',
        },
      });
    });

    test('should export User Pool ID with environment variable guidance', () => {
      template.hasOutput('UserPoolId', {
        Description: Match.stringLikeRegexp('.*VITE_COGNITO_USER_POOL_ID.*'),
        Export: {
          Name: 'ItalyTripPlanner-UserPoolId',
        },
      });
    });

    test('should export User Pool Client ID with environment variable guidance', () => {
      template.hasOutput('UserPoolClientId', {
        Description: Match.stringLikeRegexp('.*VITE_COGNITO_CLIENT_ID.*'),
        Export: {
          Name: 'ItalyTripPlanner-UserPoolClientId',
        },
      });
    });

    test('should export User Pool ARN', () => {
      template.hasOutput('UserPoolArn', {
        Description: 'Cognito User Pool ARN',
        Export: {
          Name: 'ItalyTripPlanner-UserPoolArn',
        },
      });
    });

    test('should export User Pool Provider URL', () => {
      template.hasOutput('UserPoolProviderUrl', {
        Description: 'Cognito User Pool Provider URL',
        Export: {
          Name: 'ItalyTripPlanner-UserPoolProviderUrl',
        },
      });
    });
  });

  describe('Resource Count', () => {
    test('should create exactly one User Pool', () => {
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    test('should create exactly one User Pool Client', () => {
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });

    test('should create three SSM parameters', () => {
      template.resourceCountIs('AWS::SSM::Parameter', 3);
    });
  });
});
