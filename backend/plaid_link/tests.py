from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from plaid_link.models import PlaidItem


class PlaidApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_exchange_missing_public_token(self):
        response = self.client.post('/api/plaid/exchange_public_token/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("public_token is required", response.data.get("error_message", ""))

    def test_holdings_without_items(self):
        response = self.client.get('/api/plaid/holdings/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_items_list(self):
        response = self.client.get('/api/plaid/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("count"), 0)

    def test_items_list_with_data(self):
        PlaidItem.objects.create(
            item_id="test_item_123",
            access_token="access-sandbox-123",
            institution_name="First Platypus Bank"
        )
        response = self.client.get('/api/plaid/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["items"][0]["institution_name"], "First Platypus Bank")
