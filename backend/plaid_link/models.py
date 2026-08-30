from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class PlaidItem(models.Model):
    """
    Represents a linked financial institution login (Plaid Item).
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='plaid_items',
        null=True,
        blank=True
    )
    item_id = models.CharField(max_length=255, unique=True)
    access_token = models.CharField(max_length=255)
    institution_id = models.CharField(max_length=100, null=True, blank=True)
    institution_name = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        name = self.institution_name or 'Plaid Item'
        return f"{name} ({self.item_id})"
