# Italy Trip Planner

A full-stack serverless web application for creating personalized 3-day Italy itineraries with AI-powered recommendations and interactive editing.

## 🌐 Live Application

**Live Site:** https://d10xzq83e4ezkh.cloudfront.net

Try it out! Create custom 3-day Italy itineraries with drag-and-drop editing and AI-powered recommendations.

---

## ✨ Features

### Core Functionality
- 🎯 **Smart Recommendations** - Generate optimized 3-day itineraries using an intelligent scoring algorithm based on preferences (cities, interests, pace, budget)
- 🖱️ **Interactive Editing** - Drag-and-drop activities, reorder within days, move between days
- 🔍 **Smart Filtering** - Search and filter 100+ Italian destinations by city, type, rating, price, tags
- 📅 **Auto-Scheduling** - Automatic time calculations with 30-minute travel buffers
- 🔒 **User Authentication** - Secure sign-in with AWS Cognito
- ☁️ **Cloud Persistence** - Per-user itinerary storage accessible from any device
- ⏪ **Undo/Redo** - Full history tracking with unlimited undo
- 🌍 **Geographic Coherence** - Prevents mixing cities on the same day
- 💾 **Auto-Save** - Changes automatically saved after 1 second

---

## 🛠️ Tech Stack

**Frontend:**
- React 18.3 with TypeScript 5.6
- Vite 5.4 (build tool)
- Tailwind CSS 3.4
- Axios 1.7 (HTTP client)
- React DnD (drag-and-drop)

**Backend:**
- Java 17 with Maven 3.8
- AWS Lambda (serverless compute)
- API Gateway (REST API)
- AWS SDK 2.21

**Infrastructure:**
- AWS CDK 2.x (TypeScript)
- S3 (storage)
- CloudFront (CDN)
- DynamoDB (itinerary storage)
- Cognito (authentication)
- CloudWatch (logging)

**Development:**
- GitHub for version control
- AWS CLI for deployment
- Vitest for frontend testing
- JUnit 5 for backend testing

---

## 🚀 Future Improvements

- **Custom Datasets** - Upload your own place datasets with custom cities and activities
- **Natural Language Chat** - Interact with and update itineraries using conversational AI
- **Flexible Trip Length** - Build itineraries for any duration (not just 3 days)
- **Custom Activities** - Add personal activities, restaurants, and points of interest
- **Enhanced Maps** - Integrate interactive maps with routing between activities and estimated travel times
- **Activity Images** - Display photos for each activity directly in the itinerary builder
- **Export Options** - Download itineraries as PDF, share via link, or sync to calendar

---

## Quick Start

### Prerequisites
- **Node.js** 20+ and npm 10+
- **Java** 17+ and Maven 3.8+
- **AWS CLI** 2.x configured with credentials
- **AWS CDK** 2.x (`npm install -g aws-cdk`)

### Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd StripeInterview

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Build backend
mvn clean install

# 4. Start frontend dev server
cd frontend && npm run dev
# Visit http://localhost:5173

# 5. Run backend tests
mvn test
```

### Deploy to AWS

```bash
# 1. Build Lambda functions
cd lambda-functions
mvn clean package -DskipTests
cd ..

# 2. Deploy infrastructure & backend
cd infrastructure
cdk bootstrap  # First time only
cdk deploy ItalyTripPlannerStack
cd ..

# 3. Upload dataset
DATA_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ItalyTripPlannerStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DataBucketName`].OutputValue' \
  --output text)
aws s3 cp initial_documents/file_italy.json s3://${DATA_BUCKET}/file_italy.json

# 4. Deploy frontend
cd frontend
npm run build
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ItalyTripPlannerStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ --delete

# 5. Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name ItalyTripPlannerStack \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)
aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"

# 6. Get production URL
aws cloudformation describe-stacks \
  --stack-name ItalyTripPlannerStack \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text
```

---

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├────────────────────────────┐
       │                            │
┌──────▼──────┐          ┌─────────▼────────┐
│  CloudFront │          │ AWS Cognito      │
│     CDN     │          │ Authentication   │
└──────┬──────┘          └──────────────────┘
       │
   ┌───┴────────────┐
   │                │
