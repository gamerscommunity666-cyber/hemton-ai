const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const form = document.getElementById("composer");
const promptBox = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const status = document.getElementById("status");
const clearBtn = document.getElementById("clearBtn");

/* ===== HISTORY ELEMENTS ===== */

const historyBtn = document.getElementById("historyBtn");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("closeSidebar");
const sidebarNewChat = document.getElementById("sidebarNewChat");
const historyList = document.getElementById("historyList");
const sidebarOverlay =
  document.getElementById("sidebarOverlay");

/* =========================================================
   HEMTON CHAT STORAGE
   ========================================================= */

let messages = JSON.parse(
  localStorage.getItem("hemton_messages") || "[]"
);

let memory = JSON.parse(
  localStorage.getItem("hemton_memory") || "[]"
);

/*
   Each conversation is stored separately.
*/

let chats = JSON.parse(
  localStorage.getItem("hemton_chats") || "[]"
);

let activeChatId = localStorage.getItem(
  "hemton_active_chat"
);

/* =========================================================
   SAVE
   ========================================================= */

function save() {

  localStorage.setItem(
    "hemton_messages",
    JSON.stringify(messages)
  );

  localStorage.setItem(
    "hemton_memory",
    JSON.stringify(memory)
  );

  localStorage.setItem(
    "hemton_chats",
    JSON.stringify(chats)
  );

  if (activeChatId) {

    localStorage.setItem(
      "hemton_active_chat",
      activeChatId
    );

  }
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(s) {

  return String(s).replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
  );
}

/* =========================================================
   CREATE CHAT
   ========================================================= */

function createChat() {

  const id =
    Date.now().toString() +
    Math.random()
      .toString(36)
      .slice(2);

  const newChat = {

    id,

    title: "New chat",

    messages: [],

    memory: [],

    createdAt: Date.now(),

    updatedAt: Date.now()

  };

  chats.unshift(newChat);

  activeChatId = id;

  messages = [];

  memory = [];

  save();

  render();

  renderHistory();

  return newChat;
}

/* =========================================================
   GET ACTIVE CHAT
   ========================================================= */

function getActiveChat() {

  return chats.find(
    c => c.id === activeChatId
  );
}

/* =========================================================
   SAVE CURRENT CHAT
   ========================================================= */

function saveCurrentChat() {

  if (!activeChatId) {
    return;
  }

  const current =
    getActiveChat();

  if (!current) {
    return;
  }

  current.messages =
    [...messages];

  current.memory =
    [...memory];

  current.updatedAt =
    Date.now();

  if (messages.length > 0) {

    const firstUserMessage =
      messages.find(
        m => m.role === "user"
      );

    if (firstUserMessage) {

      current.title =
        firstUserMessage.content
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 40);

      if (
        firstUserMessage.content.length > 40
      ) {

        current.title += "…";

      }

    }

  }

  save();
}

/* =========================================================
   LOAD CHAT
   ========================================================= */

function loadChat(id) {

  const selected =
    chats.find(
      c => c.id === id
    );

  if (!selected) {
    return;
  }

  activeChatId =
    selected.id;

  messages =
    Array.isArray(selected.messages)
      ? [...selected.messages]
      : [];

  memory =
    Array.isArray(selected.memory)
      ? [...selected.memory]
      : [];

  save();

  render();

  renderHistory();

  closeHistory();
}

/* =========================================================
   RENDER CHAT
   ========================================================= */

function render() {

  document
    .querySelectorAll(".message")
    .forEach(
      x => x.remove()
    );

  welcome.style.display =
    messages.length
      ? "none"
      : "";

  for (const m of messages) {

    const row =
      document.createElement("div");

    row.className =
      `message ${m.role}`;

    const av =
      m.role === "assistant"
        ? '<div class="avatar">H</div>'
        : "";

    row.innerHTML = `
      ${av}

      <div class="bubble">
        ${escapeHtml(m.content)}
      </div>
    `;

    chat.appendChild(row);
  }

  window.scrollTo(
    0,
    document.body.scrollHeight
  );
}

/* =========================================================
   ADD MESSAGE
   ========================================================= */

function add(role, content) {

  messages.push({
    role,
    content
  });

  saveCurrentChat();

  render();

  renderHistory();
}

/* =========================================================
   HISTORY UI
   ========================================================= */

