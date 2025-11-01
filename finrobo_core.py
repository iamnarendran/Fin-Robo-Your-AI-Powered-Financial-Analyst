from openai import OpenAI
import yfinance as yf
import pandas as pd
import plotly.graph_objects as go



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
def analyze_stocks_with_ai_prompt(prompt,API_KEY,Model):

    client = OpenAI(base_url="https://openrouter.ai/api/v1",api_key=API_KEY)

    response = client.chat.completions.create(
        model=Model,
        messages=[{"role": "user", "content": prompt}],

    )
    return response.choices[0].message.content