"""
Async Factorial HR API client.
API Docs: https://apidoc.factorialhr.com/
"""
import httpx
from datetime import date
from typing import Optional


class FactorialClient:
    """Async client per Factorial HR REST API v1."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.factorialhr.com/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    async def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        """Base async HTTP request."""
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, url, headers=self.headers, **kwargs)
            response.raise_for_status()
            return response.json()

    async def test_connection(self) -> dict:
        """Test API connection by fetching a single employee."""
        result = await self._request("GET", "/core/employees", params={"limit": 1})
        return {"status": "ok", "employee_count": result.get("count", 0)}

    async def search_employee_by_email(self, email: str) -> Optional[int]:
        """
        Cerca employee per email, ritorna employee_id se trovato.
        Pattern: come JiraClient.search_user_by_email()
        """
        try:
            result = await self._request("GET", "/core/employees", params={"email": email, "limit": 10})
            employees = result.get("data", [])
            for emp in employees:
                if emp.get("email", "").lower() == email.lower():
                    return emp.get("id")
            return None
        except httpx.HTTPError as e:
            print(f"Error searching employee {email}: {e}")
            return None

    async def get_all_employees(self) -> list[dict]:
        """Fetch tutti employees con paginazione (per bulk mapping)."""
        all_employees = []
        page = 1
        per_page = 100

        while True:
            try:
                result = await self._request("GET", "/core/employees",
                                            params={"page": page, "per_page": per_page})
                employees = result.get("data", [])
                all_employees.extend(employees)
                if len(employees) < per_page:
                    break
                page += 1
            except httpx.HTTPError as e:
                print(f"Error fetching employees page {page}: {e}")
                break

        return all_employees

    async def get_leaves_in_range(
        self,
        start_date: date,
        end_date: date,
        employee_ids: Optional[list[int]] = None
    ) -> list[dict]:
        """
        Fetch leaves in date range con paginazione.
        Pattern: come TempoClient.get_worklogs_in_range()
        """
        all_leaves = []
        page = 1
        per_page = 100

        print(f"Fetching Factorial leaves from {start_date} to {end_date}...")

        while True:
            try:
                params = {
                    "start_on": start_date.isoformat(),
                    "finish_on": end_date.isoformat(),
                    "page": page,
                    "per_page": per_page
                }
                result = await self._request("GET", "/time_off/leaves", params=params)
                leaves = result.get("data", [])

                # Filtra per employee_ids se fornito
                if employee_ids:
                    leaves = [l for l in leaves if l.get("employee_id") in employee_ids]

                all_leaves.extend(leaves)

                if len(result.get("data", [])) < per_page:
                    break
                page += 1
            except httpx.HTTPError as e:
                print(f"Error fetching leaves page {page}: {e}")
                break

        print(f"Fetched {len(all_leaves)} leaves from Factorial")
        return all_leaves