┌──▼───┐     ┌──────▼────────┐
│  S3  │     │ API Gateway   │
│React │     │     REST      │
└──────┘     └───────┬───────┘
                     │
              ┌──────▼──────┐
              │   Lambda    │
              │  Functions  │
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼───┐   ┌───▼───┐   ┌───▼───────┐
    │  S3   │   │DynamoDB│   │ Cognito  │
    │Dataset│   │Itiner. │   │User Pool │
    └───────┘   └────────┘   └──────────┘
```

### Tech Stack

**Frontend:**
- React 18.3 with TypeScript 5.6
- Vite 5.4 (build tool)
- Tailwind CSS 3.4
- Axios 1.7 (HTTP client)
- React DnD (drag-and-drop)

**Backend:**
- Java 17 with Maven 3.8
- AWS Lambda (serverless compute)
- API Gateway (REST API)
- AWS SDK 2.21

**Infrastructure:**
- AWS CDK 2.x (TypeScript)
- S3 (storage)
- CloudFront (CDN)
- DynamoDB (itinerary storage)
- Cognito (authentication)
- CloudWatch (logging)

---

```
StripeInterview/
├── frontend/                    # React app
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── contexts/           # State management
│   │   ├── services/           # API client
│   │   └── types/              # TypeScript types
│   └── package.json
│
├── models/                      # Java domain models
│   └── src/main/java/com/italytrip/models/
│
├── common/                      # Shared utilities
│   └── src/main/java/com/italytrip/validation/
│
├── lambda-functions/            # AWS Lambda handlers
│   └── src/main/java/com/italytrip/lambda/
│
├── infrastructure/              # AWS CDK
│   ├── lib/
│   │   └── infrastructure-stack.ts
│   └── package.json
│
├── initial_documents/
│   └── file_italy.json         # Dataset (100+ places)
│
└── pom.xml                     # Maven parent POM
```

---

## API Endpoints

Base URL: `https://qhi4rns0b0.execute-api.us-west-2.amazonaws.com/prod/`

### Public Endpoints
- `GET /places` - List all places with filtering
- `POST /recommendations` - Generate AI itinerary
- `POST /validate-dataset` - Validate dataset format

### Authenticated Endpoints (Requires Cognito token)
- `GET /itineraries` - List user's itineraries
- `POST /itineraries` - Create new itinerary
- `GET /itineraries/{id}` - Get specific itinerary
- `PUT /itineraries/{id}` - Update itinerary
- `DELETE /itineraries/{id}` - Delete itinerary

### Query Parameters

**GET /places:**
```
?city=Rome                 # Filter by city
&type=historic_site        # Filter by type
&minRating=4.0            # Minimum rating
&priceRange=€€             # Price range
&tag=must-see             # Filter by tag
&limit=50                 # Results per page
&offset=0                 # Pagination offset
```

**POST /recommendations:**
```json
{
  "cities": ["Rome", "Florence", "Venice"],
  "interests": ["art", "food", "history"],
  "pace": "moderate",
  "priceRange": ["€€", "€€€"],
  "includeBookingRequired": true
}
```

**Note:** The recommendation engine uses a scoring algorithm (not AI/ML) that:
- Scores places based on preference matches (city +3pts, tag +2pts, price +1pt, rating bonus)
- Clusters by city for geographic coherence
- Schedules based on time constraints (6-10 hours depending on pace)
- Balances for diversity and meal coverage

---

## Development

### Frontend Commands
```bash
cd frontend
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run format       # Format with Prettier
```

### Backend Commands
```bash
mvn clean install    # Build all modules
mvn test             # Run all tests
mvn clean package    # Package Lambda functions

# Test specific module
cd lambda-functions && mvn test

# Package for deployment
cd lambda-functions && mvn clean package -DskipTests
```

### Infrastructure Commands
```bash
cd infrastructure
cdk diff             # Preview changes
cdk deploy           # Deploy to AWS
cdk destroy          # Delete stack (WARNING: destructive)
```

---

## Environment Configuration

### Frontend Development (.env)
```bash
cd frontend
cat > .env << EOF
VITE_API_BASE_URL=https://qhi4rns0b0.execute-api.us-west-2.amazonaws.com/prod/
VITE_COGNITO_USER_POOL_ID=us-west-2_uZiZuI4V3
VITE_COGNITO_CLIENT_ID=2r00a97s4ftjfoisdivk0ijj3u
VITE_AWS_REGION=us-west-2
EOF
```

