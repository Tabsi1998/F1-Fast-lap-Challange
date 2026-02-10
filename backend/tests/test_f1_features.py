"""
F1 Fast Lap Challenge - Feature Tests
Tests for: Admin Setup, Login, Design Settings (Website Tab), Badge removal
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
        """Test admin login with valid credentials"""
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
        print(f"✅ Admin login successful - username: {data['username']}")
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
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        token = login_response.json()["token"]
        
        # Check auth
        response = requests.get(f"{BASE_URL}/api/auth/check", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] == True
        assert data["username"] == "admin"
        print(f"✅ Auth check successful - authenticated: {data['authenticated']}")
    
    def test_auth_check_without_token(self):
        """Test auth check without token"""
        response = requests.get(f"{BASE_URL}/api/auth/check")
        assert response.status_code == 401
        print("✅ Auth check without token correctly rejected with 401")


class TestDesignSettings:
    """Test Design Settings including Website Tab features"""
    
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
        
        # Check for Website Tab fields
        assert "site_title" in data
        assert "favicon_url" in data
        assert "show_badge" in data
        
        print(f"✅ Design settings retrieved - site_title: {data['site_title']}")
        print(f"   favicon_url: {data['favicon_url']}")
        print(f"   show_badge: {data['show_badge']}")
    
    def test_update_site_title(self, auth_token):
        """Test updating site title"""
        new_title = "Test F1 Challenge Title"
        response = requests.put(f"{BASE_URL}/api/admin/design", 
            json={"site_title": new_title},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/design")
        data = get_response.json()
        assert data["site_title"] == new_title
        print(f"✅ Site title updated successfully to: {new_title}")
    
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
        print(f"✅ Favicon URL updated successfully to: {new_favicon}")
    
    def test_show_badge_setting(self, auth_token):
        """Test show_badge setting (should be false for badge removal)"""
        # Set show_badge to false
        response = requests.put(f"{BASE_URL}/api/admin/design", 
            json={"show_badge": False},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/design")
        data = get_response.json()
        assert data["show_badge"] == False
        print("✅ show_badge correctly set to False (badge removed)")
    
    def test_update_design_requires_auth(self):
        """Test that design update requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/design", 
            json={"site_title": "Unauthorized Update"}
        )
        assert response.status_code == 401
        print("✅ Design update without auth correctly rejected with 401")


class TestPublicEndpoints:
    """Test public endpoints"""
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Root endpoint works - message: {data['message']}")
    
    def test_get_laps(self):
        """Test get laps endpoint"""
        response = requests.get(f"{BASE_URL}/api/laps")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Laps endpoint works - {len(data)} entries")
    
    def test_get_tracks(self):
        """Test get tracks endpoint"""
        response = requests.get(f"{BASE_URL}/api/tracks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Tracks endpoint works - {len(data)} tracks")
    
    def test_get_event_status(self):
        """Test get event status endpoint"""
        response = requests.get(f"{BASE_URL}/api/event/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "message" in data
        print(f"✅ Event status endpoint works - status: {data['status']}")


class TestAdminSetupFlow:
    """Test Admin Setup flow (when no admin exists)"""
    
    def test_setup_endpoint_exists(self):
        """Test that setup endpoint exists"""
        # This test just verifies the endpoint exists
        # We don't actually create an admin as one already exists
        response = requests.post(f"{BASE_URL}/api/auth/setup", json={
            "username": "test_admin",
            "password": "test123"
        })
        # Should return 400 if admin already exists
        assert response.status_code in [200, 400]
        if response.status_code == 400:
            data = response.json()
            assert "Admin existiert bereits" in data.get("detail", "")
            print("✅ Setup endpoint correctly rejects when admin exists")
        else:
            print("✅ Setup endpoint works (admin was created)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
