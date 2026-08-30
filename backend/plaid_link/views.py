import json
import datetime
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import plaid
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

from .plaid_client import get_plaid_client
from .models import PlaidItem


def parse_plaid_error(e: plaid.ApiException):
    """Helper to extract JSON error payload from Plaid ApiException."""
    try:
        if e.body:
            return json.loads(e.body)
    except Exception:
        pass
    return {"error_message": str(e)}


class CreateLinkTokenView(APIView):
    """
    Creates and returns a Plaid Link Token for frontend initialization.
    POST /api/plaid/create_link_token/
    """
    def post(self, request):
        user_id = str(request.user.id) if request.user and request.user.is_authenticated else "dev-user-001"
        client = get_plaid_client()

        link_request = LinkTokenCreateRequest(
            products=[Products("investments"), Products("transactions")],
            client_name="InvestmentTracker",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=user_id)
        )

        try:
            response = client.link_token_create(link_request)
            return Response({
                "link_token": response["link_token"],
                "expiration": response.get("expiration")
            }, status=status.HTTP_200_OK)
        except plaid.ApiException as e:
            return Response(parse_plaid_error(e), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error_message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExchangePublicTokenView(APIView):
    """
    Exchanges a public token received from Plaid Link for a persistent access token.
    POST /api/plaid/exchange_public_token/
    """
    def post(self, request):
        public_token = request.data.get('public_token')
        if not public_token:
            return Response(
                {"error_message": "public_token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        institution_id = request.data.get('institution_id')
        institution_name = request.data.get('institution_name')

        client = get_plaid_client()
        try:
            exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
            exchange_response = client.item_public_token_exchange(exchange_request)

            access_token = exchange_response['access_token']
            item_id = exchange_response['item_id']

            user = request.user if request.user and request.user.is_authenticated else None

            plaid_item, _ = PlaidItem.objects.update_or_create(
                item_id=item_id,
                defaults={
                    'user': user,
                    'access_token': access_token,
                    'institution_id': institution_id,
                    'institution_name': institution_name,
                }
            )

            return Response({
                "status": "success",
                "item_id": plaid_item.item_id,
                "institution_name": plaid_item.institution_name,
            }, status=status.HTTP_200_OK)
        except plaid.ApiException as e:
            return Response(parse_plaid_error(e), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error_message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvestmentHoldingsView(APIView):
    """
    Fetches investment holdings, securities, and account balances for linked accounts.
    GET /api/plaid/holdings/
    """
    def get(self, request):
        item_id = request.query_params.get('item_id')
        if item_id:
            items = PlaidItem.objects.filter(item_id=item_id)
        else:
            items = PlaidItem.objects.all()

        if not items.exists():
            return Response(
                {"error_message": "No linked Plaid accounts found. Please link an account first."},
                status=status.HTTP_404_NOT_FOUND
            )

        client = get_plaid_client()
        combined_holdings = []
        combined_accounts = []
        combined_securities = []

        try:
            for item in items:
                holdings_request = InvestmentsHoldingsGetRequest(access_token=item.access_token)
                response = client.investments_holdings_get(holdings_request)
                res_dict = response.to_dict()

                for acc in res_dict.get('accounts', []):
                    acc['item_id'] = item.item_id
                    acc['institution_name'] = item.institution_name
                    combined_accounts.append(acc)

                combined_holdings.extend(res_dict.get('holdings', []))
                combined_securities.extend(res_dict.get('securities', []))

            # Deduplicate securities by security_id
            unique_securities = {s['security_id']: s for s in combined_securities}.values()

            return Response({
                "accounts": combined_accounts,
                "holdings": combined_holdings,
                "securities": list(unique_securities)
            }, status=status.HTTP_200_OK)
        except plaid.ApiException as e:
            return Response(parse_plaid_error(e), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error_message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvestmentTransactionsView(APIView):
    """
    Fetches investment transactions (buys, sells, dividends, transfers).
    GET /api/plaid/investment_transactions/
    """
    def get(self, request):
        item_id = request.query_params.get('item_id')
        if item_id:
            items = PlaidItem.objects.filter(item_id=item_id)
        else:
            items = PlaidItem.objects.all()

        if not items.exists():
            return Response(
                {"error_message": "No linked Plaid accounts found."},
                status=status.HTTP_404_NOT_FOUND
            )

        today = datetime.date.today()
        # Default to past 90 days if not provided
        start_date_str = request.query_params.get('start_date', (today - datetime.timedelta(days=90)).isoformat())
        end_date_str = request.query_params.get('end_date', today.isoformat())

        try:
            start_date = datetime.date.fromisoformat(start_date_str)
            end_date = datetime.date.fromisoformat(end_date_str)
        except ValueError:
            return Response(
                {"error_message": "Dates must be formatted as YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        client = get_plaid_client()
        combined_transactions = []
        combined_securities = []

        try:
            for item in items:
                tx_request = InvestmentsTransactionsGetRequest(
                    access_token=item.access_token,
                    start_date=start_date,
                    end_date=end_date
                )
                response = client.investments_transactions_get(tx_request)
                res_dict = response.to_dict()

                combined_transactions.extend(res_dict.get('investment_transactions', []))
                combined_securities.extend(res_dict.get('securities', []))

            unique_securities = {s['security_id']: s for s in combined_securities}.values()

            return Response({
                "investment_transactions": combined_transactions,
                "securities": list(unique_securities),
                "total_count": len(combined_transactions)
            }, status=status.HTTP_200_OK)
        except plaid.ApiException as e:
            return Response(parse_plaid_error(e), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error_message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PlaidItemListView(APIView):
    """
    Lists all connected Plaid Items or removes an item.
    GET /api/plaid/items/
    DELETE /api/plaid/items/?item_id=<item_id>
    """
    def get(self, request):
        items = PlaidItem.objects.all()
        data = [
            {
                "item_id": item.item_id,
                "institution_id": item.institution_id,
                "institution_name": item.institution_name,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
            }
            for item in items
        ]
        return Response({"items": data, "count": len(data)}, status=status.HTTP_200_OK)

    def delete(self, request):
        item_id = request.query_params.get('item_id') or request.data.get('item_id')
        if not item_id:
            return Response(
                {"error_message": "item_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            item = PlaidItem.objects.get(item_id=item_id)
            client = get_plaid_client()
            try:
                client.item_remove(ItemRemoveRequest(access_token=item.access_token))
            except Exception:
                pass  # Proceed to delete local record even if remote already invalid

            item.delete()
            return Response({"status": "deleted", "item_id": item_id}, status=status.HTTP_200_OK)
        except PlaidItem.DoesNotExist:
            return Response(
                {"error_message": f"Item with id {item_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )