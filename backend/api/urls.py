from django.urls import path
from .views import HelloWorldView, HealthCheckView

urlpatterns = [
    path('hello/', HelloWorldView.as_view(), name='hello_world'),
    path('health/', HealthCheckView.as_view(), name='health_check'),
]
