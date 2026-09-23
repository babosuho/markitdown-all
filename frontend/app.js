// Frontend Application Logic
const DEFAULT_CLOUD_API = "https://markitdown-all-production.up.railway.app";
let storedApi = localStorage.getItem("API_BASE_URL");
if (storedApi && storedApi.includes("localhost") && !window.location.origin.includes("localhost")) {
  localStorage.removeItem("API_BASE_URL");
  storedApi = null;
}
let API_BASE = storedApi || (
  window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
    ? window.location.origin
    : DEFAULT_CLOUD_API
);

let convertedItems = [];
let currentPreviewIndex = null;
let currentFilesToZip = [];
let isVisionModeActive = localStorage.getItem("VISION_MODE_ACTIVE") !== "false"; // Default to true if not explicitly false
let serverHasDefaultKey = false;

// DOM Elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileListContainer = document.getElementById("fileListContainer");
const resultsSection = document.getElementById("resultsSection");
const resultCountBadge = document.getElementById("resultCountBadge");
const loadingIndicator = document.getElementById("loadingIndicator");
const downloadAllZipBtn = document.getElementById("downloadAllZipBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const frontmatterToggle = document.getElementById("frontmatterToggle");
const frontmatterTags = document.getElementById("frontmatterTags");
const backendStatus = document.getElementById("backendStatus");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");

// Vision AI DOM Elements
const visionToggleBtn = document.getElementById("visionToggleBtn");
const visionToggleLabel = document.getElementById("visionToggleLabel");
const visionIcon = document.getElementById("visionIcon");
const apiKeySettingsBtn = document.getElementById("apiKeySettingsBtn");
const apiKeyModal = document.getElementById("apiKeyModal");
const geminiApiKeyInput = document.getElementById("geminiApiKeyInput");
const apiKeyServerNotice = document.getElementById("apiKeyServerNotice");

// Modal Elements
const previewModal = document.getElementById("previewModal");
const modalFilename = document.getElementById("modalFilename");
const modalRenderedView = document.getElementById("modalRenderedView");
const modalRawView = document.getElementById("modalRawView");
const modalCopyBtn = document.getElementById("modalCopyBtn");
const previewTabRendered = document.getElementById("previewTabRendered");
const previewTabRaw = document.getElementById("previewTabRaw");

// Initialize Vision UI State
function updateVisionUI() {
  const hasLocalKey = Boolean(localStorage.getItem("GEMINI_API_KEY"));
  const hasKey = hasLocalKey || serverHasDefaultKey;

  if (isVisionModeActive) {
    visionToggleBtn.className = "px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 flex items-center gap-1.5 transition font-medium shadow-sm shadow-indigo-500/20";
    visionToggleLabel.textContent = serverHasDefaultKey ? "비전 AI(서버 기본 장착): ON" : "비전 AI 모드: ON";
    visionIcon.className = "fa-solid fa-wand-magic-sparkles text-amber-300 animate-pulse";
  } else {
    visionToggleBtn.className = "px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 flex items-center gap-1.5 transition font-medium";
    visionToggleLabel.textContent = "비전 AI: OFF";
    visionIcon.className = "fa-solid fa-wand-magic-sparkles text-slate-500";
  }

  if (hasKey) {
    apiKeySettingsBtn.className = "px-2.5 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900/60 transition";
    apiKeySettingsBtn.title = serverHasDefaultKey ? "서버 기본 API Key 활성화됨" : "Gemini API Key 등록됨";
  } else {
    apiKeySettingsBtn.className = "px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition";
    apiKeySettingsBtn.title = "Gemini API Key 설정 필요";
  }

  if (apiKeyServerNotice) {
    if (serverHasDefaultKey) {
      apiKeyServerNotice.className = "p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300";
      apiKeyServerNotice.innerHTML = "✅ <b>서버에 Gemini API Key 탑재 완료!</b> 별도 키 입력 없이 모든 기기에서 비전 AI를 바로 사용하실 수 있습니다. (개인 키를 입력하면 개인 키가 우선 적용됩니다)";
    } else {
      apiKeyServerNotice.className = "p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400";
      apiKeyServerNotice.innerHTML = "💡 <b>키 등록 안내:</b> 여기에 입력한 키는 현재 브라우저에 안전하게 보관됩니다. (또는 Railway 대시보드 Variables에 <code>GEMINI_API_KEY</code>를 등록하시면 모든 기기에서 자동 적용됩니다)";
    }
  }
}
updateVisionUI();

// Vision Mode Toggle Handler
visionToggleBtn.addEventListener("click", () => {
  const hasKey = Boolean(localStorage.getItem("GEMINI_API_KEY")) || serverHasDefaultKey;
  if (!isVisionModeActive && !hasKey) {
    openApiKeyModal();
    return;
  }
  isVisionModeActive = !isVisionModeActive;
  localStorage.setItem("VISION_MODE_ACTIVE", isVisionModeActive);
  updateVisionUI();
  showToast(isVisionModeActive ? "비전 AI 모드가 활성화되었습니다." : "비전 AI 모드가 비활성화되었습니다.");
});

// API Key Modal Controls
apiKeySettingsBtn.addEventListener("click", openApiKeyModal);

function openApiKeyModal() {
  geminiApiKeyInput.value = localStorage.getItem("GEMINI_API_KEY") || "";
  apiKeyModal.classList.remove("hidden");
  geminiApiKeyInput.focus();
}

function closeApiKeyModal() {
  apiKeyModal.classList.add("hidden");
}

function saveApiKey() {
  const key = geminiApiKeyInput.value.trim();
  if (!key) {
    alert("API Key를 입력해 주세요.");
    return;
  }
  localStorage.setItem("GEMINI_API_KEY", key);
  isVisionModeActive = true;
  localStorage.setItem("VISION_MODE_ACTIVE", "true");
  updateVisionUI();
  closeApiKeyModal();
  checkHealth();
  showToast("Gemini API Key가 안전하게 저장되었습니다.");
}

function clearApiKey() {
  localStorage.removeItem("GEMINI_API_KEY");
  isVisionModeActive = serverHasDefaultKey;
  localStorage.setItem("VISION_MODE_ACTIVE", isVisionModeActive ? "true" : "false");
  geminiApiKeyInput.value = "";
  updateVisionUI();
  closeApiKeyModal();
  checkHealth();
  showToast("API Key가 삭제되었습니다.");
}

// Server Modal Controls
const serverModal = document.getElementById("serverModal");
const apiServerUrlInput = document.getElementById("apiServerUrlInput");

function openServerModal() {
  apiServerUrlInput.value = localStorage.getItem("API_BASE_URL") || API_BASE;
  serverModal.classList.remove("hidden");
  apiServerUrlInput.focus();
}

function closeServerModal() {
  serverModal.classList.add("hidden");
}

function saveServerUrl() {
  let url = apiServerUrlInput.value.trim();
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (url) {
    localStorage.setItem("API_BASE_URL", url);
    API_BASE = url;
    showToast("백엔드 서버 주소가 저장되었습니다.");
  }
  closeServerModal();
  checkHealth();
}

function resetServerUrl() {
  localStorage.removeItem("API_BASE_URL");
  API_BASE = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
    ? window.location.origin
    : DEFAULT_CLOUD_API;
  apiServerUrlInput.value = API_BASE;
  showToast("기본 호스트로 초기화되었습니다.");
  closeServerModal();
  checkHealth();
}

// Check Health on Load with Timeout
async function checkHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      serverHasDefaultKey = Boolean(data.has_default_api_key);
      const hasLocalKey = Boolean(localStorage.getItem("GEMINI_API_KEY"));
      
      const serverType = API_BASE.includes("railway") ? "Railway Cloud" : "v" + data.version;
      const keyStatusText = serverHasDefaultKey
        ? '<span class="text-emerald-400 font-medium">비전 AI 준비됨</span>'
        : (hasLocalKey ? '<span class="text-emerald-400 font-medium">개인 키 활성</span>' : '<span class="text-amber-400 font-medium">Gemini 키 등록 필요</span>');

      backendStatus.innerHTML = `<span class="text-emerald-400">●</span> 백엔드 연결됨 (${serverType}) · ${keyStatusText}`;
      
      if (serverHasDefaultKey || hasLocalKey) {
        if (localStorage.getItem("VISION_MODE_ACTIVE") !== "false") {
          isVisionModeActive = true;
        }
      }
      updateVisionUI();
    } else {
      backendStatus.innerHTML = `<span class="text-amber-400">●</span> 백엔드 응답 오류 (${res.status})`;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    backendStatus.innerHTML = `<span class="text-rose-400">●</span> 백엔드 연결 실패 (${API_BASE})`;
  }
}
checkHealth();

