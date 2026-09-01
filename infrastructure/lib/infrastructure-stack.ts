import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface InfrastructureStackProps extends cdk.StackProps {
  userPool?: cognito.IUserPool;
}

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: InfrastructureStackProps) {
    super(scope, id, props);

    // ===========================
    // S3 Buckets
    // ===========================

    // Frontend bucket for static website hosting
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `italy-trip-planner-frontend-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
      publicReadAccess: false, // CloudFront will access via OAI
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Prevent accidental deletion
      autoDeleteObjects: false,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    // Data bucket for datasets (italy.json and custom uploads)
    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: `italy-trip-planner-data-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(90),
          enabled: true,
        },
      ],
    });

    // ===========================
    // DynamoDB Table
    // ===========================

    // Itineraries table for user authentication and persistent storage
    const itinerariesTable = new dynamodb.Table(this, 'ItinerariesTable', {
      tableName: 'italy-trip-planner-itineraries',
      partitionKey: { 
        name: 'user_id', 
        type: dynamodb.AttributeType.STRING 
      },
      sortKey: { 
        name: 'itinerary_id', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand billing mode
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true, // Enable point-in-time recovery
      },
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // AWS-managed encryption
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Prevent accidental deletion
    });

    // ===========================
    // CloudFront Distribution
    // ===========================

    // Origin Access Identity for S3 access
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'FrontendOAI',
      {
        comment: 'OAI for Italy Trip Planner Frontend',
      }
    );

    // Grant CloudFront read access to frontend bucket
    frontendBucket.grantRead(originAccessIdentity);

    // Cache policy for static assets with 1 year TTL
    const staticAssetCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetCachePolicy', {
      cachePolicyName: `ItalyTripPlannerStaticCache-${this.account}`,
      comment: 'Cache policy for static assets (1 year TTL)',
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        // No cache for index.html to ensure latest app version on every deployment
        '/index.html': {
          origin: new origins.S3Origin(frontendBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
        // Long cache (1 year) for all static assets in /assets directory
        // Vite outputs JS, CSS, images, and fonts to /assets/* with content hashes
        '/assets/*': {
          origin: new origins.S3Origin(frontendBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetCachePolicy,
          compress: true,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      comment: 'Italy Trip Planner CloudFront Distribution',
    });

    // ===========================
    // IAM Roles
    // ===========================

    // Lambda execution role with S3 read permissions
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `ItalyTripPlannerLambdaRole-${this.region}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Italy Trip Planner Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    // Grant Lambda read access to data bucket
    dataBucket.grantRead(lambdaExecutionRole);

    // Grant Lambda read access to SSM Parameter Store
    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath',
        ],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/italy-trip-planner/*`,
        ],
      })
    );

    // Grant Lambda read/write access to DynamoDB itineraries table (Requirement 7.5)
    // All Lambda functions using this execution role will have least-privilege access
    // to perform CRUD operations on the itineraries table
    itinerariesTable.grantReadWriteData(lambdaExecutionRole);

    // ===========================
    // API Gateway REST API
    // ===========================

    // Determine allowed origins for CORS
    // In production, restrict to CloudFront domain only
    // Include localhost for local development
    const allowedOrigins = [
      `https://${distribution.distributionDomainName}`, // CloudFront domain
      'http://localhost:5173', // Local development (Vite default)
      'http://localhost:3000', // Alternative local development port
    ];

    const api = new apigateway.RestApi(this, 'TripPlannerAPI', {
      restApiName: 'Italy Trip Planner API',
      description: 'API for Italy Trip Planner application',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true, // Required for Authorization header
        maxAge: cdk.Duration.minutes(10),
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    // Add CORS headers to Gateway Responses for error responses (401, 403, 404, 500)
    // This ensures CORS headers are present even when API Gateway returns errors before reaching Lambda
    // Note: We use '*' here instead of specific origins because Gateway Responses don't support
    // dynamic origin selection, and we need these errors to be visible to the frontend
    api.addGatewayResponse('Unauthorized', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
      },
    });

    api.addGatewayResponse('AccessDenied', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
      },
    });

    api.addGatewayResponse('Default4XX', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
      },
    });

    api.addGatewayResponse('Default5XX', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
      },
    });

    // ===========================
    // Cognito Authorizer (if User Pool provided)
    // ===========================

    let cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer | undefined;
    
    if (props?.userPool) {
      cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
        this,
        'CognitoAuthorizer',
        {
          cognitoUserPools: [props.userPool],
          authorizerName: 'ItalyTripPlannerCognitoAuthorizer',
          identitySource: 'method.request.header.Authorization',
          resultsCacheTtl: cdk.Duration.seconds(300), // Cache for 5 minutes
        }
      );
    }

    // ===========================
    // Lambda Functions (Java)
    // ===========================

    // Path to the Lambda JAR file built by Maven
    const lambdaJarPath = '../lambda-functions/target/lambda-functions-1.0.0.jar';

    // GetPlaces Lambda
    const getPlacesLambda = new lambda.Function(this, 'GetPlacesFunction', {
      functionName: 'ItalyTripPlanner-GetPlaces',
      runtime: lambda.Runtime.JAVA_17,
      handler: 'com.italytrip.lambda.GetPlacesFunction::handleRequest',
      code: lambda.Code.fromAsset(lambdaJarPath),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      description: 'Retrieve and filter places from dataset',
      environment: {
        DATA_BUCKET_NAME: dataBucket.bucketName,
        DATASET_KEY: 'file_italy.json',
      },
    });

    // CreateItinerary Lambda (requirement 4.1)
    const createItineraryLambda = new lambda.Function(this, 'CreateItineraryFunction', {
      functionName: 'ItalyTripPlanner-CreateItinerary',
      runtime: lambda.Runtime.JAVA_17,
      handler: 'com.italytrip.lambda.CreateItineraryHandler::handleRequest',
      code: lambda.Code.fromAsset(lambdaJarPath),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      description: 'Create new itinerary for authenticated users',
      environment: {
        TABLE_NAME: itinerariesTable.tableName,
      },
    });
    // DynamoDB permissions granted via lambdaExecutionRole (Requirement 7.5)

    // GetRecommendations Lambda
    const getRecommendationsLambda = new lambda.Function(
      this,
      'GetRecommendationsFunction',
      {
        functionName: 'ItalyTripPlanner-GetRecommendations',
        runtime: lambda.Runtime.JAVA_17,
        handler: 'com.italytrip.lambda.GetRecommendationsFunction::handleRequest',
        code: lambda.Code.fromAsset(lambdaJarPath),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(10),
        memorySize: 1024,
        description: 'Generate itinerary recommendations',
        environment: {
          DATA_BUCKET_NAME: dataBucket.bucketName,
          DATASET_KEY: 'file_italy.json',
        },
      }
    );

    // ValidateDataset Lambda
    const validateDatasetLambda = new lambda.Function(
      this,
      'ValidateDatasetFunction',
      {
        functionName: 'ItalyTripPlanner-ValidateDataset',
        runtime: lambda.Runtime.JAVA_17,
        handler: 'com.italytrip.lambda.ValidateDatasetFunction::handleRequest',
        code: lambda.Code.fromAsset(lambdaJarPath),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
        description: 'Validate custom dataset uploads',
        environment: {
          DATA_BUCKET_NAME: dataBucket.bucketName,
        },
      }
    );

    // ListItineraries Lambda
    const listItinerariesLambda = new lambda.Function(
      this,
      'ListItinerariesFunction',
      {
        functionName: 'ItalyTripPlanner-ListItineraries',
        runtime: lambda.Runtime.JAVA_17,
        handler: 'com.italytrip.lambda.ListItinerariesHandler::handleRequest',
        code: lambda.Code.fromAsset(lambdaJarPath),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
        description: 'List all itineraries for authenticated user',
        environment: {
          TABLE_NAME: itinerariesTable.tableName,
        },
      }
    );
    // DynamoDB permissions granted via lambdaExecutionRole (Requirement 7.5)

    // ===========================
    // Itinerary Lambda Functions
    // ===========================

    // GetItinerary Lambda
    const getItineraryLambda = new lambda.Function(
      this,
      'GetItineraryFunction',
      {
        functionName: 'ItalyTripPlanner-GetItinerary',
        runtime: lambda.Runtime.JAVA_17,
        handler: 'com.italytrip.lambda.GetItineraryHandler::handleRequest',
        code: lambda.Code.fromAsset(lambdaJarPath),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
        description: 'Get specific itinerary for authenticated user',
        environment: {
          TABLE_NAME: itinerariesTable.tableName,
        },
      }
    );
    // DynamoDB permissions granted via lambdaExecutionRole (Requirement 7.5)

    // UpdateItinerary Lambda
    const updateItineraryLambda = new lambda.Function(
      this,
      'UpdateItineraryFunction',
      {
        functionName: 'ItalyTripPlanner-UpdateItinerary',
        runtime: lambda.Runtime.JAVA_17,
        handler: 'com.italytrip.lambda.UpdateItineraryHandler::handleRequest',
        code: lambda.Code.fromAsset(lambdaJarPath),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
        description: 'Update existing itinerary for authenticated user',
        environment: {
          TABLE_NAME: itinerariesTable.tableName,
        },
      }
    );
    // DynamoDB permissions granted via lambdaExecutionRole (Requirement 7.5)

    // DeleteItinerary Lambda (requirement 4.9)
    const deleteItineraryLambda = new lambda.Function(
      this,
      'DeleteItineraryFunction',
      {
        functionName: 'ItalyTripPlanner-DeleteItinerary',
        runtime: lambda.Runtime.JAVA_17,
        handler: 'com.italytrip.lambda.DeleteItineraryHandler::handleRequest',
        code: lambda.Code.fromAsset(lambdaJarPath),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
        description: 'Delete itinerary for authenticated user',
        environment: {
          TABLE_NAME: itinerariesTable.tableName,
        },
      }
    );
    // DynamoDB permissions granted via lambdaExecutionRole (Requirement 7.5)

    // ===========================
    // API Gateway Integration
    // ===========================

    // /places endpoint
    const placesResource = api.root.addResource('places');
    placesResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPlacesLambda, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // /recommendations endpoint
    const recommendationsResource = api.root.addResource('recommendations');
    recommendationsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(getRecommendationsLambda, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // /validate endpoint
    const validateResource = api.root.addResource('validate');
    validateResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(validateDatasetLambda, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // ===========================
    // Protected Itineraries Endpoints (with Cognito Authorizer)
    // ===========================

    if (cognitoAuthorizer) {
      // /itineraries resource
      const itinerariesResource = api.root.addResource('itineraries');

      // POST /itineraries - Create new itinerary (requirement 4.1)
      itinerariesResource.addMethod(
        'POST',
        new apigateway.LambdaIntegration(createItineraryLambda, {
          proxy: true,
          integrationResponses: [
            {
              statusCode: '201',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'*'",
              },
            },
          ],
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
          methodResponses: [
            {
              statusCode: '201',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
              },
            },
          ],
        }
      );

      // GET /itineraries - List all itineraries for user (requirement 4.3, 4.4)
      itinerariesResource.addMethod(
        'GET',
        new apigateway.LambdaIntegration(listItinerariesLambda, {
          proxy: true,
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'*'",
              },
            },
          ],
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
              },
            },
          ],
        }
      );

      // /itineraries/{itinerary_id} resource
      const itineraryIdResource = itinerariesResource.addResource('{itinerary_id}');

      // GET /itineraries/{itinerary_id} - Get specific itinerary
      // Task 3.3: Connected to GetItineraryHandler
      itineraryIdResource.addMethod(
        'GET',
        new apigateway.LambdaIntegration(getItineraryLambda, {
          proxy: true,
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'*'",
              },
            },
          ],
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
              },
            },
          ],
        }
      );

      // PUT /itineraries/{itinerary_id} - Update itinerary
      // Task 3.4: Connected to UpdateItineraryHandler (Requirement 4.7)
      itineraryIdResource.addMethod(
        'PUT',
        new apigateway.LambdaIntegration(updateItineraryLambda, {
          proxy: true,
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'*'",
              },
            },
          ],
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
              },
            },
          ],
        }
      );

      // DELETE /itineraries/{itinerary_id} - Delete itinerary (requirement 4.9, 4.10)
      itineraryIdResource.addMethod(
        'DELETE',
        new apigateway.LambdaIntegration(deleteItineraryLambda, {
          proxy: true,
          integrationResponses: [
            {
              statusCode: '204',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'*'",
              },
            },
          ],
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
          methodResponses: [
            {
              statusCode: '204',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
              },
            },
          ],
        }
      );
    }

    // ===========================
    // Parameter Store Configuration
    // ===========================

    // Store frontend bucket name
    new ssm.StringParameter(this, 'FrontendBucketNameParam', {
      parameterName: '/italy-trip-planner/frontend-bucket-name',
      stringValue: frontendBucket.bucketName,
      description: 'S3 bucket name for frontend static assets',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store data bucket name
    new ssm.StringParameter(this, 'DataBucketNameParam', {
      parameterName: '/italy-trip-planner/data-bucket-name',
      stringValue: dataBucket.bucketName,
      description: 'S3 bucket name for dataset storage',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store API endpoint URL
    new ssm.StringParameter(this, 'ApiEndpointParam', {
      parameterName: '/italy-trip-planner/api-endpoint',
      stringValue: api.url,
      description: 'API Gateway endpoint URL',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store CloudFront distribution domain
    new ssm.StringParameter(this, 'CloudFrontDomainParam', {
      parameterName: '/italy-trip-planner/cloudfront-domain',
      stringValue: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store dataset key
    new ssm.StringParameter(this, 'DatasetKeyParam', {
      parameterName: '/italy-trip-planner/dataset-key',
      stringValue: 'file_italy.json',
      description: 'Default dataset file key in S3',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store DynamoDB table name
    new ssm.StringParameter(this, 'ItinerariesTableNameParam', {
      parameterName: '/italy-trip-planner/itineraries-table-name',
      stringValue: itinerariesTable.tableName,
      description: 'DynamoDB table name for user itineraries',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store environment stage
    new ssm.StringParameter(this, 'EnvironmentParam', {
      parameterName: '/italy-trip-planner/environment',
      stringValue: 'production',
      description: 'Deployment environment (development, staging, production)',
      tier: ssm.ParameterTier.STANDARD,
    });

    // ===========================
    // Outputs
    // ===========================

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 bucket name',
      exportName: 'ItalyTripPlanner-FrontendBucket',
    });

    new cdk.CfnOutput(this, 'DataBucketName', {
      value: dataBucket.bucketName,
      description: 'Data S3 bucket name',
      exportName: 'ItalyTripPlanner-DataBucket',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: 'ItalyTripPlanner-CloudFrontURL',
    });

    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL - Use for VITE_API_BASE_URL environment variable',
      exportName: 'ItalyTripPlanner-APIEndpoint',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: 'ItalyTripPlanner-DistributionId',
    });

    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: lambdaExecutionRole.roleArn,
      description: 'Lambda execution role ARN',
      exportName: 'ItalyTripPlanner-LambdaRoleArn',
    });

    new cdk.CfnOutput(this, 'ItinerariesTableName', {
      value: itinerariesTable.tableName,
      description: 'DynamoDB itineraries table name',
      exportName: 'ItalyTripPlanner-ItinerariesTable',
    });

    // Cognito Authorizer output (if configured)
    if (cognitoAuthorizer) {
      new cdk.CfnOutput(this, 'CognitoAuthorizerId', {
        value: cognitoAuthorizer.authorizerId,
        description: 'Cognito authorizer ID for protected endpoints',
        exportName: 'ItalyTripPlanner-CognitoAuthorizerId',
      });

      // Store authorizer information in Parameter Store
      new ssm.StringParameter(this, 'CognitoAuthorizerIdParam', {
        parameterName: '/italy-trip-planner/cognito-authorizer-id',
        stringValue: cognitoAuthorizer.authorizerId,
        description: 'Cognito authorizer ID for API Gateway',
        tier: ssm.ParameterTier.STANDARD,
      });
    }
  }
}
