import os
from django.core.management.base import BaseCommand
from plaid_link.models import PlaidItem


class Command(BaseCommand):
    help = "Seed linked Plaid item into database from environment variables or arguments"

    def add_arguments(self, parser):
        parser.add_argument('--item_id', type=str, help='Plaid Item ID')
        parser.add_argument('--access_token', type=str, help='Plaid Access Token')
        parser.add_argument('--institution_name', type=str, default='Robinhood', help='Institution Name')
        parser.add_argument('--institution_id', type=str, default='ins_54', help='Institution ID')

    def handle(self, *args, **options):
        item_id = options.get('item_id') or os.getenv('PLAID_INITIAL_ITEM_ID')
        access_token = options.get('access_token') or os.getenv('PLAID_INITIAL_ACCESS_TOKEN')
        institution_name = options.get('institution_name') or os.getenv('PLAID_INITIAL_INSTITUTION_NAME', 'Robinhood')
        institution_id = options.get('institution_id') or os.getenv('PLAID_INITIAL_INSTITUTION_ID', 'ins_54')

        if not item_id or not access_token:
            self.stdout.write(self.style.WARNING(
                "No PLAID_INITIAL_ITEM_ID or PLAID_INITIAL_ACCESS_TOKEN provided. Skipping seed."
            ))
            return

        plaid_item, created = PlaidItem.objects.update_or_create(
            item_id=item_id,
            defaults={
                'access_token': access_token,
                'institution_id': institution_id,
                'institution_name': institution_name,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(
                f"Successfully seeded Plaid item for {institution_name} ({item_id})"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Successfully updated Plaid item for {institution_name} ({item_id})"
            ))
