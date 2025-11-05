from openai import OpenAI
import yfinance as yf
import pandas as pd
import plotly.graph_objects as go
from google import genai
from google.genai import types
import os


# --- Data Fetch ---
def get_stock_data(ticker: str, period: str = "6mo"):
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period=period)
        if data.empty:
            raise ValueError("No data returned.")
        return data
    except Exception as e:
        print("Error fetching data:", e)
        return None


# --- Plot Function ---
def plot_stock_data(df, ticker):
    if df is None or df.empty:
        return go.Figure()

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df.index, y=df["Close"], mode="lines", name=f"{ticker} Close"))
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], name="Volume", marker_color="rgba(255,99,71,0.3)", yaxis="y2"))
    fig.update_layout(
        title=f"{ticker} Stock Price",
        xaxis_title="Date",
        yaxis_title="Close Price (USD)",
        yaxis2=dict(title="Volume", overlaying="y", side="right", showgrid=False),
        template="plotly_white",
        height=500
    )
    return fig



# --- AI Financial Analysis ---
def analyze_stocks_with_ai_prompt(Prompt,API_KEY,Model,Provider):
    if Provider == "OpenRouter":
        client = OpenAI(base_url="https://openrouter.ai/api/v1",api_key=API_KEY)

        response = client.chat.completions.create(
            model=Model,
            messages=[{"role": "user", "content": Prompt}],

        )
        return response.choices[0].message.content
    
    elif Provider == "Gemini":

        try:
            
            client = genai.Client(api_key=API_KEY)

            # 2. Call the generate_content method via client.models
            response = client.models.generate_content(
                model=Model, 
                contents=[Prompt], # Simple string prompt is wrapped as content
                config=types.GenerateContentConfig(
                    # Example of an optional configuration
                    temperature=0.3
                )
            )
            
            # 3. Return the generated text
            return response.text

        except Exception as e:
            # Catch authentication errors or other API issues specific to Gemini
            return f"🚨 Gemini API Error: Could not generate content. Check the key and model name. Error: {e}"

    else:
        return "⚠️ Invalid provider selected."
