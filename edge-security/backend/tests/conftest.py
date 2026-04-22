"""
Pytest configuration — adds backend/api to sys.path so tests can import
the project modules directly without installing them as a package.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
