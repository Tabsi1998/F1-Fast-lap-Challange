"""
F1 Fast Lap Challenge - Multi-Event System Tests
Tests for: Events Overview, Event Detail, Event CRUD, Lap Entries, QR Code, CSV Export, Status Changes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fastlapapp.preview.emergentagent.com').rstrip('/')


class TestEventsOverview:
    """Test Events Overview - grouped by status"""
    
    def test_get_all_events_grouped(self):
        """Test /api/events returns events grouped by status"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        # Check for status groups
        assert "active" in data
        assert "scheduled" in data
        assert "finished" in data
        assert "archived" in data
        
        # All should be lists
        assert isinstance(data["active"], list)
        assert isinstance(data["scheduled"], list)
        assert isinstance(data["finished"], list)
        assert isinstance(data["archived"], list)
        
        total_events = len(data["active"]) + len(data["scheduled"]) + len(data["finished"]) + len(data["archived"])
        print(f"✅ Events grouped by status - total: {total_events}")
        print(f"   Active: {len(data['active'])}, Scheduled: {len(data['scheduled'])}, Finished: {len(data['finished'])}, Archived: {len(data['archived'])}")
    
    def test_events_have_top_entries(self):
        """Test that events include top 3 entries for preview"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        # Find an event with entries
        all_events = data["active"] + data["scheduled"] + data["finished"] + data["archived"]
        
        for event in all_events:
            assert "top_entries" in event
            assert "entry_count" in event
            assert isinstance(event["top_entries"], list)
            assert len(event["top_entries"]) <= 3  # Max 3 for preview
            
            if event["entry_count"] > 0:
                print(f"✅ Event '{event['name']}' has {event['entry_count']} entries, top_entries: {len(event['top_entries'])}")
                return
        
        print("✅ Events have top_entries field (no events with entries found)")


class TestEventDetailPage:
    """Test Event Detail Page - /event/{slug}"""
    
    def test_get_event_by_slug(self):
        """Test getting event by slug"""
        response = requests.get(f"{BASE_URL}/api/events/test-event-live")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        assert "slug" in data
        assert "entries" in data
        assert data["slug"] == "test-event-live"
        
        print(f"✅ Event detail retrieved - name: {data['name']}, entries: {len(data['entries'])}")
    
    def test_event_entries_have_rank_and_gap(self):
        """Test that event entries include rank and gap"""
        response = requests.get(f"{BASE_URL}/api/events/test-event-live")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["entries"]) > 0:
            first_entry = data["entries"][0]
            assert "rank" in first_entry
            assert "gap" in first_entry
            assert "lap_time_display" in first_entry
            assert "driver_name" in first_entry
            
            assert first_entry["rank"] == 1
            assert first_entry["gap"] == "-"  # Leader has no gap
            
            print(f"✅ Entries have rank and gap - leader: {first_entry['driver_name']} ({first_entry['lap_time_display']})")
        else:
            print("✅ Event entries structure verified (no entries)")
    
    def test_event_not_found(self):
        """Test 404 for non-existent event"""
        response = requests.get(f"{BASE_URL}/api/events/non-existent-event-slug")
        assert response.status_code == 404
        print("✅ Non-existent event returns 404")


class TestEventCRUD:
    """Test Event Create, Read, Update, Delete"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_create_event(self, auth_token):
        """Test creating a new event"""
        event_data = {
            "name": "TEST_New Event",
            "description": "Test event description",
            "scheduled_date": "2026-12-25",
            "scheduled_time": "15:00"
        }
        response = requests.post(f"{BASE_URL}/api/admin/events", 
            json=event_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "event" in data
        event = data["event"]
        assert event["name"] == "TEST_New Event"
        assert event["slug"] == "test-new-event"
        assert event["status"] == "scheduled"
        
        print(f"✅ Event created - id: {event['id']}, slug: {event['slug']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/events/{event['id']}", 
            headers={"Authorization": f"Bearer {auth_token}"})
    
    def test_update_event_status(self, auth_token):
        """Test updating event status (Geplant → Live → Beendet → Archiviert)"""
        # Create test event
        create_response = requests.post(f"{BASE_URL}/api/admin/events", 
            json={"name": "TEST_Status Event"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        event_id = create_response.json()["event"]["id"]
        
        # Test status transitions
        statuses = ["active", "finished", "archived"]
        for status in statuses:
            response = requests.put(f"{BASE_URL}/api/admin/events/{event_id}", 
                json={"status": status},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            print(f"✅ Status changed to: {status}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/events/{event_id}", 
            headers={"Authorization": f"Bearer {auth_token}"})
    
    def test_delete_event(self, auth_token):
        """Test deleting an event"""
        # Create test event
        create_response = requests.post(f"{BASE_URL}/api/admin/events", 
            json={"name": "TEST_Delete Event"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        event_id = create_response.json()["event"]["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/admin/events/{event_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/events")
        all_events = get_response.json()
        all_ids = [e["id"] for e in all_events["active"] + all_events["scheduled"] + all_events["finished"] + all_events["archived"]]
        assert event_id not in all_ids
        
        print(f"✅ Event deleted successfully")


class TestEventLapEntries:
    """Test adding lap entries to events"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_event(self, auth_token):
        """Create a test event"""
        response = requests.post(f"{BASE_URL}/api/admin/events", 
            json={"name": "TEST_Lap Entry Event"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        event = response.json()["event"]
        yield event
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/events/{event['id']}", 
            headers={"Authorization": f"Bearer {auth_token}"})
    
    def test_add_lap_entry_to_event(self, auth_token, test_event):
        """Test adding a lap entry to an event"""
        entry_data = {
            "driver_name": "TEST_Driver",
            "team": "Test Team",
            "lap_time_display": "1:25.123"
        }
        response = requests.post(f"{BASE_URL}/api/admin/events/{test_event['id']}/laps", 
            json=entry_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Response wraps entry in "entry" field
        entry = data.get("entry", data)
        assert entry["driver_name"] == "TEST_Driver"
        assert entry["lap_time_display"] == "1:25.123"
        assert entry["lap_time_ms"] == 85123  # 1:25.123 in ms
        
        print(f"✅ Lap entry added to event - id: {entry['id']}")
    
    def test_add_lap_entry_with_email(self, auth_token, test_event):
        """Test adding a lap entry with optional email"""
        entry_data = {
            "driver_name": "TEST_EmailDriver",
            "email": "test@example.com",
            "lap_time_display": "1:26.456"
        }
        response = requests.post(f"{BASE_URL}/api/admin/events/{test_event['id']}/laps", 
            json=entry_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Response wraps entry in "entry" field
        entry = data.get("entry", data)
        assert entry["email"] == "test@example.com"
        print(f"✅ Lap entry with email added")
    
    def test_delete_lap_entry_from_event(self, auth_token, test_event):
        """Test deleting a lap entry from an event"""
        # Add entry
        add_response = requests.post(f"{BASE_URL}/api/admin/events/{test_event['id']}/laps", 
            json={"driver_name": "TEST_ToDelete", "lap_time_display": "1:30.000"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        add_data = add_response.json()
        # Response wraps entry in "entry" field
        entry = add_data.get("entry", add_data)
        entry_id = entry["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/admin/events/{test_event['id']}/laps/{entry_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✅ Lap entry deleted from event")


class TestQRCodeGeneration:
    """Test QR Code generation for events"""
    
    def test_qr_code_endpoint(self):
        """Test QR code generation endpoint"""
        base_url = "https://fastlapapp.preview.emergentagent.com"
        response = requests.get(f"{BASE_URL}/api/events/test-event-live/qr?base_url={base_url}")
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "image/png"
        assert len(response.content) > 0  # Should have image data
        
        print(f"✅ QR code generated - size: {len(response.content)} bytes")
    
    def test_qr_code_for_non_existent_event(self):
        """Test QR code for non-existent event returns 404"""
        response = requests.get(f"{BASE_URL}/api/events/non-existent-event/qr?base_url=https://example.com")
        assert response.status_code == 404
        print("✅ QR code for non-existent event returns 404")


class TestCSVExport:
    """Test CSV Export for events"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin"
        })
        return response.json()["token"]
    
    def test_csv_export_endpoint(self, auth_token):
        """Test CSV export for an event"""
        # Get an event ID
        events_response = requests.get(f"{BASE_URL}/api/events")
        all_events = events_response.json()
        all_events_list = all_events["active"] + all_events["scheduled"] + all_events["finished"] + all_events["archived"]
        
        if len(all_events_list) > 0:
            event_id = all_events_list[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/admin/events/{event_id}/export/csv", 
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            assert "text/csv" in response.headers.get("content-type", "")
            
            # Check CSV content
            csv_content = response.text
            assert "Platz" in csv_content
            assert "Fahrer" in csv_content
            assert "Rundenzeit" in csv_content
            
            print(f"✅ CSV export works - content length: {len(csv_content)}")
        else:
            pytest.skip("No events available for CSV export test")
    
    def test_csv_export_requires_auth(self):
        """Test CSV export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/events/some-id/export/csv")
        assert response.status_code == 401
        print("✅ CSV export requires authentication")


class TestEventURLs:
    """Test unique URLs per event"""
    
    def test_event_has_unique_slug(self):
        """Test that events have unique slugs"""
        response = requests.get(f"{BASE_URL}/api/events")
        all_events = response.json()
        all_events_list = all_events["active"] + all_events["scheduled"] + all_events["finished"] + all_events["archived"]
        
        slugs = [e["slug"] for e in all_events_list]
        unique_slugs = set(slugs)
        
        assert len(slugs) == len(unique_slugs), "Duplicate slugs found"
        print(f"✅ All {len(slugs)} events have unique slugs")
    
    def test_event_accessible_by_slug(self):
        """Test that events are accessible by their slug"""
        response = requests.get(f"{BASE_URL}/api/events/test-event-live")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "test-event-live"
        print(f"✅ Event accessible by slug: /event/{data['slug']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
