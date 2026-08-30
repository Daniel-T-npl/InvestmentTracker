"""
URL configuration for InvestmentTracker backend project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/plaid/', include('plaid_link.urls')),
]
