import os

# Resolve path relative to this config file's location
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Base configuration paths
DB_PATH = os.path.join(PROJECT_ROOT, 'data', 'campaigns.db')
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'data', 'output')
