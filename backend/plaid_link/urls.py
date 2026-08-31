from django.urls import re_path
from .views import (
    CreateLinkTokenView,
    ExchangePublicTokenView,
    InvestmentHoldingsView,
    InvestmentTransactionsView,
    PlaidItemListView,
)

urlpatterns = [
    re_path(r'^create_link_token/?$', CreateLinkTokenView.as_view(), name='create_link_token'),
    re_path(r'^exchange_public_token/?$', ExchangePublicTokenView.as_view(), name='exchange_public_token'),
    re_path(r'^holdings/?$', InvestmentHoldingsView.as_view(), name='investment_holdings'),
    re_path(r'^investment_transactions/?$', InvestmentTransactionsView.as_view(), name='investment_transactions'),
    re_path(r'^items/?$', PlaidItemListView.as_view(), name='plaid_items'),
]
