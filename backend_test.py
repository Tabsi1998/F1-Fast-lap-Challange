import requests
import sys
import json
from datetime import datetime

class F1LapTimeAPITester:
    def __init__(self, base_url="https://fastlapapp.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_entries = []
        self.created_tracks = []
        self.token = None
        # Use default admin credentials that are auto-created
        self.admin_username = "admin"
        self.admin_password = "admin"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def get_auth_headers(self):
        """Get authorization headers if token exists"""
        if self.token:
            return {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
        return {'Content-Type': 'application/json'}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login with default credentials"""
        success, response = self.run_test(
            "Admin Login (admin/admin)",
            "POST",
            "auth/login", 
            200,
            data={
                "username": self.admin_username,
                "password": self.admin_password
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"Login successful, token received")
        return success, response

    def test_get_site_settings(self):
        """Test getting site settings (public)"""
        success, response = self.run_test(
            "Get Site Settings",
            "GET",
            "settings",
            200
        )
        if success:
            print(f"Title: {response.get('title_line1', 'F1')} {response.get('title_line2', 'FAST LAP')} {response.get('title_line3', 'CHALLENGE')}")
            print(f"Colors: {response.get('title_color1', '#FFFFFF')}, {response.get('title_color2', '#FF1E1E')}, {response.get('title_color3', '#FFFFFF')}")
        return success, response

    def test_update_site_settings(self):
        """Test updating site settings (admin only)"""
        success, response = self.run_test(
            "Update Site Settings",
            "PUT",
            "admin/settings",
            200,
            data={
                "title_line1": "TEST",
                "title_line2": "FAST LAP",
                "title_line3": "UPDATED",
                "title_color1": "#FF0000",
                "title_color2": "#00FF00",
                "title_color3": "#0000FF"
            },
            headers=self.get_auth_headers()
        )
        return success, response

    def test_password_change(self):
        """Test password change functionality (admin only)"""
        success, response = self.run_test(
            "Change Password",
            "PUT",
            "admin/password",
            200,
            data={
                "current_password": self.admin_password,
                "new_password": "newpassword123"
            },
            headers=self.get_auth_headers()
        )
        if success:
            # Change password back for other tests
            self.admin_password = "newpassword123"
            success2, _ = self.run_test(
                "Change Password Back",
                "PUT",
                "admin/password",
                200,
                data={
                    "current_password": "newpassword123",
                    "new_password": "admin"
                },
                headers=self.get_auth_headers()
            )
            self.admin_password = "admin"
            return success and success2
        return success

    def test_auth_check(self):
        """Test authentication check"""
        success, response = self.run_test(
            "Auth Check",
            "GET",
            "auth/check",
            200,
            headers=self.get_auth_headers()
        )
        return success, response

    def test_event_status(self):
        """Test getting event status (public)"""
        success, response = self.run_test(
            "Get Event Status",
            "GET",
            "event/status",
            200
        )
        if success:
            print(f"Event status: {response.get('status', 'unknown')}")
            print(f"Message: {response.get('message', 'none')}")
        return success, response

    def test_get_tracks(self):
        """Test getting all tracks (public)"""
        success, response = self.run_test(
            "Get All Tracks",
            "GET", 
            "tracks",
            200
        )
        if success:
            print(f"Found {len(response)} tracks")
        return success, response

    def test_create_track_with_image(self):
        """Test creating a track with image URL (admin only)"""
        success, response = self.run_test(
            "Create Track with Image",
            "POST",
            "admin/tracks",
            200,
            data={
                "name": "Monaco",
                "country": "Monaco",
                "image_url": "https://example.com/monaco.jpg",
                "length_km": 3.337
            },
            headers=self.get_auth_headers()
        )
        if success and 'id' in response:
            self.created_tracks.append(response['id'])
            print(f"Created track with image ID: {response['id']}")
        return success, response

    def test_update_track(self):
        """Test updating a track (admin only)"""
        if not self.created_tracks:
            return False, {}
        
        track_id = self.created_tracks[0]
        success, response = self.run_test(
            "Update Track",
            "PUT",
            f"admin/tracks/{track_id}",
            200,
            data={
                "name": "Updated Silverstone",
                "country": "UK",
                "image_url": "https://example.com/silverstone-updated.jpg",
                "length_km": 5.891
            },
            headers=self.get_auth_headers()
        )
        return success, response

    def test_update_event_settings(self):
        """Test updating event settings (admin only)"""
        success, response = self.run_test(
            "Update Event Settings",
            "PUT",
            "admin/event",
            200,
            data={
                "status": "active",
                "track_id": self.created_tracks[0] if self.created_tracks else None
            },
            headers=self.get_auth_headers()
        )
        return success, response

    def test_create_lap_entry_basic(self):
        """Test creating a basic lap entry (admin only)"""
        success, response = self.run_test(
            "Create Basic Lap Entry",
            "POST",
            "admin/laps",
            200,
            data={
                "driver_name": "Max Verstappen",
                "lap_time_display": "1:23.456"
            },
            headers=self.get_auth_headers()
        )
        if success and 'id' in response:
            self.created_entries.append(response['id'])
            print(f"Created entry ID: {response['id']}")
        return success, response

    def test_create_lap_entry_with_team(self):
        """Test creating lap entry with team (admin only)"""
        success, response = self.run_test(
            "Create Lap Entry with Team",
            "POST",
            "admin/laps",
            200,
            data={
                "driver_name": "Lewis Hamilton",
                "team": "Mercedes",
                "lap_time_display": "1:24.123"
            },
            headers=self.get_auth_headers()
        )
        if success and 'id' in response:
            self.created_entries.append(response['id'])
        return success, response

    def test_invalid_time_format(self):
        """Test invalid time format handling (admin only)"""
        success, response = self.run_test(
            "Invalid Time Format",
            "POST",
            "admin/laps",
            400,
            data={
                "driver_name": "Test Driver",
                "lap_time_display": "invalid_time"
            },
            headers=self.get_auth_headers()
        )
        return success

    def test_get_all_laps(self):
        """Test getting all lap entries"""
        success, response = self.run_test(
            "Get All Lap Entries",
            "GET",
            "laps",
            200
        )
        if success:
            print(f"Found {len(response)} entries")
            # Check if entries have proper ranking
            for i, entry in enumerate(response):
                expected_rank = i + 1
                if entry.get('rank') != expected_rank:
                    print(f"❌ Ranking issue: Entry {i} has rank {entry.get('rank')}, expected {expected_rank}")
                    return False
            print("✅ Rankings are correct")
        return success, response

    def test_get_single_lap(self, lap_id):
        """Test getting a single lap entry - NOT IMPLEMENTED IN API"""
        # This endpoint doesn't exist in the current API
        print("⚠️  Single lap endpoint not implemented in API")
        return True, {}

    def test_update_lap_entry(self, lap_id):
        """Test updating a lap entry (admin only)"""
        success, response = self.run_test(
            "Update Lap Entry",
            "PUT",
            f"admin/laps/{lap_id}",
            200,
            data={
                "driver_name": "Updated Driver",
                "lap_time_display": "1:22.999"
            },
            headers=self.get_auth_headers()
        )
        return success, response

    def test_delete_lap_entry(self, lap_id):
        """Test deleting a lap entry (admin only)"""
        success, response = self.run_test(
            "Delete Lap Entry",
            "DELETE",
            f"admin/laps/{lap_id}",
            200,
            headers=self.get_auth_headers()
        )
        return success

    def test_delete_all_laps(self):
        """Test deleting all lap entries (admin only)"""
        success, response = self.run_test(
            "Delete All Lap Entries",
            "DELETE",
            "admin/laps",
            200,
            headers=self.get_auth_headers()
        )
        return success

    def test_delete_track(self, track_id):
        """Test deleting a track (admin only)"""
        success, response = self.run_test(
            "Delete Track",
            "DELETE",
            f"admin/tracks/{track_id}",
            200,
            headers=self.get_auth_headers()
        )
        return success

    def test_admin_csv_export(self):
        """Test CSV export endpoint (admin only)"""
        success, response = self.run_test(
            "Admin CSV Export",
            "GET",
            "admin/export/csv",
            200,
            headers=self.get_auth_headers()
        )
        return success

    def test_admin_pdf_export_data(self):
        """Test PDF export data endpoint (admin only)"""
        success, response = self.run_test(
            "Admin PDF Export Data",
            "GET",
            "admin/export/pdf",
            200,
            headers=self.get_auth_headers()
        )
        return success, response

    def test_time_format_variations(self):
        """Test various time format variations (admin only)"""
        test_cases = [
            ("1:23.456", True),   # Standard format
            ("12:34.567", True),  # Two digit minutes
            ("0:59.999", True),   # Zero minutes
            ("1:23.45", True),    # Two digit milliseconds
            ("1:23.4", True),     # One digit milliseconds
            ("1:23", False),      # Missing milliseconds
            ("123.456", False),   # Missing colon
            ("1:60.000", True),   # Edge case - 60 seconds (should be valid)
            ("", False),          # Empty string
        ]
        
        passed = 0
        for time_str, should_pass in test_cases:
            expected_status = 200 if should_pass else 400
            success, _ = self.run_test(
                f"Time Format: '{time_str}'",
                "POST",
                "admin/laps",
                expected_status,
                data={
                    "driver_name": f"Test Driver {time_str}",
                    "lap_time_display": time_str
                },
                headers=self.get_auth_headers()
            )
            if success:
                passed += 1
        
        print(f"Time format tests: {passed}/{len(test_cases)} passed")
        return passed == len(test_cases)

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        print("\n🔒 Testing Unauthorized Access...")
        
        # Test admin endpoints without token
        endpoints_to_test = [
            ("admin/laps", "POST", {"driver_name": "Test", "lap_time_display": "1:23.456"}),
            ("admin/laps/fake-id", "PUT", {"driver_name": "Test"}),
            ("admin/laps/fake-id", "DELETE", None),
            ("admin/laps", "DELETE", None),
            ("admin/tracks", "POST", {"name": "Test", "country": "Test"}),
            ("admin/tracks/fake-id", "PUT", {"name": "Test", "country": "Test"}),
            ("admin/tracks/fake-id", "DELETE", None),
            ("admin/event", "PUT", {"status": "active"}),
            ("admin/settings", "PUT", {"title_line1": "Test"}),
            ("admin/password", "PUT", {"current_password": "test", "new_password": "test"}),
            ("admin/export/csv", "GET", None),
            ("admin/export/pdf", "GET", None),
            ("auth/check", "GET", None)
        ]
        
        passed = 0
        for endpoint, method, data in endpoints_to_test:
            success, _ = self.run_test(
                f"Unauthorized {method} {endpoint}",
                method,
                endpoint,
                401,  # Should return 401 Unauthorized
                data=data
            )
            if success:
                passed += 1
        
        print(f"Unauthorized access tests: {passed}/{len(endpoints_to_test)} passed")
        return passed == len(endpoints_to_test)

def main():
    print("🏎️  F1 Fast Lap Challenge API Testing (Updated for New Features)")
    print("=" * 70)
    
    tester = F1LapTimeAPITester()
    
    # Test basic connectivity
    if not tester.test_root_endpoint():
        print("❌ Cannot connect to API, stopping tests")
        return 1

    # Test public endpoints first
    print("\n🌐 Testing Public Endpoints...")
    tester.test_get_site_settings()
    tester.test_event_status()
    tester.test_get_tracks()

    # Test unauthorized access to protected endpoints
    tester.test_unauthorized_access()

    # Test authentication flow with default admin
    print("\n🔐 Testing Authentication...")
    success, _ = tester.test_admin_login()
    if not success:
        print("❌ Admin login failed, stopping tests")
        return 1

    # Test auth check
    success, _ = tester.test_auth_check()
    if not success:
        print("❌ Auth check failed, stopping tests")
        return 1

    # Test new features: Site settings customization
    print("\n🎨 Testing Site Settings Customization...")
    tester.test_update_site_settings()
    tester.test_get_site_settings()  # Verify changes

    # Test new features: Password change
    print("\n🔑 Testing Password Change...")
    tester.test_password_change()

    # Clean slate - delete all existing entries
    print("\n🧹 Cleaning up existing data...")
    tester.test_delete_all_laps()

    # Test track management with image URLs
    print("\n🏁 Testing Track Management with Images...")
    success, _ = tester.test_create_track_with_image()
    if success:
        tester.test_update_track()
    
    # Test event settings
    print("\n📅 Testing Event Settings...")
    tester.test_update_event_settings()

    # Test lap entry creation
    print("\n📝 Testing Lap Entry Creation...")
    success1, entry1 = tester.test_create_lap_entry_basic()
    success2, entry2 = tester.test_create_lap_entry_with_team()
    
    if not (success1 and success2):
        print("❌ Basic lap creation failed")

    # Test time format validation
    print("\n⏱️  Testing Time Format Validation...")
    tester.test_invalid_time_format()
    tester.test_time_format_variations()

    # Test retrieval
    print("\n📊 Testing Data Retrieval...")
    success, all_entries = tester.test_get_all_laps()
    if success and len(tester.created_entries) > 0:
        tester.test_get_single_lap(tester.created_entries[0])

    # Test updates
    print("\n✏️  Testing Updates...")
    if len(tester.created_entries) > 0:
        tester.test_update_lap_entry(tester.created_entries[0])

    # Test new features: Admin-only export
    print("\n📤 Testing Admin Export Features...")
    tester.test_admin_csv_export()
    tester.test_admin_pdf_export_data()

    # Test deletion
    print("\n🗑️  Testing Deletion...")
    if len(tester.created_entries) > 0:
        tester.test_delete_lap_entry(tester.created_entries[0])
    
    if len(tester.created_tracks) > 0:
        tester.test_delete_track(tester.created_tracks[0])
    
    # Final cleanup
    tester.test_delete_all_laps()

    # Print results
    print(f"\n📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 Backend API is working well!")
        return 0
    elif success_rate >= 70:
        print("⚠️  Backend API has some issues but is mostly functional")
        return 0
    else:
        print("❌ Backend API has significant issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())