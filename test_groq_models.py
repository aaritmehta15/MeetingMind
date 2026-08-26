import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.environ["GROQ_API_KEY"])

models_to_test = ["llama-3.1-8b-instant", "gemma2-9b-it", "mixtral-8x7b-32768", "llama3-8b-8192", "qwen/qwen3.6-27b"]

for m in models_to_test:
    try:
        resp = client.chat.completions.create(
            model=m,
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=10
        )
        print(f"✅ Model {m} works! Response: {resp.choices[0].message.content}")
    except Exception as e:
        print(f"❌ Model {m} failed: {e}")
