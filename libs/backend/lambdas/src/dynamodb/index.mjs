import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

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
  let body;
  let statusCode = '200';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  console.log('Received event', event)

  try {
    switch (event.httpMethod) {
      case 'DELETE':
        body = await dynamoDB.delete(JSON.parse(event.body));
        break;
      case 'GET':
        body = await dynamoDB.scan({ TableName: 'table' });
        break;
      case 'POST':
        body = await dynamoDB.put(JSON.parse(event.body));
        break;
      case 'PUT':
        body = await dynamoDB.update(JSON.parse(event.body));
        break;
      case 'OPTIONS':
        break;
      default:
        throw new Error(`Unsupported method "${event.httpMethod}"`);
    }
  } catch (err) {
    statusCode = '400';
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
