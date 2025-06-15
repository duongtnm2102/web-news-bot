import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', 8080)}"
backlog = 2048

# Worker processes  
workers = 1  # Single worker for 512MB RAM
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Restart workers
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "e-con-news-terminal"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