function renderHistory() {

  if (!historyList) {
    return;
  }

  historyList.innerHTML = "";

  if (!chats.length) {

    historyList.innerHTML = `
      <div class="history-empty">
        Your conversations will appear here.
      </div>
    `;

    return;
  }

  for (const item of chats) {

    const button =
      document.createElement("button");

    button.className =
      "history-item";

    button.textContent =
      item.title || "New chat";

    if (
      item.id === activeChatId
    ) {

      button.style.borderColor =
        "rgba(110,245,210,.45)";

      button.style.background =
        "rgba(110,245,210,.08)";

    }

    button.onclick = () => {

      loadChat(item.id);

    };

    historyList.appendChild(
      button
    );
  }
}

/* =========================================================
   OPEN HISTORY
   ========================================================= */

function openHistory() {

  if (!sidebar) {
    return;
  }

  sidebar.classList.add("open");

  if (sidebarOverlay) {

    sidebarOverlay.classList.add(
      "open"
    );

  }

  renderHistory();
}

/* =========================================================
   CLOSE HISTORY
   ========================================================= */

function closeHistory() {

  if (sidebar) {

    sidebar.classList.remove(
      "open"
    );

  }

  if (sidebarOverlay) {

    sidebarOverlay.classList.remove(
      "open"
    );

  }
}

/* =========================================================
   HISTORY BUTTON
   ========================================================= */

if (historyBtn) {

  historyBtn.onclick = () => {

    if (
      sidebar &&
      sidebar.classList.contains("open")
    ) {

      closeHistory();

    } else {

      openHistory();

    }

  };

}

/* =========================================================
   CLOSE BUTTON
   ========================================================= */

if (closeSidebar) {

  closeSidebar.onclick =
    closeHistory;

}

/* =========================================================
   OVERLAY CLOSE
   ========================================================= */

if (sidebarOverlay) {

  sidebarOverlay.onclick =
    closeHistory;

}

/* =========================================================
   NEW CHAT
   ========================================================= */

function startNewChat() {

  saveCurrentChat();

  createChat();

  closeHistory();

  promptBox.value = "";

  promptBox.style.height =
    "auto";

  status.textContent = "";
}

/* Top-right + */

if (clearBtn) {

  clearBtn.onclick =
    startNewChat;

}

/* Sidebar + New chat */

if (sidebarNewChat) {

  sidebarNewChat.onclick =
    startNewChat;
}

/* =========================================================
   SEND
   ========================================================= */

async function send(text) {

  text = text.trim();

  if (!text) {
    return;
  }

  /*
    If there is no active conversation,
    create one automatically.
  */

  if (!activeChatId) {

    createChat();

  }

  add(
    "user",
    text
  );

  promptBox.value = "";

  promptBox.style.height =
    "auto";

  sendBtn.disabled = true;

  status.textContent =
    "Hemton is thinking…";

  /* =======================================================
     SIGMA THINKING FACE
     ======================================================= */

  const sigma =
    document.createElement("div");

  sigma.className =
    "sigma-thinking";

  sigma.innerHTML = `
    <div class="sigma-face">🗿</div>
  `;

  chat.appendChild(
    sigma
  );

  sigma.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  try {

    /* =====================================================
       IMAGE REQUEST DETECTION
       ===================================================== */

    const imageRequest =
      /\b(create|generate|make|draw|show|render|design)\b.*\b(image|picture|photo|artwork|illustration|visual)\b/i
        .test(text);

    /* =====================================================
       IMAGE GENERATION
       ===================================================== */

    if (imageRequest) {

      status.textContent =
        "HEMTON is creating your image…";

      const imageRes =
        await fetch(
          "/api/image",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                prompt: text
              })
          }
        );

      const imageData =
        await imageRes.json();

      if (!imageRes.ok) {

        throw new Error(
          imageData.error ||
          "Image generation failed."
        );

      }

      add(
        "assistant",
        "Here is your generated image. 🖼️"
      );

      const imageRow =
        document.createElement(
          "div"
        );

      imageRow.className =
        "message assistant";

      imageRow.innerHTML = `
        <div class="avatar">H</div>

        <div class="bubble">

          <img
            src="${imageData.image}"
            alt="Generated by HEMTON.AI"
            style="
              max-width:100%;
              border-radius:16px;
            "
          />

        </div>
      `;

      chat.appendChild(
        imageRow
      );

      saveCurrentChat();

      renderHistory();

      return;
    }

    /* =====================================================
       NORMAL AI CHAT
       ===================================================== */

    const res =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              messages:
                messages.slice(-20),

              memory:
                memory.slice(-30)

            })
          }
        }
      );

    const data =
      await res.json();

    if (!res.ok) {

      throw new Error(
        data.error ||
        "Server error"
      );

    }

    add(
      "assistant",
      data.reply ||
      "I didn't get a response."
    );

    /* =====================================================
       MEMORY
       ===================================================== */

    if (
      Array.isArray(data.memory)
    ) {

      memory =
        data.memory.slice(-30);

    }

    saveCurrentChat();

    renderHistory();

    /* =====================================================
       SPEAK
       ===================================================== */

    speak(
      data.reply
    );

  } catch (e) {

    console.error(e);

    add(
      "assistant",
      "I couldn't connect to my AI server yet. Check that the backend is deployed and OPENAI_API_KEY is configured."
    );

  } finally {

    /* =====================================================
       REMOVE SIGMA
       ===================================================== */

    if (
      sigma &&
      sigma.isConnected
    ) {

      sigma.remove();

    }

    sendBtn.disabled =
      false;

    status.textContent =
      "";

  }
}

