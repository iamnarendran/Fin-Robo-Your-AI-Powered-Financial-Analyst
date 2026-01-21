import streamlit as st
import pandas as pd
from finrobo_core import get_stock_data, plot_stock_data, analyze_stocks_with_ai_prompt
import time

st.markdown("""
    <div style="text-align: center; padding: 10px;">
        <h1 style="margin-bottom: 0;">Fin-Robo 🧠💰</h1>
        <p style="font-size: 18px; color: gray;">
            Your AI-Powered Financial Analyst — Compare, Analyze, and Chat about Stocks in Real-Time 📈
        </p>
    </div>
""", unsafe_allow_html=True)

st.set_page_config(page_title="Fin-Robo 🧠💰", layout="wide")

tab1, tab2 = st.tabs(["📊📈💰 Multi-Stock Charts", "📊📈🧠 AI Insights"])

# ---------- TAB 1 ----------
with tab1:
    st.subheader("📈 Manual Stock Comparison")

    popular_tickers = [
        "AAPL", "MSFT", "GOOG", "AMZN", "TSLA", "META", "NVDA", "NFLX",
        "ORCL", "INTC", "AMD", "PYPL", "IBM", "ADBE", "NKE", "DIS",
        "PEP", "KO", "V", "MA", "JPM", "BAC", "WMT", "TCS.NS", "RELIANCE.NS", "INFY.NS"
    ]

    tickers = st.multiselect("Select stocks:", popular_tickers, default=["TSLA"])
    custom_ticker = st.text_input("Or enter any custom stock ticker:")
    period = st.selectbox("Select period:", ["1mo", "3mo", "6mo", "1y", "2y", "5y"], index=2)

    if custom_ticker:
        tickers.append(custom_ticker.upper())

    stock_data_dict = {}
    combined_close = pd.DataFrame()

    if tickers:
        for ticker in tickers:
            df = get_stock_data(ticker, period)
            if df is not None and not df.empty:
                stock_data_dict[ticker] = df
                st.plotly_chart(plot_stock_data(df, ticker), use_container_width=True, key=f"chart_{ticker}")
                combined_close[ticker] = df["Close"]
            else:
                st.warning(f"No data found for {ticker}.")

        if not combined_close.empty:
            st.subheader("📊 Combined Close-Price Comparison")
            st.line_chart(combined_close)

    st.session_state["stock_data_dict"] = stock_data_dict
    st.session_state["period"] = period

