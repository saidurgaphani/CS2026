import requests
import time

url = "https://cs2026.onrender.com/health"
print(f"Testing {url}...")
try:
    start = time.time()
    response = requests.get(url, timeout=15)
    end = time.time()
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print(f"Time taken: {end - start:.2f}s")
except Exception as e:
    print(f"Error: {e}")