/* =========================================================
   SEND FORM
   ========================================================= */

form.addEventListener(
  "submit",
  e => {

    e.preventDefault();

    send(
      promptBox.value
    );

  }
);

/* =========================================================
   TEXT BOX
   ========================================================= */

promptBox.addEventListener(
  "input",
  () => {

    promptBox.style.height =
      "auto";

    promptBox.style.height =
      Math.min(
        promptBox.scrollHeight,
        140
      ) + "px";

  }
);

/* =========================================================
   SUGGESTIONS
   ========================================================= */

document
  .querySelectorAll(
    ".suggestions button"
  )
  .forEach(
    button => {

      button.onclick = () => {

        send(
          button.textContent
        );

      };

    }
  );

/* =========================================================
   VOICE OUTPUT
   ========================================================= */

function speak(text) {

  if (
    !(
      "speechSynthesis"
      in window
    )
  ) {

    return;

  }

  speechSynthesis.cancel();

  const u =
    new SpeechSynthesisUtterance(
      text
    );

  u.rate = 0.98;

  u.pitch = 1;

  speechSynthesis.speak(u);
}

/* =========================================================
   VOICE INPUT
   ========================================================= */

const SR =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SR) {

  const rec =
    new SR();

  rec.lang =
    navigator.language ||
    "en-US";

  rec.interimResults =
    false;

  rec.onstart = () => {

    micBtn.textContent =
      "⏹️";

    status.textContent =
      "Listening…";

  };

  rec.onend = () => {

    micBtn.textContent =
      "🎙️";

    status.textContent =
      "";

  };

  rec.onresult = e => {

    promptBox.value =
      e.results[0][0]
        .transcript;

    send(
      promptBox.value
    );

  };

  micBtn.onclick = () => {

    try {

      rec.start();

    } catch {}

  };

} else {

  micBtn.disabled =
    true;

  micBtn.title =
    "Voice input is not supported in this browser";

}

/* =========================================================
   STARTUP
   ========================================================= */

/*
   Migrate the existing conversation into
   chat history without losing any messages.
*/

if (
  !chats.length &&
  messages.length
) {

  const oldMessages =
    [...messages];

  const oldMemory =
    [...memory];

  const id =
    Date.now().toString() +
    Math.random()
      .toString(36)
      .slice(2);

  const firstUser =
    oldMessages.find(
      m => m.role === "user"
    );

  let title =
    "New chat";

  if (firstUser) {

    title =
      firstUser.content
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);

    if (
      firstUser.content.length > 40
    ) {

      title += "…";

    }

  }

  chats.unshift({

    id,

    title,

    messages:
      oldMessages,

    memory:
      oldMemory,

    createdAt:
      Date.now(),

    updatedAt:
      Date.now()

  });

  activeChatId =
    id;

  save();
}

/*
   If an active chat exists,
   load its saved messages.
*/

if (
  activeChatId &&
  getActiveChat()
) {

  const active =
    getActiveChat();

  messages =
    Array.isArray(
      active.messages
    )
      ? [...active.messages]
      : [];

  memory =
    Array.isArray(
      active.memory
    )
      ? [...active.memory]
      : [];

}

/*
   If the saved active chat
   no longer exists, reset safely.
*/

if (
  activeChatId &&
  !getActiveChat()
) {

  activeChatId =
    null;

  messages = [];

  memory = [];

  localStorage.removeItem(
    "hemton_active_chat"
  );

  save();
}

/* =========================================================
   START HEMTON
   ========================================================= */

render();

renderHistory();