with st.sidebar:
    with st.sidebar.expander("📘 How to Use Fin-Robo"):
        st.markdown("""
        **Welcome to Fin-Robo – Your AI Financial Analyst 🧠💰**
        
        **Steps to use:**
        1. Enter your **OpenRouter API Key** Or **Gemini API Key** Below.
        2. Choose your **AI Model**.
        3. Select or type stock tickers (e.g., `AAPL`, `GOOGL`, `TSLA`).
        4. Choose a **time period** (e.g., `6mo`, `1y`, etc.).
        5. View multiple plots and insights on selected stocks.
        6. In the chat box, ask questions like:
        - “Compare Tesla and Apple this year.”
        - “Which stock looks stronger long-term?”
        - “Summarize Google’s performance in 2024.”
        """)

        st.info("💡 Tip: You can use any OpenRouter-supported model!")

    st.sidebar.subheader("🔑 Choose AI Provider")

    provider = st.sidebar.radio(
        "Select your provider:",
        ["[Gemini](https://aistudio.google.com/api-keys) (For faster response)" , 
         "[OpenRouter](https://openrouter.ai/settings/keys)"]
    )
    
    if provider == "OpenRouter":
        st.header("🔑 API Key Setup")
            
        api_key = st.text_input("Enter your OpenRouter API key", type="password")
        if api_key:
            st.session_state["api_key"] = api_key
            st.success("✅ API key saved for this session!")
            st.markdown("""
                    <script>
                    window.parent.document.querySelector('section[data-testid="stSidebar"]').style.display = 'none';
                    </script>
                    """, unsafe_allow_html=True)
        else:
            st.warning("⚠️ Please enter an API key to enable AI analysis")
        
        if api_key:
            st.sidebar.markdown("### 🧠 Choose AI Model")

            model_options = {
                "GPT OSS 20B (Best)": "openai/gpt-oss-120b",
                "Google Gemma": "google/gemma-3n-e2b-it:free",
                "Meta Llama 3.3 70b": "meta-llama/llama-3.3-70b-instruct:free",
                "DeepSeek R1": "deepseek/deepseek-r1-0528:free",
                "Mistral samll 3.1": "mistralai/mistral-small-3.1-24b-instruct:free",
                "Mistral 7b ": "mistralai/mistral-7b-instruct",                
                "Qwen 3": "qwen/qwen3-next-80b-a3b-instruct:free",                
                "Mistral 24B": "mistralai/mistral-small-3.2-24b-instruct:free",
                "🔧 Custom (Type below)": "Custom models"
            }
            
            selected_model = st.sidebar.selectbox("Select a model:", list(model_options.keys()))

            if selected_model == "🔧 Custom (Type below)":
                custom_model = st.sidebar.text_input("Enter your custom OpenRouter model name: /n custom models search here:'https://openrouter.ai/models'")
                model_name = custom_model if custom_model else "openai/gpt-oss-120b"
                st.success(f"Don't Panic, {model_name} will run only in free of cost")
            else:
                model_name = model_options[selected_model]
                st.success(f"Don't Panic, {selected_model} will run only in free of cost 🫰 💸")

        st.session_state["model_name"] = model_name

    elif provider == "Gemini":
        st.header("🔑 API Key Setup")
        api_key = st.text_input("Enter your Gemini API Key", type="password")
        
        if api_key:
            st.session_state["api_key"] = api_key
            st.success("✅ API key saved for this session!")
            st.markdown("""
                    <script>
                    window.parent.document.querySelector('section[data-testid="stSidebar"]').style.display = 'none';
                    </script>
                    """, unsafe_allow_html=True)
        else:
            st.warning("⚠️ Please enter an API key to enable AI analysis")

        if api_key:
            
            st.sidebar.markdown("### 🧠 Choose AI Model")

            model_options = {
                "Gemini-2.5-Flash (Best)": "gemini-2.5-flash",
                "Google-2.5-Flash-lite": "gemini-2.5-flash-lite",
                "Google-2.5-pro": "gemini-2.5-pro"
            }
            
            selected_model = st.sidebar.selectbox("Select a model:", list(model_options.keys()))
            model_name = model_options[selected_model]
            if api_key:
                st.success(f"{selected_model}🧠 is selected ")
        
        st.session_state["model_name"] = model_name

        st.session_state["provider"] = "gemini"
        st.session_state["api_key"] = api_key
        st.session_state["model"] = model_name
        
    st.markdown("### 🧹 Wanna clear history?")    
    if st.button("🗑️ Clear Chat"):
        st.session_state["chat_history"] = []
        st.session_state["ai_summary"] = ""
        st.success("Cleared the Chat history 🗑️🧹")

with st.sidebar.expander("🔮💐 Future Updates :"):
    st.markdown("""
    These are what I planned to make :
                
    - 🗣️ Voice-based financial Q&A

    - 🪙 Crypto Data Analysis

    - 📰 Real-time stock news summarisation
                
    - 📊 Sentiment tracking and forecasting
                
    - 📽️ Youtube Search Integration for News Trends on Finance
                
    - 💹 Realtime Market Tracker Dashboard
                
    - 📊 Fin-Robo “Advisor Mode” (Recommendation Insights) to analyse a user’s watchlist and suggest buy/sell ideas.
                
    - 🗣️ Multi-Agent System (With LangGraph) 
                
        - 📈 Analyst Agent: Handles stock trends & metrics

        - 📰 News Agent: Summarises breaking news

        - 💬 Advisor Agent: Gives recommendations

        - 🎨 Visualizer Agent: Plots insights dynamically

    - 💰 Portfolio Simulation Mode (User Uploads Portfolio CSV)
                
    - 👨‍🏫 AI-Powered Investment Tutor Mode
                
    - 🧠 SLM implementation (Local access)
    """)
    st.info("✨ These are planned upgrades designed to make Fin-Robo a full AI financial companion.")

