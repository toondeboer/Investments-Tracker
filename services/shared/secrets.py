import os

# Module-level cache: populated on first lookup, reused across warm-start
# invocations (mirrors the JWKS cache in shared/auth.py).
_openai_api_key: str | None = None


def get_openai_api_key() -> str:
    """Return the OpenAI API key.

    Resolution order:
      1. ``OPENAI_API_KEY`` env var — used for local dev / `sam local`, where
         SSM isn't reachable.
      2. The SSM Parameter Store SecureString named by ``OPENAI_PARAM_NAME``
         (prod). Standard parameters + the AWS-managed ``aws/ssm`` key are free,
         which keeps the idle cost at zero.

    Raises RuntimeError if neither is configured.
    """
    global _openai_api_key
    if _openai_api_key:
        return _openai_api_key

    env_key = os.environ.get('OPENAI_API_KEY')
    if env_key:
        _openai_api_key = env_key
        return _openai_api_key

    param_name = os.environ.get('OPENAI_PARAM_NAME')
    if param_name:
        import boto3  # provided by the Lambda runtime

        ssm = boto3.client('ssm')
        resp = ssm.get_parameter(Name=param_name, WithDecryption=True)
        _openai_api_key = resp['Parameter']['Value']
        return _openai_api_key

    raise RuntimeError(
        'No OpenAI API key configured: set OPENAI_API_KEY or OPENAI_PARAM_NAME'
    )
