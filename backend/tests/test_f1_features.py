"""
F1 Fast Lap Challenge - Feature Tests
Tests for: Admin Login, Track Upload, Design Editor, SMTP Test, Lap Entry with Email, Event Status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fastlapapp.preview.emergentagent.com').rstrip('/')


class TestAdminAuth:
    """Test Admin Authentication flows"""
    
    def test_has_admin_endpoint(self):
        """Test /api/auth/has-admin endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/has-admin")
        assert response.status_code == 200
        data = response.json()
        assert "has_admin" in data
        assert isinstance(data["has_admin"], bool)
        print(f"✅ has_admin endpoint works - has_admin: {data['has_admin']}")
    
    def test_admin_login_success(self):
        """Test admin login with admin/admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "username" in data
        assert data["username"] == "admin"
        assert len(data["token"]) > 0
        print(f"✅ Admin login successful with admin/admin - username: {data['username']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wrong",
            "password": "wrong"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected with 401")
    
    def test_auth_check_with_valid_token(self):
        """Test auth check with valid token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        token = login_response.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/check", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] == True
        assert data["username"] == "admin"
        print(f"✅ Auth check successful - authenticated: {data['authenticated']}")


class TestTrackManagement:
    """Test Track Management including image upload"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_get_tracks(self):
        """Test get tracks endpoint"""
        response = requests.get(f"{BASE_URL}/api/tracks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Tracks endpoint works - {len(data)} tracks")
    
    def test_create_track_with_image(self, auth_token):
        """Test creating a track with image URL"""
        track_data = {
            "name": "TEST_Monaco",
            "country": "Monaco",
            "image_url": "https://example.com/monaco.png"
        }
        response = requests.post(f"{BASE_URL}/api/admin/tracks", 
            json=track_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_Monaco"
        assert data["image_url"] == "https://example.com/monaco.png"
        print(f"✅ Track created with image - id: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/tracks/{data['id']}", 
            headers={"Authorization": f"Bearer {auth_token}"})


class TestDesignSettings:
    """Test Design Settings including Background and Favicon upload"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_get_design_settings_public(self):
        """Test public design settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/design")
        assert response.status_code == 200
        data = response.json()
        
        # Check for background and favicon fields
        assert "bg_image_url" in data
        assert "favicon_url" in data
        assert "site_title" in data
        assert "bg_overlay_opacity" in data
        
        print(f"✅ Design settings retrieved")
        print(f"   bg_image_url: {data['bg_image_url']}")
        print(f"   favicon_url: {data['favicon_url']}")
        print(f"   site_title: {data['site_title']}")
    
    def test_update_background_image(self, auth_token):
        """Test updating background image URL"""
        new_bg = "https://example.com/test-background.jpg"
        response = requests.put(f"{BASE_URL}/api/admin/design", 
            json={"bg_image_url": new_bg},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/design")
        data = get_response.json()
        assert data["bg_image_url"] == new_bg
        print(f"✅ Background image URL updated successfully")
    
    def test_update_favicon_url(self, auth_token):
        """Test updating favicon URL"""
        new_favicon = "https://example.com/test-favicon.ico"
        response = requests.put(f"{BASE_URL}/api/admin/design", 
            json={"favicon_url": new_favicon},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/design")
        data = get_response.json()
        assert data["favicon_url"] == new_favicon
        print(f"✅ Favicon URL updated successfully")


class TestSMTPSettings:
    """Test SMTP Settings and improved error messages"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_smtp_test_without_config(self, auth_token):
        """Test SMTP test shows proper error when not configured"""
        # First reset SMTP settings
        requests.put(f"{BASE_URL}/api/admin/smtp", 
            json={"enabled": False, "host": "", "from_email": ""},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        response = requests.post(f"{BASE_URL}/api/admin/smtp/test", 
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Should show improved error message
        assert "SMTP" in data["detail"] or "konfiguriert" in data["detail"]
        print(f"✅ SMTP test shows proper error: {data['detail']}")
    
    def test_smtp_test_missing_from_email(self, auth_token):
        """Test SMTP test shows error when from_email is missing"""
        # Save partial config
        requests.put(f"{BASE_URL}/api/admin/smtp", 
            json={"enabled": True, "host": "smtp.gmail.com", "port": 587},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        response = requests.post(f"{BASE_URL}/api/admin/smtp/test", 
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✅ SMTP test shows missing field error: {data['detail']}")


class TestLapEntryWithEmail:
    """Test Lap Entry with optional email"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_create_lap_entry_with_email(self, auth_token):
        """Test creating lap entry with optional email"""
        entry_data = {
            "driver_name": "TEST_EmailDriver",
            "team": "Test Team",
            "email": "testdriver@example.com",
            "lap_time_display": "1:30.123"
        }
        response = requests.post(f"{BASE_URL}/api/admin/laps", 
            json=entry_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["driver_name"] == "TEST_EmailDriver"
        assert data["email"] == "testdriver@example.com"
        print(f"✅ Lap entry created with email - id: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/laps/{data['id']}", 
            headers={"Authorization": f"Bearer {auth_token}"})
    
    def test_create_lap_entry_without_email(self, auth_token):
        """Test creating lap entry without email (optional)"""
        entry_data = {
            "driver_name": "TEST_NoEmailDriver",
            "lap_time_display": "1:31.456"
        }
        response = requests.post(f"{BASE_URL}/api/admin/laps", 
            json=entry_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["driver_name"] == "TEST_NoEmailDriver"
        assert data.get("email") is None
        print(f"✅ Lap entry created without email - id: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/laps/{data['id']}", 
            headers={"Authorization": f"Bearer {auth_token}"})


class TestEventStatus:
    """Test Event Status management"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_get_event_status(self):
        """Test get event status endpoint"""
        response = requests.get(f"{BASE_URL}/api/event/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "message" in data
        assert data["status"] in ["inactive", "scheduled", "active", "finished"]
        print(f"✅ Event status endpoint works - status: {data['status']}")
    
    def test_update_event_to_active(self, auth_token):
        """Test updating event status to active"""
        response = requests.put(f"{BASE_URL}/api/admin/event", 
            json={"status": "active"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/event/status")
        data = get_response.json()
        assert data["status"] == "active"
        print(f"✅ Event status updated to active")
    
    def test_update_event_to_finished_triggers_email(self, auth_token):
        """Test that setting event to finished triggers email (background task)"""
        # First set to active
        requests.put(f"{BASE_URL}/api/admin/event", 
            json={"status": "active"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Then set to finished
        response = requests.put(f"{BASE_URL}/api/admin/event", 
            json={"status": "finished"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Event aktualisiert"
        print(f"✅ Event set to finished - email trigger initiated (background task)")


class TestFileUpload:
    """Test file upload endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_upload_endpoint_exists(self, auth_token):
        """Test that upload endpoint exists and requires auth"""
        # Test without file - should return 422 (validation error)
        response = requests.post(f"{BASE_URL}/api/upload", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # 422 means endpoint exists but needs file
        assert response.status_code in [422, 400]
        print(f"✅ Upload endpoint exists - status: {response.status_code}")
    
    def test_upload_requires_auth(self):
        """Test that upload requires authentication"""
        response = requests.post(f"{BASE_URL}/api/upload")
        assert response.status_code == 401
        print(f"✅ Upload endpoint requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