// Drag & Drop Listeners
dropZone.addEventListener("click", () => fileInput.click());

["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add("border-indigo-400", "bg-indigo-950/30");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-indigo-400", "bg-indigo-950/30");
  });
});

dropZone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileUpload(files);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFileUpload(e.target.files);
  }
});

// File Upload & Conversion
async function handleFileUpload(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) return;

  resultsSection.classList.remove("hidden");
  loadingIndicator.classList.remove("hidden");
  loadingIndicator.classList.add("flex");

  const formData = new FormData();
  files.forEach(file => {
    formData.append("files", file);
  });
  formData.append("enable_frontmatter", frontmatterToggle.checked);
  formData.append("tags", frontmatterTags.value.trim());

  // Attach Vision AI parameters
  const apiKey = localStorage.getItem("GEMINI_API_KEY") || "";
  formData.append("use_vision", isVisionModeActive);
  if (apiKey) {
    formData.append("api_key", apiKey);
  }

  currentFilesToZip = files;

  try {
    const response = await fetch(`${API_BASE}/api/convert`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Append or replace results
    data.results.forEach(item => {
      convertedItems.unshift(item);
    });

    renderFileList();
    showToast(`${data.success_count}개 파일 변환이 완료되었습니다.`);
  } catch (error) {
    alert(`변환 중 오류 발생: ${error.message}`);
  } finally {
    loadingIndicator.classList.add("hidden");
    loadingIndicator.classList.remove("flex");
    fileInput.value = "";
  }
}

