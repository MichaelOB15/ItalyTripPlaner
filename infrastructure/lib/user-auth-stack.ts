import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class UserAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===========================
    // Cognito User Pool
    // ===========================

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'italy-trip-planner-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailSubject: 'Verify your Italy Trip Planner account',
        emailBody: 'Thank you for signing up to Italy Trip Planner! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      email: cognito.UserPoolEmail.withCognito(),
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Prevent accidental deletion of user data
    });

    // Configure token expiration times
    // Access token: 1 hour
    // Refresh token: 30 days
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: 'italy-trip-planner-web-client',
      authFlows: {
        userSrp: true, // Secure Remote Password authentication
        userPassword: true, // Enable username/password auth
        adminUserPassword: true, // Enable admin auth for testing
      },
      generateSecret: false, // Public client (browser-based app)
      preventUserExistenceErrors: true, // Security best practice
      accessTokenValidity: cdk.Duration.hours(1), // 1 hour
      idTokenValidity: cdk.Duration.hours(1), // 1 hour
      refreshTokenValidity: cdk.Duration.days(30), // 30 days
      enableTokenRevocation: true,
    });

    // ===========================
    // Parameter Store Configuration
    // ===========================

    // Store User Pool ID
    new ssm.StringParameter(this, 'UserPoolIdParam', {
      parameterName: '/italy-trip-planner/cognito/user-pool-id',
      stringValue: this.userPool.userPoolId,
      description: 'Cognito User Pool ID for user authentication',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store User Pool Client ID
    new ssm.StringParameter(this, 'UserPoolClientIdParam', {
      parameterName: '/italy-trip-planner/cognito/user-pool-client-id',
      stringValue: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID for web application',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store User Pool ARN
    new ssm.StringParameter(this, 'UserPoolArnParam', {
      parameterName: '/italy-trip-planner/cognito/user-pool-arn',
      stringValue: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      tier: ssm.ParameterTier.STANDARD,
    });

    // ===========================
    // Outputs
    // ===========================

    // AWS Region for frontend configuration
    new cdk.CfnOutput(this, 'AwsRegion', {
      value: this.region,
      description: 'AWS Region - Use for VITE_AWS_REGION environment variable',
      exportName: 'ItalyTripPlanner-AwsRegion',
    });

    // User Pool ID for frontend Amplify configuration
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID - Use for VITE_COGNITO_USER_POOL_ID environment variable',
      exportName: 'ItalyTripPlanner-UserPoolId',
    });

    // User Pool Client ID for frontend Amplify configuration
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID - Use for VITE_COGNITO_CLIENT_ID environment variable',
      exportName: 'ItalyTripPlanner-UserPoolClientId',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: 'ItalyTripPlanner-UserPoolArn',
    });

    new cdk.CfnOutput(this, 'UserPoolProviderUrl', {
      value: this.userPool.userPoolProviderUrl,
      description: 'Cognito User Pool Provider URL',
      exportName: 'ItalyTripPlanner-UserPoolProviderUrl',
    });
  }
}
