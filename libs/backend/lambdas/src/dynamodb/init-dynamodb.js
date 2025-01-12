import { CreateTableCommand, DynamoDB } from '@aws-sdk/client-dynamodb';

// Setup DynamoDB Local connection
const dynamoDB = new DynamoDB({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1', // Use the same region as your local setup
  accessKeyId: 'fakeAccessKeyId', // Placeholder for local testing
  secretAccessKey: 'fakeSecretAccessKey', // Placeholder for local testing
});

const tableName = 'table';

const createTable = async () => {
  try {
    const command = new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: 'partitionKey', AttributeType: 'S' },
      ],
      KeySchema: [{ AttributeName: 'partitionKey', KeyType: 'HASH' }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    });

    const result = await dynamoDB.send(command);
    console.log(`Table "${tableName}" created successfully:`, result);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`Table "${tableName}" already exists.`);
    } else {
      console.error('Error creating table:', error);
    }
  }
};

createTable();
