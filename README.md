# Investments Tracker

Visit the website at [investments-tracker.toondeboer.com](https://investments-tracker.toondeboer.com/)

## Start the backend
To start the database:
``` 
docker-compose up
```
To initialize the dynamodb table locally (Only do once):
```
node libs/backend/lambdas/src/dynamodb/init-dynamodb.js
```


To start the lambda functions locally, you need to install the AWS SAM CLI. If you have Homebrew installed, you can do this by running:
```
brew install aws-sam-cli
```

Then run the following commands in the root of the project:
```
sam build
sam local start-api
```


## Start the frontend

To start the development server run `nx serve frontend`. Open your browser and navigate to http://localhost:4200/. Happy coding!

