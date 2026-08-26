import os
from dotenv import load_dotenv

load_dotenv()

print("--- Testing Groq ---")
try:
    from groq import Groq
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    print("Listing Groq models:")
    models = client.models.list()
    valid_groq = [m.id for m in models.data]
    print(f"Available Groq models ({len(valid_groq)}):", valid_groq[:10])
    
    # Try current configured model
    curr_groq = os.getenv("GROQ_MODEL", "groq/compound-mini")
    print(f"Testing configured Groq model: {curr_groq}")
    resp = client.chat.completions.create(
        model=curr_groq,
        messages=[{"role": "user", "content": "hello"}],
        max_tokens=10
    )
    print("Groq Response:", resp.choices[0].message.content)
except Exception as e:
    print("Groq Error:", type(e), e)

print("\n--- Testing Gemini ---")
try:
    from google import genai
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    print("Testing Gemini model listing or call:")
    curr_gemini = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    print(f"Testing configured Gemini model: {curr_gemini}")
    resp = client.models.generate_content(
        model=curr_gemini,
        contents="hello",
    )
    print("Gemini Response:", resp.text)
except Exception as e:
    print("Gemini Error:", type(e), e)
