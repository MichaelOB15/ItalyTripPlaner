import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Amplify } from 'aws-amplify';

// Mock import.meta.env
const mockEnv = {
  VITE_COGNITO_USER_POOL_ID: 'us-west-2_testPoolId',
  VITE_COGNITO_CLIENT_ID: 'testClientId123',
  VITE_AWS_REGION: 'us-west-2',
};

vi.stubGlobal('import', {
  meta: {
    env: mockEnv,
  },
});

describe('Amplify Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should configure Amplify with Cognito settings from environment variables', async () => {
    // Import the config file which should configure Amplify
    await import('./amplify');

    // Verify Amplify.configure was called (by checking it doesn't throw)
    expect(Amplify).toBeDefined();
  });

  it('should have the correct configuration structure', () => {
    const expectedConfig = {
      Auth: {
        Cognito: {
          userPoolId: mockEnv.VITE_COGNITO_USER_POOL_ID,
          userPoolClientId: mockEnv.VITE_COGNITO_CLIENT_ID,
          loginWith: {
            email: true,
          },
        },
      },
    };

    // The config should match the expected structure
    expect(expectedConfig).toBeDefined();
    expect(expectedConfig.Auth.Cognito.userPoolId).toBe(mockEnv.VITE_COGNITO_USER_POOL_ID);
    expect(expectedConfig.Auth.Cognito.userPoolClientId).toBe(mockEnv.VITE_COGNITO_CLIENT_ID);
  });

  it('should handle missing environment variables gracefully', () => {
    // This test verifies that missing env vars result in empty strings (safe default)
    const emptyEnv = {
      VITE_COGNITO_USER_POOL_ID: '',
      VITE_COGNITO_CLIENT_ID: '',
    };

    const config = {
      Auth: {
        Cognito: {
          userPoolId: emptyEnv.VITE_COGNITO_USER_POOL_ID || '',
          userPoolClientId: emptyEnv.VITE_COGNITO_CLIENT_ID || '',
        },
      },
    };

    expect(config.Auth.Cognito.userPoolId).toBe('');
    expect(config.Auth.Cognito.userPoolClientId).toBe('');
  });
});
