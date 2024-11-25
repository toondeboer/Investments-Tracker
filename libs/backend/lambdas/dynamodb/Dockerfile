# Use the official AWS Lambda base image for Node.js
FROM public.ecr.aws/lambda/nodejs:16

# Copy the application code
COPY index.mjs ${LAMBDA_TASK_ROOT}

# Install dependencies
COPY package.json ${LAMBDA_TASK_ROOT}
RUN npm install

# Set the Lambda function handler (file_name.function_name)
CMD ["index.handler"]
