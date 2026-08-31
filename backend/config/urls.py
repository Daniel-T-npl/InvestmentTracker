from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_INDEX = BASE_DIR.parent / 'frontend' / 'dist' / 'index.html'

def index_view(request):
    if FRONTEND_INDEX.exists():
        with open(FRONTEND_INDEX, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse("Frontend build not found. Run 'npm run build' in frontend directory.", status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/plaid/', include('plaid_link.urls')),
    re_path(r'^(?!api|admin|static|assets).*$', index_view),
]

