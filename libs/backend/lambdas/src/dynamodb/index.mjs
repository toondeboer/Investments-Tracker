import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';

let dynamoDB;

// Determine the current environment (default to 'dev')
const currentEnv = process.env.ENVIRONMENT || 'dev';

if (currentEnv === 'dev') {
  console.log('Using local DynamoDB instance...');
  dynamoDB = new DynamoDBDocument(
    new DynamoDB({
      endpoint: 'http://host.docker.internal:8000',
      region: 'us-east-1', // Use the same region as your local setup
      accessKeyId: 'fakeAccessKeyId', // Placeholder for local testing
      secretAccessKey: 'fakeSecretAccessKey', // Placeholder for local testing
    })
  );
} else if (currentEnv === 'prod') {
  console.log('Using AWS DynamoDB...');
  dynamoDB = DynamoDBDocument.from(new DynamoDB());
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const tableName = 'Investment_Tracker';

/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */
export const handler = async (event) => {
  console.log('Received event', event);

  let body;
  let statusCode = '200';

  let userId;

  try {
    // Extract JWT from Authorization header
    const token = event.headers.Authorization || event.headers.authorization;
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized: Missing token' }),
      };
    }

    // Decode and verify the token
    const decodedToken = jwt.decode(token);

    // Extract user information (e.g., sub, email, or custom claims)
    userId = decodedToken.sub; // Cognito User Pool ID
  } catch (error) {
    return {
      statusCode: '401',
      body: err.message,
      headers,
    };
  }

  try {
    switch (event.httpMethod) {
      case 'GET':
        body = (
          await dynamoDB.query({
            TableName: tableName,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
              ':userId': userId,
            },
          })
        ).Items[0].transactions;
        break;
      case 'PUT':
        body = (
          await dynamoDB.update({
            TableName: tableName,
            Key: {
              userId: userId,
            },
            UpdateExpression: 'set transactions = :t',
            ExpressionAttributeValues: {
              ':t': event.body,
            },
            ReturnValues: 'ALL_NEW',
          })
        ).Attributes.transactions;
        break;
      case 'OPTIONS':
        break;
      default:
        throw new Error(`Unsupported method "${event.httpMethod}"`);
    }
  } catch (err) {
    statusCode = '400';
    body = err.message;
    console.log(err);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
