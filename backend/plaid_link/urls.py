from django.urls import path
from .views import (
    CreateLinkTokenView,
    ExchangePublicTokenView,
    InvestmentHoldingsView,
    InvestmentTransactionsView,
    PlaidItemListView,
)

urlpatterns = [
    path('create_link_token/', CreateLinkTokenView.as_view(), name='create_link_token'),
    path('exchange_public_token/', ExchangePublicTokenView.as_view(), name='exchange_public_token'),
    path('holdings/', InvestmentHoldingsView.as_view(), name='investment_holdings'),
    path('investment_transactions/', InvestmentTransactionsView.as_view(), name='investment_transactions'),
    path('items/', PlaidItemListView.as_view(), name='plaid_items'),
]
