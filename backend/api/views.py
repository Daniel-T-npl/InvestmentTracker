from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

class HelloWorldView(APIView):
    """
    Returns a simple greeting and system status for the InvestmentTracker frontend.
    """
    def get(self, request):
        return Response({
            "message": "Hello from Django Backend!",
            "status": "online",
            "version": "1.0.0",
            "timestamp": timezone.now().isoformat()
        })

class HealthCheckView(APIView):
    """
    Simple health check endpoint.
    """
    def get(self, request):
        return Response({"status": "healthy"})
