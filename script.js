const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn = document.getElementById("saveKey");
const resetChatBtn = document.getElementById("resetChat");

const HF_ENDPOINT = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct";

if (localStorage.getItem("hf_api_key")) {
  apiKeyInput.value = localStorage.getItem("hf_api_key");
}

function addMessage(content, sender) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = content;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return msg;
}

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) return alert("Please enter a valid Hugging Face API key.");
  localStorage.setItem("hf_api_key", key);
  alert("API key saved!");
});

resetChatBtn.addEventListener("click", () => {
  chatContainer.innerHTML = "";
});

sendBtn.addEventListener("click", async () => {
  const userMessage = userInput.value.trim();
  const apiKey = localStorage.getItem("hf_api_key");
  if (!userMessage) return;
  if (!apiKey) return alert("Please enter and save your Hugging Face API key first.");

  addMessage(userMessage, "user");
  userInput.value = "";
  const botMsg = addMessage("", "bot");

  try {
    const response = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: userMessage,
        stream: true,
        parameters: { max_new_tokens: 200, temperature: 0.7 }
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let partial = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      partial += decoder.decode(value, { stream: true });

      // Parse chunks of text if possible
      const lines = partial.split("\n");
      for (const line of lines) {
        if (line.trim().startsWith("data:")) {
          try {
            const data = JSON.parse(line.replace("data:", "").trim());
            const text = data.token?.text || "";
            if (text) {
              botMsg.textContent += text;
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } catch (e) {
            /* ignore malformed partial chunks */
          }
        }
      }
    }
  } catch (err) {
    botMsg.textContent = "⚠️ Streaming failed. Check your API key or model support.";
    console.error(err);
  }
});
