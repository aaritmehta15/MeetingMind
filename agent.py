"""
agent.py — ReAct Agent logic for autonomous meeting analysis.
"""

import json
import time
from typing import Any
from agent_tools import build_tools
from rag_index import HierarchicalRAGIndex
from llm import call_llm

REACT_SYSTEM_PROMPT = """You are a brilliant ReAct (Reasoning and Acting) AI meeting assistant.
You must answer the user's question by using the tools provided to you.
You must ALWAYS follow this exact format:

Thought: [your internal reasoning about what to do next]
Action: [the name of the tool to use, if any]
Action Input: [a valid JSON object containing the arguments for the tool]

You will then receive a response from the system like this:
Observation: [result of the tool]

You can use multiple steps. When you have enough information to answer the question, you must format your final response EXACTLY like this:

Thought: I now know the final answer.
Final Answer: [your grounded answer to the user's question, citing evidence when possible]

Here are the tools you have access to:
{tool_descriptions}

Begin!"""

def run_agent_with_steps(
    transcript_text: str,
    question: str,
    provider: str = "groq",
    enabled_tools: list[str] | None = None,
) -> dict[str, Any]:
    start_t = time.perf_counter()

    # Build the RAG index and all tools
    idx = HierarchicalRAGIndex(window_size=5)
    idx.build(transcript_text)
    all_tools = build_tools(transcript_text, idx, provider)
    
    # Filter tools if the caller specified a whitelist
    if enabled_tools is not None:
        tools = [t for t in all_tools if t.name in enabled_tools]
    else:
        tools = all_tools
    
    # Format tool descriptions
    tool_desc = ""
    for t in tools:
        tool_desc += f"- {t.name}: {t.description}\n  Parameters: {json.dumps(t.parameters)}\n\n"
    
    sys_prompt = REACT_SYSTEM_PROMPT.format(tool_descriptions=tool_desc)
    
    # History tracks the ReAct flow
    history = f"Question: {question}\n"
    
    steps = []
    final_answer = "I could not determine the answer."
    
    # Run loop (max 10 iterations)
    for _ in range(10):
        # Call LLM
        response = call_llm(provider, sys_prompt, history)
        
        # Append LLM output to history
        history += f"{response}\n"
        
        # Parse output
        thought = ""
        action = ""
        action_input_str = ""
        
        # Basic string parsing
        lines = response.split('\n')
        for i, line in enumerate(lines):
            if line.startswith("Thought:"):
                thought = line[8:].strip()
                # If there are multiple lines of thought, we just grab the first for the UI summary
            elif line.startswith("Action:"):
                action = line[7:].strip()
            elif line.startswith("Action Input:"):
                action_input_str = "\n".join(lines[i:]).replace("Action Input:", "").strip()
                break
            elif line.startswith("Final Answer:"):
                final_answer = line[13:].strip()
                # Also include any subsequent lines
                final_answer += "\n" + "\n".join(lines[i+1:])
                final_answer = final_answer.strip()
                break
                
        if "Final Answer:" in response:
            steps.append({
                "thought": thought or "I now know the final answer.",
                "tool_name": None,
                "tool_args": None,
                "tool_result": None
            })
            break
            
        if not action:
            # Fallback if the agent messes up formatting
            history += "Observation: You must provide an 'Action' or a 'Final Answer'.\n"
            continue
            
        # Parse action input JSON
        try:
            # Strip markdown blocks if present
            clean_input = action_input_str
            if clean_input.startswith("```json"):
                clean_input = clean_input[7:-3].strip()
            elif clean_input.startswith("```"):
                clean_input = clean_input[3:-3].strip()
                
            action_args = json.loads(clean_input)
        except json.JSONDecodeError:
            action_args = {}
            history += f"Observation: Invalid JSON in Action Input: {action_input_str}\n"
            continue
            
        # Execute tool
        tool_result = f"Error: Tool '{action}' not found."
        for t in tools:
            if t.name == action:
                try:
                    tool_result = t(action_args)
                except Exception as e:
                    tool_result = f"Error executing tool: {e}"
                break
                
        # Append observation
        history += f"Observation: {tool_result}\n"
        
        # Record step for UI
        steps.append({
            "thought": thought,
            "tool_name": action,
            "tool_args": action_args,
            "tool_result": tool_result
        })
        
    latency = (time.perf_counter() - start_t) * 1000
    
    return {
        "answer": final_answer,
        "steps": steps,
        "latency_ms": round(latency, 2)
    }
