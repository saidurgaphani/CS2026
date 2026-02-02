import requests
import json
import sys

def test_chat_stream():
    url = "http://localhost:8000/analytics/chat"
    payload = {
        "messages": [{"role": "user", "content": "hello world python"}],
        "user_id": "test_stream_user",
        "chat_id": "test_chat_1",
        "title": "Test Chat"
    }
    
    print("Sending request...")
    try:
        with requests.post(url, json=payload, stream=True) as r:
            print(f"Status Code: {r.status_code}")
            if r.status_code != 200:
                print(f"Error: {r.text}")
                return

            print("--- Stream Start ---")
            for line in r.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    print(f"Received chunk: {decoded}")
                    if decoded.startswith('data: '):
                        try:
                            data = json.loads(decoded[6:])
                            print(f"Parsed Content: {data.get('content')}")
                        except Exception as e:
                            print(f"JSON Parse Error: {e}")
            print("--- Stream End ---")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_chat_stream()
