import os
import plaid
from plaid.api import plaid_api
from django.conf import settings


def get_plaid_environment():
    """
    Returns Plaid environment host enum based on settings or env var.
    """
    env = getattr(settings, 'PLAID_ENV', os.getenv('PLAID_ENV', 'sandbox')).lower()
    if env == 'production':
        return plaid.Environment.Production
    return plaid.Environment.Sandbox


def get_plaid_client():
    """
    Returns an authenticated PlaidApi client instance.
    """
    client_id = getattr(settings, 'PLAID_CLIENT_ID', os.getenv('PLAID_CLIENT_ID', ''))
    secret = getattr(settings, 'PLAID_SECRET', os.getenv('PLAID_SECRET', ''))

    configuration = plaid.Configuration(
        host=get_plaid_environment(),
        api_key={
            'clientId': client_id,
            'secret': secret,
        }
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)
