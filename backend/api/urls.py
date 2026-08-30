from django.urls import path
from .views import HelloWorldView, HealthCheckView
from django.contrib import admin
from django.conf.urls import include

urlpatterns = [
    path('hello/', HelloWorldView.as_view(), name='hello_world'),
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('', include('plaid_link.urls')),
]