// Render Converted File Cards
function renderFileList() {
  fileListContainer.innerHTML = "";
  resultCountBadge.textContent = `${convertedItems.length}건`;

  if (convertedItems.length > 0) {
    downloadAllZipBtn.disabled = false;
  } else {
    downloadAllZipBtn.disabled = true;
    resultsSection.classList.add("hidden");
    return;
  }

  convertedItems.forEach((item, index) => {
    const ext = item.filename.split(".").pop().toLowerCase();
    const badgeColor = getBadgeColor(ext);
    const isVision = item.parser_used.includes("Vision");

    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all";

    if (!item.success) {
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="px-2 py-1 rounded text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">오류</span>
          <div>
            <div class="font-medium text-slate-300 text-sm">${escapeHtml(item.filename)}</div>
            <div class="text-xs text-rose-400 mt-0.5">${escapeHtml(item.error || "알 수 없는 오류")}</div>
          </div>
        </div>
      `;
      fileListContainer.appendChild(card);
      return;
    }

    card.innerHTML = `
      <div class="flex items-start sm:items-center gap-3 min-w-0">
        <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${badgeColor.bg} ${badgeColor.text} border ${badgeColor.border} uppercase shrink-0">
          ${ext}
        </span>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-white text-sm truncate">${escapeHtml(item.filename)}</span>
            <i class="fa-solid fa-arrow-right text-[10px] text-slate-500"></i>
            <span class="text-xs text-indigo-300 font-mono truncate">${escapeHtml(item.md_filename)}</span>
          </div>
          <div class="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
            <span class="${isVision ? 'text-amber-300 font-semibold' : ''}">
              <i class="fa-solid ${isVision ? 'fa-wand-magic-sparkles text-amber-400' : 'fa-microchip text-slate-500'} mr-1"></i>
              ${escapeHtml(item.parser_used)}
            </span>
            <span>•</span>
            <span>${item.char_count.toLocaleString()}자 (${item.line_count.toLocaleString()}줄)</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        <button onclick="previewFile(${index})" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition">
          <i class="fa-solid fa-eye text-slate-400"></i>
          <span>미리보기</span>
        </button>
        <button onclick="copyContent(${index})" class="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 text-xs font-medium flex items-center gap-1 transition">
          <i class="fa-solid fa-copy"></i>
          <span>복사</span>
        </button>
        <button onclick="downloadMdFile(${index})" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1 transition">
          <i class="fa-solid fa-download"></i>
          <span>.md</span>
        </button>
      </div>
    `;

    fileListContainer.appendChild(card);
  });
}

function getBadgeColor(ext) {
  switch (ext) {
    case "pdf":
      return { bg: "bg-red-950/60", text: "text-red-400", border: "border-red-800/60" };
    case "docx":
    case "doc":
      return { bg: "bg-blue-950/60", text: "text-blue-400", border: "border-blue-800/60" };
    case "pptx":
    case "ppt":
      return { bg: "bg-orange-950/60", text: "text-orange-400", border: "border-orange-800/60" };
    case "xlsx":
    case "xls":
    case "csv":
      return { bg: "bg-emerald-950/60", text: "text-emerald-400", border: "border-emerald-800/60" };
    case "hwpx":
    case "hwp":
      return { bg: "bg-violet-950/60", text: "text-violet-300", border: "border-violet-700/60" };
    default:
      return { bg: "bg-slate-800", text: "text-slate-300", border: "border-slate-700" };
  }
}

// Copy to Clipboard
function copyContent(index) {
  const item = convertedItems[index];
  if (!item || !item.markdown) return;

  navigator.clipboard.writeText(item.markdown).then(() => {
    showToast(`'${item.filename}' 내용이 클립보드에 복사되었습니다!`);
  }).catch(err => {
    alert("클립보드 복사 실패: " + err);
  });
}

// Download Single .md File
function downloadMdFile(index) {
  const item = convertedItems[index];
  if (!item || !item.markdown) return;

  const blob = new Blob([item.markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = item.md_filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download All as ZIP
downloadAllZipBtn.addEventListener("click", async () => {
  if (convertedItems.length === 0) return;

  downloadAllZipBtn.disabled = true;
  downloadAllZipBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> 압축 생성 중...`;

  try {
    if (currentFilesToZip.length > 0) {
      const formData = new FormData();
      currentFilesToZip.forEach(file => formData.append("files", file));
      formData.append("enable_frontmatter", frontmatterToggle.checked);
      formData.append("tags", frontmatterTags.value.trim());

      const apiKey = localStorage.getItem("GEMINI_API_KEY") || "";
      formData.append("use_vision", isVisionModeActive);
      if (apiKey) formData.append("api_key", apiKey);

      const res = await fetch(`${API_BASE}/api/convert/zip`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("ZIP 생성 실패");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all-converted-markdown.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("전체 ZIP 파일 다운로드가 시작되었습니다.");
    }
  } catch (err) {
    alert("ZIP 다운로드 중 오류: " + err.message);
  } finally {
    downloadAllZipBtn.disabled = false;
    downloadAllZipBtn.innerHTML = `<i class="fa-solid fa-file-zipper mr-1"></i> 전체 ZIP 다운로드`;
  }
});

// Clear All
clearAllBtn.addEventListener("click", () => {
  convertedItems = [];
  currentFilesToZip = [];
  renderFileList();
});

// Preview Modal Functions
function previewFile(index) {
  const item = convertedItems[index];
  if (!item) return;

  currentPreviewIndex = index;
  modalFilename.textContent = `${item.filename} (${item.char_count.toLocaleString()}자)`;
  modalRawView.textContent = item.markdown;
  
  modalRenderedView.innerHTML = marked.parse(item.markdown);

  setPreviewTab("rendered");
  previewModal.classList.remove("hidden");
}

function closePreviewModal() {
  previewModal.classList.add("hidden");
  currentPreviewIndex = null;
}

function setPreviewTab(tab) {
  if (tab === "rendered") {
    modalRenderedView.classList.remove("hidden");
    modalRawView.classList.add("hidden");
    previewTabRendered.className = "px-3 py-1 rounded-md bg-indigo-600 text-white font-medium";
    previewTabRaw.className = "px-3 py-1 rounded-md text-slate-400 hover:text-white font-medium";
  } else {
    modalRenderedView.classList.add("hidden");
    modalRawView.classList.remove("hidden");
    previewTabRendered.className = "px-3 py-1 rounded-md text-slate-400 hover:text-white font-medium";
    previewTabRaw.className = "px-3 py-1 rounded-md bg-indigo-600 text-white font-medium";
  }
}

modalCopyBtn.addEventListener("click", () => {
  if (currentPreviewIndex !== null) {
    copyContent(currentPreviewIndex);
  }
});

// Close modal on click outside or ESC
previewModal.addEventListener("click", (e) => {
  if (e.target === previewModal) closePreviewModal();
});
apiKeyModal.addEventListener("click", (e) => {
  if (e.target === apiKeyModal) closeApiKeyModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePreviewModal();
    closeApiKeyModal();
  }
});

// Toast Helper
let toastTimer = null;
function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.remove("translate-y-16", "opacity-0");
  toast.classList.add("translate-y-0", "opacity-100");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("translate-y-16", "opacity-0");
    toast.classList.remove("translate-y-0", "opacity-100");
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function(m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m];
  });
}
