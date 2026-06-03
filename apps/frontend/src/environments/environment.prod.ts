export const environment = {
  production: true,
  baseUrl: 'https://sailor.toondeboer.com',
  yahooLambdaUrl:
    'https://03y9xjgaaj.execute-api.us-east-1.amazonaws.com/prod/yahoo_finance',
  dynamoDBLambdaUrl:
    'https://03y9xjgaaj.execute-api.us-east-1.amazonaws.com/prod/microservice',
  captainLambdaUrl:
    'https://03y9xjgaaj.execute-api.us-east-1.amazonaws.com/prod/captain',
  cognito: {
    userPoolId: 'us-east-1_liCB4LgDE',
    clientId: '3o34bbl92faeo9ljo11eebtim2',
  },
};