### AWS Configuration
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-west-2
# Default output format: json
```

---

## Testing

### Backend Tests
```bash
# All tests
mvn test

# Specific module
cd models && mvn test

# Single test class
mvn test -Dtest=RecommendationEngineTest

# With coverage
mvn test jacoco:report
```

### Frontend Tests
```bash
cd frontend
npm run lint         # Lint checks
npm run type-check   # TypeScript checks (if configured)
```

### Manual API Testing

Use the Postman collection:
1. Import `Italy_Trip_Planner_API.postman_collection.json`
2. Set environment variables (API_BASE_URL, TOKEN)
3. Test all endpoints

---

## Troubleshooting

### Frontend won't start
```bash
# Check Node version
node --version  # Should be 20+

# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend build fails
```bash
# Check Java version
java --version  # Should be 17+

# Clean rebuild
mvn clean install -U

# If specific module fails
cd models && mvn clean install
cd ../common && mvn clean install
cd ../lambda-functions && mvn clean install
```

### Deployment fails
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Bootstrap CDK (first time)
cd infrastructure
cdk bootstrap

# Check for errors
cdk deploy --verbose
```

### CORS errors in browser
- Verify API Gateway CORS settings in `infrastructure/lib/infrastructure-stack.ts`
- Check Lambda responses include CORS headers
- Try in incognito mode to rule out caching

### Lambda timeout
- Increase timeout in CDK stack (default 10s → 30s)
- Check CloudWatch Logs for specific errors
- Optimize cold start performance

### CloudFront cache issues
```bash
# Invalidate cache
DISTRIBUTION_ID=<your-dist-id>
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id ${DISTRIBUTION_ID}
```

---

## Key Features Implementation

### Auto-Save
Changes automatically save 1 second after edits. Check browser console for:
```
[ItineraryContext] Auto-save triggered
[ItineraryContext] Itinerary saved successfully
```

### Geographic Coherence
Backend ensures each day only contains activities from ONE city. Prevents impossible itineraries like:
- ❌ Rome → Venice → Rome (6+ hours of travel)
- ✅ Rome only (realistic)

### Duplicate Prevention
Saving an itinerary with an existing name overwrites instead of creating duplicates. Uses case-insensitive name comparison.

### Undo/Redo
Full history tracking with 20-snapshot limit. Keyboard shortcuts:
- Cmd/Ctrl+Z: Undo
- Cmd/Ctrl+Shift+Z: Redo

---

## Production Deployment

**Current Production:**
- URL: https://d10xzq83e4ezkh.cloudfront.net
- API: https://qhi4rns0b0.execute-api.us-west-2.amazonaws.com/prod/
- Region: us-west-2 (Oregon)
- Account: 767397673118

**Last Deployed:** September 1, 2026

### Deployment Checklist
- [ ] Backend tests passing (`mvn test`)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Lambda package created (`mvn clean package`)
- [ ] Infrastructure deployed (`cdk deploy`)
- [ ] Dataset uploaded to S3
- [ ] Frontend synced to S3
- [ ] CloudFront cache invalidated
- [ ] Manual smoke test on production URL

---

## Cost Estimation

**Monthly costs** (assuming moderate usage):
- CloudFront: ~$1-5
- API Gateway: ~$3.50 per million requests
- Lambda: ~$0.20 per million requests
- S3: ~$0.50
- DynamoDB: ~$1-5 (depends on usage)
- Cognito: Free tier (up to 50k MAU)

**Total estimated:** $5-15/month for low-moderate traffic

---

## Security

- ✅ HTTPS everywhere via CloudFront
- ✅ Cognito-based authentication
- ✅ JWT token validation on protected endpoints
- ✅ IAM roles with least privilege
- ✅ S3 buckets not publicly writable
- ✅ CloudWatch Logs for audit trail
- ✅ Input validation on all API endpoints
- ✅ CORS configured for frontend domain only

---

## License

Proprietary and confidential.

---

## Support

For issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review CloudWatch Logs for errors
3. Check CloudFormation stack events
4. Verify AWS service limits

---

**Last Updated:** September 1, 2026
