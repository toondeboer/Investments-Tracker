import os

# Module-level cache: populated on first lookup, reused across warm-start
# invocations (mirrors the JWKS cache in shared/auth.py). Keyed by SSM param name.
_cache: dict[str, str] = {}


def _get_secret(env_var: str, param_env_var: str) -> str:
    """Resolve a secret from an env var first, then SSM Parameter Store.

    Resolution order:
      1. ``env_var`` (e.g. ``OPENAI_API_KEY``) — used for local dev / `sam local`,
         where SSM isn't reachable.
      2. The SSM Parameter Store SecureString whose name is held in
         ``param_env_var`` (prod). Standard parameters + the AWS-managed
         ``aws/ssm`` key are free, keeping idle cost at zero.

    Raises RuntimeError if neither is configured.
    """
    direct = os.environ.get(env_var)
    if direct:
        return direct

    param_name = os.environ.get(param_env_var)
    if param_name:
        if param_name in _cache:
            return _cache[param_name]
        import boto3  # provided by the Lambda runtime

        ssm = boto3.client('ssm')
        resp = ssm.get_parameter(Name=param_name, WithDecryption=True)
        value = resp['Parameter']['Value']
        _cache[param_name] = value
        return value

    raise RuntimeError(
        f'No secret configured: set {env_var} or {param_env_var}'
    )


def get_openai_api_key() -> str:
    """Return the OpenAI API key (env var ``OPENAI_API_KEY`` or SSM)."""
    return _get_secret('OPENAI_API_KEY', 'OPENAI_PARAM_NAME')


def get_stripe_secret_key() -> str:
    """Return the Stripe secret key (env var ``STRIPE_SECRET_KEY`` or SSM)."""
    return _get_secret('STRIPE_SECRET_KEY', 'STRIPE_SECRET_PARAM_NAME')


def get_stripe_webhook_secret() -> str:
    """Return the Stripe webhook signing secret (env var or SSM)."""
    return _get_secret('STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_PARAM_NAME')
