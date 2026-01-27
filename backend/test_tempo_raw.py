import asyncio
import httpx
import yaml
from datetime import date, timedelta

async def test_tempo():
    # Load config
    with open("config.yaml", "r") as f:
        config = yaml.safe_load(f)
    
    # Get first instance with tempo token
    instance = None
    for inst in config["jira_instances"]:
        if inst.get("tempo_api_token"):
            instance = inst
            break
    
    if not instance:
        print("No instance with Tempo token found")
        return

    print(f"Testing Tempo API for {instance['name']}...")
    
    token = instance["tempo_api_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    # Fetch last 30 days
    today = date.today()
    start_date = today - timedelta(days=30)
    
    params = {
        "from": start_date.isoformat(),
        "to": today.isoformat(),
        "limit": 5
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://api.tempo.io/4/worklogs",
                headers=headers,
                params=params
            )
            resp.raise_for_status()
            data = resp.json()
            
            results = data.get("results", [])
            print(f"Found {len(results)} worklogs")
            
            if results:
                print("\nSample Worklog Author Data:")
                author = results[0].get("author", {})
                print(author)
                
                if "emailAddress" not in author:
                    print("\n⚠️  Email address NOT found in Tempo response!")
                    print("Need to map accountId -> email via JIRA API")
                else:
                    print("\n✅ Email address found in Tempo response")
            else:
                print("No worklogs found to verify structure")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_tempo())