# ---------- TAB 2 ----------

    with tab2:
    # --- CSS Styling ---
        st.markdown("""
        <style>
        /* Chat container */
        .chat-box {
            max-height: 500px;
            overflow-y: auto;
            padding: 1rem 1rem 0.5rem 1rem; /* Adjusted bottom padding */
            background-color: #f7f9fc;
            border-radius: 10px;
            border: 1px solid #ddd;
            margin-bottom: 0.5rem; /* Reduced bottom margin */
        }

        /* User bubble */
        .chat-bubble-user {
            background-color: #8e44ad;
            color: white;
            padding: 10px 14px;
            border-radius: 18px 18px 0px 18px;
            margin: 8px 0;
            text-align: right;
        }

        /* AI bubble */
        .chat-bubble-bot {
            background-color: #228b22;
            color: white;
            padding: 10px 14px;
            border-radius: 18px 18px 18px 0px;
            margin: 8px 0;
            text-align: left;
        }

        /* Fix chat input spacing */
        [data-testid="stChatInput"] {
            margin-top: -20px !important;
                    
        }       
        </style>
        """, unsafe_allow_html=True)
        st.subheader("💬 Chat with Fin-Robo")

        if "ai_summary" not in st.session_state:
            st.session_state["ai_summary"] = ""
        if "chat_history" not in st.session_state:
            st.session_state["chat_history"] = []

        if "stock_data_dict" not in st.session_state or not st.session_state["stock_data_dict"]:
            st.warning("⚠️ Please first select and plot some stocks in the Charts tab")
        if "api_key" not in st.session_state or not st.session_state["api_key"]:
            st.warning("⚠️ Please enter your OpenRouter API key Or Gemini API keys in the sidebar to enable AI insights.")
            st.markdown("""
                        <hr>
                        <div style='text-align: center; font-size: 15px;'>
                        You can get your OpenRouter API Keys and Gemini API Keys here : </b><br>
                        <a href='https://openrouter.ai/' target='_blank'>OpenRouter</a> |
                        <a href='https://aistudio.google.com/' target='_blank'>Gemini API Keys</a>
                        </div>
                        """, unsafe_allow_html=True)
        else:
            st.markdown("Ask anything you want to know about Finance and about the selected stocks. For example :")
            st.markdown("- *Compare Tesla and Apple performance based on time Period*")
            st.markdown("- *Is Google a good buy now based on the data?*")
            st.markdown("- *Exlpain APR in Simple terms*")
                        
            # --- Display Chat History ---

            for msg in st.session_state["chat_history"]:
                if msg["role"] == "user":
                    st.markdown(f"<div class='chat-bubble-user'>YOU 💬🕵️: {msg['content']}</div>", unsafe_allow_html=True)
                else:
                    st.markdown(f"<div class='chat-bubble-bot'>AI 🧠💰: {msg['content']}</div>", unsafe_allow_html=True)
            
            st.markdown("\n")
            # --- User Query Input ---
            user_query = st.chat_input("Ask Fin-Robo about your selected stocks...")

            if user_query:
                # Add user message right away
                st.session_state["chat_history"].append({"role": "user", "content": user_query})

                with st.spinner("Thinking..."):
                    tickers = list(st.session_state["stock_data_dict"].keys())
                    period = st.session_state["period"]

                    combined_df = pd.concat(
                        [df["Close"].rename(t) for t, df in st.session_state["stock_data_dict"].items()],
                        axis=1
                    )
                    summary_text = combined_df.describe().to_string()

                    context = st.session_state["ai_summary"]
                    full_prompt = f"""
                    You are Fin-Robo, an AI financial analyst.
                    User question: {user_query}
                    Selected stocks: {tickers} over {period}.
                    Previous context:\n{context}\n
                    Data Summary:\n{summary_text}\n
                    Just obey the conditions and Provide a professional, human-like financial insight
                    
                    Condition-1: If you doesnt have any one of the Comapanies data, 
                    you just say "You have forgetten to add the (name of missing data of the company) stocks , Please first select and plot some stocks in the Charts tab"
                    Dont provide any analysis untill you get all the data require to say process the user query
                    
                    Contidition - 2: Dont process user request if it is rather than finance,
                    if anything is not relevent to finance just say this :
                        ("The topic (User_query's topic) is not related to finance, 
                        please ask anything related to finance")
                    """

                    # --- Call AI safely ---
                    
                    try:
                        response_text = analyze_stocks_with_ai_prompt(full_prompt,api_key, model_name, provider)
                    except Exception as e:
                        response_text = f"⚠️ Error while analyzing: {e}"

                    # Replace animation with letter-by-letter typing
                    typing_placeholder = st.empty()
                    typed = ""

                    for ch in response_text:
                        typed += ch
                        typing_placeholder.markdown(
                            f"<div class='chat-bubble-bot'>🤖 {typed}</div>",
                            unsafe_allow_html=True
                        )
                        time.sleep(0.0015)   # typing speed (lower = faster)

                    # Update chat + summary
                    st.session_state["chat_history"].append({"role": "bot", "content": response_text})
                    st.session_state["ai_summary"] += f"\n\nUser: {user_query}\nFin-Robo: {response_text}"
                    # Rerun to refresh chat UI
                    st.rerun()

# ----------------- Footer ------------------
st.markdown("""
<hr>
<div style='text-align: center; font-size: 15px;'>
👨‍💻 Built with ❤️ by <b>Narendran Karthikeyan🌳</b><br>
<a href='https://github.com/iamnarendran' target='_blank'>GitHub</a> |
<a href='https://www.linkedin.com/in/narendran-karthikeyan%F0%9F%8C%B3-95862423b' target='_blank'>LinkedIn</a>
</div>
""", unsafe_allow_html=True)
