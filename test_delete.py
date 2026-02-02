import requests
import requests
import io

API_URL = "http://localhost:8000"
USER_ID = "test_user_delete_check"

def test_delete_flow():
    # 1. Upload
    print("1. Uploading dummy report...")
    files = {'file': ('test.csv', 'date,revenue,expense\n2023-01-01,100,50')}
    headers = {'user-id': USER_ID}
    res = requests.post(f"{API_URL}/upload", files=files, headers=headers)
    if res.status_code != 200:
        print(f"Upload failed: {res.text}")
        return
    
    print("Upload success.")
    
    # 2. List reports
    print("2. Listing reports...")
    res = requests.get(f"{API_URL}/reports", headers=headers)
    reports = res.json()
    if not reports:
        print("No reports found!")
        return
        
    report_id = reports[0]['id']
    print(f"Found report ID: {report_id}")
    
    # 3. Delete report
    print(f"3. Deleting report {report_id}...")
    res = requests.delete(f"{API_URL}/reports/{report_id}")
    print(f"Delete status: {res.status_code}")
    
    # 4. Verify deletion
    print("4. Verifying deletion...")
    res = requests.get(f"{API_URL}/reports", headers=headers)
    reports_after = res.json()
    
    found = any(r['id'] == report_id for r in reports_after)
    if found:
        print("FAIL: Report still exists in DB!")
    else:
        print("PASS: Report successfully deleted from DB.")

if __name__ == "__main__":
    test_delete_flow()
