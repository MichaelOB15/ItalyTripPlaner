import { Amplify } from 'aws-amplify';

/**
 * AWS Amplify Configuration
 * 
 * Configures AWS Amplify for authentication using Amazon Cognito.
 * The configuration values are loaded from environment variables set during deployment.
 * 
 * Environment Variables Required:
 * - VITE_AWS_REGION: AWS region where Cognito User Pool is deployed
 * - VITE_COGNITO_USER_POOL_ID: Cognito User Pool ID from CDK outputs
 * - VITE_COGNITO_CLIENT_ID: Cognito User Pool Client ID from CDK outputs
 */

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      loginWith: {
        email: true,
      },
    },
  },
  // AWS Region is automatically detected from the User Pool ID format,
  // but can be explicitly set if needed
  region: import.meta.env.VITE_AWS_REGION || 'us-west-2',
};

// Configure Amplify with the settings
Amplify.configure(awsConfig);

export default awsConfig;
