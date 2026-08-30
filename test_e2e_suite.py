import requests
import json
import sys
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_suite():
    print("=" * 60)
    print("🚀 STARTING COMPREHENSIVE END-TO-END VERIFICATION SUITE")
    print("=" * 60)

    # 1. Status Check
    print("\n[1/8] Testing /api/status...")
    r = requests.get(f"{BASE_URL}/api/status")
    assert r.status_code == 200, f"Status failed: {r.text}"
    status_data = r.json()
    print("✅ System Status OK:", status_data["status"])
    print(f"   LLM Provider: {status_data['default_provider']} | Groq Model: {status_data['groq_model']}")

    # 2. Authentication Login
    print("\n[2/8] Testing /api/auth/login...")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "demo", "password": "password"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful! Token acquired.")

    # 3. Meetings Fetch & Create
    print("\n[3/8] Testing /api/meetings (GET & POST)...")
    r = requests.get(f"{BASE_URL}/api/meetings", headers=headers)
    assert r.status_code == 200, f"Fetch meetings failed: {r.text}"
    meetings = r.json()
    print(f"✅ Found {len(meetings)} meetings in database:")
    for m in meetings:
        print(f"   • [{m['id']}] {m['title']} ({m['turn_count']} turns)")

    # Post a new custom meeting to test creation
    test_title = "e2e_test_quarterly_review"
    test_transcript = """Quarterly Review & Budget Sync
Date: October 15, 2026 | Duration: 30 mins
Participants: Alice Walker (VP Product), Bob Vance (Lead Engineer), Charlie Day (Finance Director)

Alice Walker: Good afternoon. Let's review our Q4 budget allocations. Bob, what is the status of our server migration?
Bob Vance: We migrated 80% of our workloads to ARM64 instances. We cut hosting costs by $25,000 this month. I will finalize the remaining database shard by next Friday, October 24th at 5:00 PM.
Charlie Day: That fits within our financial targets. I officially approve the $50,000 budget for the new Kubernetes tooling.
Alice Walker: Great. Let's confirm that decision: the Kubernetes tooling budget is approved at $50,000. Bob will deliver the final migration report.
Bob Vance: Understood. I will also write the post-migration documentation for the SRE team by Monday morning.
"""
    r = requests.post(f"{BASE_URL}/api/meetings", json={"title": test_title, "transcript_text": test_transcript}, headers=headers)
    assert r.status_code == 200, f"Create meeting failed: {r.text}"
    created_meeting = r.json()
    created_id = created_meeting["id"]
    print(f"✅ Created new demo meeting ID: {created_id} ('{test_title}')")

    # 4. Intelligence Extraction & Citation Guard
    print("\n[4/8] Testing /api/extract (LLM Extraction + Citation Guard)...")
    r = requests.post(f"{BASE_URL}/api/extract", json={"meeting_id": created_id, "provider": "groq"}, headers=headers)
    assert r.status_code == 200, f"Extraction failed: {r.text}"
    extract_data = r.json()
    print(f"✅ Extraction completed in {extract_data['latency_ms']}ms:")
    print(f"   Summary: {extract_data['summary'][:120]}...")
    print(f"   Action Items ({len(extract_data['action_items'])} found):")
    for act in extract_data["action_items"]:
        status_icon = "🟢 Accepted" if act.get("accepted") else "🔴 Rejected"
        print(f"     - [{status_icon}] {act.get('owner', 'Unassigned')}: {act.get('description')} (Deadline: {act.get('deadline')})")
        print(f"       Quote: \"{act.get('evidence_quote')}\"")
    print(f"   Decisions ({len(extract_data['decisions'])} found):")
    for dec in extract_data["decisions"]:
        status_icon = "🟢 Accepted" if dec.get("accepted") else "🔴 Rejected"
        print(f"     - [{status_icon}] {dec.get('description')}")
    print(f"   Citation Guard Report: {extract_data['citation_report']}")

    # 5. Local Analytics & NLP
    print("\n[5/8] Testing /api/analyze (Local NLP Analytics)...")
    r = requests.post(f"{BASE_URL}/api/analyze", json={"meeting_id": created_id}, headers=headers)
    assert r.status_code == 200, f"Analyze failed: {r.text}"
    analytics = r.json()
    print("✅ NLP Analytics completed:")
    print("   Speakers:", [f"{s['speaker']} ({s['words']} words, {s['share_pct']}%)" for s in analytics["speakers"]])
    print("   Top Keywords:", [f"{k['word']} ({k['count']})" for k in analytics["keywords"][:5]])
    print("   Timeline Entities Extracted:", len(analytics["timeline"]))

    # 6. Hierarchical Parent-Child RAG Vector Search
    print("\n[6/8] Testing /api/search (FAISS Vector Search)...")
    rag_query = "What budget was approved for Kubernetes tooling?"
    r = requests.post(f"{BASE_URL}/api/search", json={"meeting_id": created_id, "query": rag_query, "k": 2}, headers=headers)
    assert r.status_code == 200, f"Search failed: {r.text}"
    search_data = r.json()
    print(f"✅ RAG Search completed in {search_data['latency_ms']}ms:")
    for res in search_data["results"]:
        print(f"   • [Score: {res['score']}] Child: \"{res['child_text'][:80]}...\"")

    # 7. Autonomous ReAct Agent Query
    print("\n[7/8] Testing /api/ask (Autonomous Agent Reasoning)...")
    agent_q = "What is Bob's deadline and how much money was saved?"
    r = requests.post(f"{BASE_URL}/api/ask", json={"meeting_id": created_id, "question": agent_q, "provider": "groq"}, headers=headers)
    assert r.status_code == 200, f"Agent ask failed: {r.text}"
    agent_resp = r.json()
    print("✅ Agent reasoning response:")
    print(f"   Answer: {agent_resp.get('answer', '')}")
    if agent_resp.get("steps"):
        print(f"   Execution Steps: {len(agent_resp['steps'])}")
        for i, step in enumerate(agent_resp["steps"], 1):
            tool_display = step.get('tool_name') or 'Final Answer'
            print(f"     Step {i}: Tool: {tool_display} -> {step.get('thought')}")

    # 8. Testing on Enterprise Benchmark Dataset (demo_data)
    print("\n[8/8] Testing Enterprise Benchmark extraction on '01_cloud_architecture_migration_sync'...")
    cloud_meeting = next((m for m in meetings if "cloud" in m["title"]), None)
    if cloud_meeting:
        r = requests.post(f"{BASE_URL}/api/extract", json={"meeting_id": cloud_meeting["id"], "provider": "groq"}, headers=headers)
        assert r.status_code == 200, f"Enterprise extraction failed: {r.text}"
        bench_res = r.json()
        print(f"✅ Enterprise Benchmark extraction completed in {bench_res['latency_ms']}ms:")
        print(f"   Summary: {bench_res['summary'][:140]}...")
        print(f"   Extracted {len(bench_res['action_items'])} action items and {len(bench_res['decisions'])} decisions.")

    print("\n" + "=" * 60)
    print("🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY! EVERYTHING IS HEALTHY.")
    print("=" * 60)

if __name__ == "__main__":
    test_suite()
