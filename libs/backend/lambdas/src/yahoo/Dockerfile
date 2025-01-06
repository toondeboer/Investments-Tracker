# Use the official AWS Lambda base image for Node.js
FROM public.ecr.aws/lambda/nodejs:16

# Copy the application code
COPY index.mjs ${LAMBDA_TASK_ROOT}

# Set the Lambda function handler (file_name.function_name)
CMD ["index.handler"]
