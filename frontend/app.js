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

// Google Drive DOM Elements
const gdriveSettingsBtn = document.getElementById("gdriveSettingsBtn");
const gdriveBtnLabel = document.getElementById("gdriveBtnLabel");
const gdriveModal = document.getElementById("gdriveModal");
const gdriveWebhookInput = document.getElementById("gdriveWebhookInput");
const gdriveAutoSaveToggle = document.getElementById("gdriveAutoSaveToggle");
const gdriveStatusBadge = document.getElementById("gdriveStatusBadge");
const uploadAllGdriveBtn = document.getElementById("uploadAllGdriveBtn");
const uploadAllGdriveText = document.getElementById("uploadAllGdriveText");

// PWA & Token Quota DOM Elements
const pwaInstallBtn = document.getElementById("pwaInstallBtn");
const tokenQuotaBtn = document.getElementById("tokenQuotaBtn");
const tokenQuotaBadge = document.getElementById("tokenQuotaBadge");
const tokenModal = document.getElementById("tokenModal");
const statRemainingQuota = document.getElementById("statRemainingQuota");
const statTodayRequests = document.getElementById("statTodayRequests");
const statTodayTokens = document.getElementById("statTodayTokens");

// Workspace Tabs & URL Scraper DOM Elements
const tabModeFiles = document.getElementById("tabModeFiles");
const tabModeUrl = document.getElementById("tabModeUrl");
const urlInputZone = document.getElementById("urlInputZone");
const webUrlInput = document.getElementById("webUrlInput");
const crawlSubpagesToggle = document.getElementById("crawlSubpagesToggle");
const convertUrlBtn = document.getElementById("convertUrlBtn");
const convertUrlBtnText = document.getElementById("convertUrlBtnText");
const discoverSubpagesBtn = document.getElementById("discoverSubpagesBtn");
const discoverSubpagesBtnText = document.getElementById("discoverSubpagesBtnText");

// Subpage Selection Modal Elements
const subpageSelectModal = document.getElementById("subpageSelectModal");
const subpageCountBadge = document.getElementById("subpageCountBadge");
const subpageBaseDomainText = document.getElementById("subpageBaseDomainText");
const subpageFilterInput = document.getElementById("subpageFilterInput");
const subpageListContainer = document.getElementById("subpageListContainer");
const subpageSelectedCount = document.getElementById("subpageSelectedCount");
const convertSelectedSubpagesBtn = document.getElementById("convertSelectedSubpagesBtn");
const convertSelectedSubpagesBtnText = document.getElementById("convertSelectedSubpagesBtnText");

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

// ==========================================
// Google Drive Webhook Integration
// ==========================================
const GAS_CODE_TEMPLATE = `// ==========================================
// All-to-Markdown -> 구글 드라이브 자동 저장 스크립트
// ==========================================

// 1. 저장할 구글 드라이브 폴더 주소, 폴더 ID, 또는 폴더 이름을 입력하세요.
// 비워두면 내 드라이브에 'MarkItDown' 폴더를 자동으로 생성하여 저장합니다!
var FOLDER_ID = "";

function extractFolderId(input) {
  if (!input) return "";
  var str = input.trim();
  var match = str.match(/folders\\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return str.replace(/['"\\s]/g, "");
}

function resolveTargetFolder() {
  var raw = (FOLDER_ID || "").trim();
  var cleanId = extractFolderId(raw);

  // 1. 폴더 ID 또는 폴더 URL로 조회 시도
  if (cleanId) {
    try {
      return DriveApp.getFolderById(cleanId);
    } catch (e1) {
      // 2. ID 조회 실패 시 입력값을 폴더 이름으로 검색 시도
      try {
        var byName = DriveApp.getFoldersByName(raw);
        if (byName.hasNext()) return byName.next();
      } catch (e2) {}
    }
  }

  // 3. 비어있거나 찾을 수 없는 경우: 'MarkItDown' 전용 폴더 자동 생성/사용
  try {
    var defaultFolders = DriveApp.getFoldersByName("MarkItDown");
    if (defaultFolders.hasNext()) {
      return defaultFolders.next();
    } else {
      return DriveApp.createFolder("MarkItDown");
    }
  } catch (e3) {
    // 4. 최후의 수단: 내 드라이브 최상위 루트
    return DriveApp.getRootFolder();
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var filename = payload.filename || ("document_" + new Date().getTime() + ".md");
    var markdown = payload.markdown || "";

    var folder = resolveTargetFolder();

    // 동일한 파일명이 이미 있으면 최신 내용으로 갱신
    var existingFiles = folder.getFilesByName(filename);
    var file;
    if (existingFiles.hasNext()) {
      file = existingFiles.next();
      file.setContent(markdown);
    } else {
      file = folder.createFile(filename, markdown, MimeType.PLAIN_TEXT);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      filename: filename,
      folder_name: folder.getName(),
      folder_id: folder.getId(),
      folder_url: folder.getUrl(),
      url: file.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    service: "MarkItDown Google Drive Webhook"
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

function updateGdriveFolderBanner() {
  const folderBox = document.getElementById("gdriveFolderInfoBox");
  const folderNameEl = document.getElementById("gdriveDetectedFolderName");
  const folderIdEl = document.getElementById("gdriveDetectedFolderId");
  const folderLinkEl = document.getElementById("gdriveFolderLink");

  const storedFolder = localStorage.getItem("GDRIVE_FOLDER_NAME");
  const storedFolderId = localStorage.getItem("GDRIVE_FOLDER_ID") || "root";
  const storedFolderUrl = localStorage.getItem("GDRIVE_FOLDER_URL") || "https://drive.google.com";

  if (storedFolder && folderBox) {
    folderBox.classList.remove("hidden");
    if (folderNameEl) folderNameEl.textContent = storedFolder;
    if (folderIdEl) folderIdEl.textContent = `ID: ${storedFolderId}`;
    if (folderLinkEl) folderLinkEl.href = storedFolderUrl;
  } else if (folderBox) {
    folderBox.classList.add("hidden");
  }
}

function updateGdriveUI() {
  const webhookUrl = localStorage.getItem("GDRIVE_WEBHOOK_URL") || "";
  const isAutoSave = localStorage.getItem("GDRIVE_AUTO_SAVE") === "true";

  if (gdriveAutoSaveToggle) {
    gdriveAutoSaveToggle.checked = isAutoSave;
  }

  updateGdriveFolderBanner();

  if (webhookUrl) {
    if (gdriveSettingsBtn) {
      gdriveSettingsBtn.className = "px-2.5 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900/60 transition flex items-center gap-1.5";
      gdriveSettingsBtn.title = "구글 드라이브 연동 활성화됨";
    }
    if (gdriveBtnLabel) {
      const storedFolder = localStorage.getItem("GDRIVE_FOLDER_NAME");
      gdriveBtnLabel.textContent = storedFolder ? `드라이브: ${storedFolder}` : "드라이브 연동됨";
    }
    if (gdriveStatusBadge) {
      gdriveStatusBadge.className = "text-[10px] text-emerald-400 font-medium";
      gdriveStatusBadge.textContent = "연동 활성";
    }
    if (uploadAllGdriveBtn && convertedItems.length > 0) {
      uploadAllGdriveBtn.disabled = false;
    }
  } else {
    if (gdriveSettingsBtn) {
      gdriveSettingsBtn.className = "px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition flex items-center gap-1.5";
      gdriveSettingsBtn.title = "구글 드라이브 특정 폴더 저장 설정";
    }
    if (gdriveBtnLabel) {
      gdriveBtnLabel.textContent = "드라이브 설정";
    }
    if (gdriveStatusBadge) {
      gdriveStatusBadge.className = "text-[10px] text-slate-500 font-normal";
      gdriveStatusBadge.textContent = "미등록";
    }
    if (uploadAllGdriveBtn) {
      uploadAllGdriveBtn.disabled = true;
    }
  }
}
updateGdriveUI();

function openGdriveModal() {
  gdriveWebhookInput.value = localStorage.getItem("GDRIVE_WEBHOOK_URL") || "";
  gdriveAutoSaveToggle.checked = localStorage.getItem("GDRIVE_AUTO_SAVE") === "true";
  updateGdriveUI();
  gdriveModal.classList.remove("hidden");
  gdriveWebhookInput.focus();
}

function closeGdriveModal() {
  gdriveModal.classList.add("hidden");
}

function saveGdriveWebhook() {
  const url = gdriveWebhookInput.value.trim();
  if (url && !url.startsWith("https://script.google.com/")) {
    alert("올바른 Google Apps Script URL(https://script.google.com/macros/s/.../exec)을 입력해 주세요.");
    return;
  }

  if (url) {
    localStorage.setItem("GDRIVE_WEBHOOK_URL", url);
  } else {
    localStorage.removeItem("GDRIVE_WEBHOOK_URL");
  }

  localStorage.setItem("GDRIVE_AUTO_SAVE", gdriveAutoSaveToggle.checked ? "true" : "false");
  updateGdriveUI();
  closeGdriveModal();
  showToast(url ? "구글 드라이브 연동 설정이 저장되었습니다." : "구글 드라이브 설정이 초기화되었습니다.");
}

function clearGdriveWebhook() {
  localStorage.removeItem("GDRIVE_WEBHOOK_URL");
  localStorage.removeItem("GDRIVE_AUTO_SAVE");
  localStorage.removeItem("GDRIVE_FOLDER_NAME");
  localStorage.removeItem("GDRIVE_FOLDER_ID");
  localStorage.removeItem("GDRIVE_FOLDER_URL");
  gdriveWebhookInput.value = "";
  gdriveAutoSaveToggle.checked = false;
  updateGdriveUI();
  closeGdriveModal();
  showToast("구글 드라이브 연동 설정이 삭제되었습니다.");
}

function copyGasScript() {
  navigator.clipboard.writeText(GAS_CODE_TEMPLATE).then(() => {
    const copyText = document.getElementById("copyGasText");
    if (copyText) {
      copyText.textContent = "복사 완료!";
      setTimeout(() => { copyText.textContent = "스크립트 복사"; }, 2000);
    }
    showToast("구글 앱스 스크립트 코드가 복사되었습니다! script.new 에 붙여넣으세요.");
  }).catch(() => {
    prompt("아래 코드를 복사하세요:", GAS_CODE_TEMPLATE);
  });
}

async function testGdriveConnection() {
  const url = gdriveWebhookInput.value.trim();
  if (!url || !url.startsWith("https://script.google.com/")) {
    alert("테스트할 올바른 Google Apps Script URL을 먼저 입력해 주세요.");
    return;
  }

  const testBtn = document.getElementById("gdriveTestBtn");
  const originalHtml = testBtn.innerHTML;
  testBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald-400"></i><span>테스트 중...</span>';
  testBtn.disabled = true;

  try {
    const testResult = await executeGdriveUpload(url, "markitdown_connection_test.md", "# MarkItDown 연결 테스트\\n\\n구글 드라이브 연동이 성공적으로 활성화되었습니다!\\n일시: " + new Date().toLocaleString());
    if (testResult.success) {
      const folderName = testResult.folder_name || "내 드라이브";
      const folderUrl = testResult.folder_url || (testResult.folder_id ? `https://drive.google.com/drive/folders/${testResult.folder_id}` : "https://drive.google.com");
      const fileUrl = testResult.url || "";

      localStorage.setItem("GDRIVE_FOLDER_NAME", folderName);
      if (testResult.folder_id) localStorage.setItem("GDRIVE_FOLDER_ID", testResult.folder_id);
      if (folderUrl) localStorage.setItem("GDRIVE_FOLDER_URL", folderUrl);

      updateGdriveFolderBanner();

      const openTarget = folderUrl || fileUrl;
      const msg = `✅ 구글 드라이브 연결 성공!\\n\\n` +
                  `📁 실제 저장 폴더: [ ${folderName} ]\\n` +
                  `📄 생성 파일: markitdown_connection_test.md\\n\\n` +
                  (openTarget ? `확인을 누르면 구글 드라이브 해당 위치가 새 창으로 열립니다.` : ``);

      alert(msg);
      if (openTarget) {
        window.open(openTarget, "_blank");
      }
      saveGdriveWebhook();
    } else {
      alert("⚠️ 구글 드라이브 연결 실패:\\n\\n" + (testResult.error || "알 수 없는 오류가 발생했습니다.\\n\\n스크립트 FOLDER_ID가 올바른지, 배포 시 '액세스 권한: 모든 사용자(Anyone)'로 설정되었는지 확인해 주세요."));
    }
  } catch (err) {
    alert("⚠️ 테스트 중 오류 발생: " + err.message);
  } finally {
    testBtn.innerHTML = originalHtml;
    testBtn.disabled = false;
  }
}

async function executeGdriveUpload(webhookUrl, filename, markdown) {
  try {
    const res = await fetch(`${API_BASE}/api/gdrive/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        filename: filename,
        markdown: markdown,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "error") {
        return { success: false, error: data.message || "구글 드라이브 스크립트 실행 오류" };
      }
      return {
        success: true,
        url: data.url || "",
        folder_name: data.folder_name || "",
        folder_id: data.folder_id || "",
        folder_url: data.folder_url || ""
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || `서버 프록시 전송 실패 (${res.status})` };
    }
  } catch (backendErr) {
    return { success: false, error: `네트워크 또는 서버 통신 오류: ${backendErr.message}` };
  }
}

async function saveSingleToGdrive(index) {
  const item = convertedItems[index];
  if (!item || !item.markdown) return;

  const webhookUrl = localStorage.getItem("GDRIVE_WEBHOOK_URL");
  if (!webhookUrl) {
    openGdriveModal();
    showToast("구글 드라이브 웹훅 URL을 먼저 설정해 주세요.");
    return;
  }

  const btn = document.getElementById(`gdriveBtn_${index}`);
  const originalHtml = btn ? btn.innerHTML : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald-400"></i><span class="text-[11px]">저장 중...</span>';
  }

  try {
    const res = await executeGdriveUpload(webhookUrl, item.md_filename, item.markdown);
    if (res.success) {
      if (btn) {
        if (res.url) {
          btn.outerHTML = `<a href="${res.url}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-600 text-xs font-medium flex items-center gap-1 transition" title="구글 드라이브에서 열기"><i class="fa-solid fa-arrow-up-right-from-square text-emerald-300"></i><span class="text-[11px]">열기 ↗</span></a>`;
        } else {
          btn.className = "px-2.5 py-1.5 rounded-lg bg-emerald-900/80 text-emerald-200 border border-emerald-600 text-xs font-medium flex items-center gap-1 transition";
          btn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-300"></i><span class="text-[11px]">저장됨</span>';
        }
      }
      showToast(res.url ? `'${item.md_filename}' 구글 드라이브 저장 완료! [열기 ↗]로 확인하세요.` : `'${item.md_filename}' 구글 드라이브에 저장 완료!`);
    } else {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
      showToast(`저장 실패: ${res.error}`);
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
    showToast(`저장 오류: ${err.message}`);
  }
}

async function uploadAllToGdrive() {
  const webhookUrl = localStorage.getItem("GDRIVE_WEBHOOK_URL");
  if (!webhookUrl) {
    openGdriveModal();
    showToast("구글 드라이브 웹훅 URL을 먼저 설정해 주세요.");
    return;
  }

  const validItems = convertedItems.filter(item => item.success && item.markdown);
  if (validItems.length === 0) {
    showToast("저장할 변환된 문서가 없습니다.");
    return;
  }

  if (uploadAllGdriveBtn) uploadAllGdriveBtn.disabled = true;
  const originalText = uploadAllGdriveText ? uploadAllGdriveText.textContent : "드라이브 전체 저장";
  
  let successCount = 0;
  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    if (uploadAllGdriveText) {
      uploadAllGdriveText.textContent = `저장 중 (${i + 1}/${validItems.length})...`;
    }
    
    const originalIdx = convertedItems.indexOf(item);
    const btn = document.getElementById(`gdriveBtn_${originalIdx}`);
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald-400"></i><span class="text-[11px]">저장 중...</span>';
    }

    try {
      const res = await executeGdriveUpload(webhookUrl, item.md_filename, item.markdown);
      if (res.success) {
        successCount++;
        if (btn) {
          if (res.url) {
            btn.outerHTML = `<a href="${res.url}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-600 text-xs font-medium flex items-center gap-1 transition" title="구글 드라이브에서 열기"><i class="fa-solid fa-arrow-up-right-from-square text-emerald-300"></i><span class="text-[11px]">열기 ↗</span></a>`;
          } else {
            btn.className = "px-2.5 py-1.5 rounded-lg bg-emerald-900/80 text-emerald-200 border border-emerald-600 text-xs font-medium flex items-center gap-1 transition";
            btn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-300"></i><span class="text-[11px]">저장됨</span>';
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (uploadAllGdriveText) uploadAllGdriveText.textContent = originalText;
  if (uploadAllGdriveBtn) uploadAllGdriveBtn.disabled = false;
  showToast(`총 ${successCount}개 파일이 구글 드라이브에 성공적으로 저장되었습니다!`);
}

// ==========================================
// Token Quota Tracker
// ==========================================
function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadTokenUsage() {
  const today = getTodayDateString();
  const storedDate = localStorage.getItem("GEMINI_USAGE_DATE");
  if (storedDate !== today) {
    localStorage.setItem("GEMINI_USAGE_DATE", today);
    localStorage.setItem("GEMINI_USAGE_TOKENS", "0");
    localStorage.setItem("GEMINI_USAGE_REQUESTS", "0");
  }
  updateTokenUI();
}

function recordTokenUsage(tokens, requests = 1) {
  loadTokenUsage();
  let currentTokens = parseInt(localStorage.getItem("GEMINI_USAGE_TOKENS") || "0", 10);
  let currentReqs = parseInt(localStorage.getItem("GEMINI_USAGE_REQUESTS") || "0", 10);

  currentTokens += Math.max(0, tokens);
  currentReqs += requests;

  localStorage.setItem("GEMINI_USAGE_TOKENS", String(currentTokens));
  localStorage.setItem("GEMINI_USAGE_REQUESTS", String(currentReqs));
  updateTokenUI();
}

function updateTokenUI() {
  const tokens = parseInt(localStorage.getItem("GEMINI_USAGE_TOKENS") || "0", 10);
  const requests = parseInt(localStorage.getItem("GEMINI_USAGE_REQUESTS") || "0", 10);
  const remaining = Math.max(0, 1500 - requests);

  if (tokenQuotaBadge) {
    tokenQuotaBadge.textContent = `${remaining.toLocaleString()}/1,500`;
  }
  if (statRemainingQuota) {
    statRemainingQuota.textContent = `${remaining.toLocaleString()}/1,500`;
  }
  if (statTodayRequests) {
    statTodayRequests.textContent = `${requests.toLocaleString()}회`;
  }
  if (statTodayTokens) {
    statTodayTokens.textContent = `~${tokens.toLocaleString()}`;
  }
}

function openTokenModal() {
  loadTokenUsage();
  if (tokenModal) tokenModal.classList.remove("hidden");
}

function closeTokenModal() {
  if (tokenModal) tokenModal.classList.add("hidden");
}

function resetTokenCounter() {
  localStorage.setItem("GEMINI_USAGE_DATE", getTodayDateString());
  localStorage.setItem("GEMINI_USAGE_TOKENS", "0");
  localStorage.setItem("GEMINI_USAGE_REQUESTS", "0");
  updateTokenUI();
  showToast("오늘의 토큰 사용량 카운터가 초기화되었습니다.");
}
loadTokenUsage();

// ==========================================
// PWA Service Worker & Install Prompt
// ==========================================
let deferredPrompt = null;
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.warn("ServiceWorker registration failed:", err);
    });
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (pwaInstallBtn) {
    pwaInstallBtn.classList.remove("hidden");
    pwaInstallBtn.classList.add("flex");
  }
});

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      pwaInstallBtn.classList.add("hidden");
      pwaInstallBtn.classList.remove("flex");
      showToast("All-to-Markdown 앱이 설치되었습니다!");
    }
    deferredPrompt = null;
  });
}

// ==========================================
// Workspace Mode Switcher (Files vs URL)
// ==========================================
let activeWorkspaceTab = "files";

function switchWorkspaceTab(tab) {
  activeWorkspaceTab = tab;
  if (tab === "files") {
    tabModeFiles.className = "px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-500/20 transition";
    tabModeUrl.className = "px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs flex items-center gap-2 border border-slate-800 transition";
    dropZone.classList.remove("hidden");
    urlInputZone.classList.add("hidden");
  } else {
    tabModeFiles.className = "px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs flex items-center gap-2 border border-slate-800 transition";
    tabModeUrl.className = "px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-500/20 transition";
    dropZone.classList.add("hidden");
    urlInputZone.classList.remove("hidden");
    if (webUrlInput) webUrlInput.focus();
  }
}

function setSampleUrl(url) {
  if (webUrlInput) {
    webUrlInput.value = url;
    webUrlInput.focus();
  }
}

// Webpage URL to Markdown Conversion (Firecrawl Style)
async function handleUrlConvert() {
  const url = (webUrlInput ? webUrlInput.value : "").trim();
  if (!url) {
    alert("변환할 웹페이지 URL을 입력해 주세요.");
    if (webUrlInput) webUrlInput.focus();
    return;
  }

  const crawlSubpages = crawlSubpagesToggle ? crawlSubpagesToggle.checked : false;

  resultsSection.classList.remove("hidden");
  loadingIndicator.classList.remove("hidden");
  loadingIndicator.classList.add("flex");

  if (convertUrlBtn) convertUrlBtn.disabled = true;
  if (convertUrlBtnText) {
    convertUrlBtnText.textContent = crawlSubpages ? "하위 페이지 크롤링 중..." : "추출 중...";
  }

  try {
    const res = await fetch(`${API_BASE}/api/convert/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url,
        enable_frontmatter: frontmatterToggle.checked,
        tags: frontmatterTags.value.trim(),
        crawl_subpages: crawlSubpages,
        max_pages: 10
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `서버 응답 오류 (${res.status})`);
    }

    const data = await res.json();
    const items = Array.isArray(data.results) ? data.results : [data];
    if (items.length === 0) {
      alert("추출된 웹페이지 내용이 없습니다.");
      return;
    }

    // Unshift in reverse order so top item matches crawler root
    for (let i = items.length - 1; i >= 0; i--) {
      convertedItems.unshift(items[i]);
    }
    renderFileList();

    const successful = items.filter(it => it.success);
    if (successful.length > 0) {
      if (successful.length === 1) {
        showToast(`'${successful[0].md_filename}' 웹페이지 마크다운 변환 완료!`);
      } else {
        showToast(`총 ${successful.length}개 웹페이지(하위 페이지 포함) 마크다운 변환 완료!`);
      }

      // Record token usage (~3.5 chars per token estimate)
      const totalChars = successful.reduce((acc, it) => acc + (it.char_count || 0), 0);
      recordTokenUsage(Math.round(totalChars / 3.5), successful.length);

      // Auto-save to Google Drive if enabled
      const gdriveAutoSave = localStorage.getItem("GDRIVE_AUTO_SAVE") === "true";
      const gdriveUrl = localStorage.getItem("GDRIVE_WEBHOOK_URL");
      if (gdriveAutoSave && gdriveUrl) {
        for (let idx = 0; idx < successful.length; idx++) {
          saveSingleToGdrive(idx);
        }
      }
    } else {
      alert(`웹페이지 변환 실패: ${items[0].error || "오류가 발생했습니다."}`);
    }

    if (webUrlInput) webUrlInput.value = "";
  } catch (err) {
    alert(`웹페이지 변환 중 오류: ${err.message}`);
  } finally {
    loadingIndicator.classList.add("hidden");
    loadingIndicator.classList.remove("flex");
    if (convertUrlBtn) convertUrlBtn.disabled = false;
    if (convertUrlBtnText) convertUrlBtnText.textContent = "페이지 변환";
  }
}

// ==========================================
// Subpage Discovery & Selective Crawling
// ==========================================
let discoveredSubpages = [];

async function handleDiscoverSubpages() {
  const url = (webUrlInput ? webUrlInput.value : "").trim();
  if (!url) {
    alert("하위 페이지를 탐색할 웹페이지 URL을 입력해 주세요.");
    if (webUrlInput) webUrlInput.focus();
    return;
  }

  if (discoverSubpagesBtn) discoverSubpagesBtn.disabled = true;
  if (discoverSubpagesBtnText) {
    discoverSubpagesBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-amber-300"></i> 탐색 중...';
  }

  try {
    const res = await fetch(`${API_BASE}/api/crawl/discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url, max_pages: 30 })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `탐색 실패 (${res.status})`);
    }

    const data = await res.json();
    if (!data.pages || data.pages.length === 0) {
      alert("해당 사이트에서 탐색 가능한 페이지를 찾을 수 없습니다.");
      return;
    }

    discoveredSubpages = data.pages.map(p => ({ ...p, selected: true }));
    openSubpageModal(data.domain || url, discoveredSubpages.length);
    renderSubpagesList();
  } catch (err) {
    alert(`하위 페이지 탐색 중 오류: ${err.message}`);
  } finally {
    if (discoverSubpagesBtn) discoverSubpagesBtn.disabled = false;
    if (discoverSubpagesBtnText) {
      discoverSubpagesBtnText.textContent = "하위 페이지 탐색 & 선택";
    }
  }
}

function openSubpageModal(domain, count) {
  if (subpageBaseDomainText) subpageBaseDomainText.textContent = domain;
  if (subpageCountBadge) subpageCountBadge.textContent = `${count}개 발견`;
  if (subpageFilterInput) subpageFilterInput.value = "";
  if (subpageSelectModal) subpageSelectModal.classList.remove("hidden");
}

function closeSubpageModal() {
  if (subpageSelectModal) subpageSelectModal.classList.add("hidden");
}

function renderSubpagesList() {
  if (!subpageListContainer) return;
  const filterText = (subpageFilterInput ? subpageFilterInput.value : "").toLowerCase().trim();

  const selectedCount = discoveredSubpages.filter(p => p.selected).length;
  if (subpageSelectedCount) subpageSelectedCount.textContent = selectedCount;

  if (convertSelectedSubpagesBtn) {
    convertSelectedSubpagesBtn.disabled = selectedCount === 0;
  }
  if (convertSelectedSubpagesBtnText) {
    convertSelectedSubpagesBtnText.textContent = selectedCount > 0
      ? `선택한 ${selectedCount}개 페이지 변환 시작`
      : `페이지를 선택해 주세요`;
  }

  subpageListContainer.innerHTML = "";

  const filtered = discoveredSubpages.filter(p => {
    if (!filterText) return true;
    return (p.title && p.title.toLowerCase().includes(filterText)) || (p.url && p.url.toLowerCase().includes(filterText));
  });

  if (filtered.length === 0) {
    subpageListContainer.innerHTML = `
      <div class="py-8 text-center text-xs text-slate-500">
        검색된 페이지가 없습니다.
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const originalIndex = discoveredSubpages.indexOf(p);
    const div = document.createElement("div");
    div.className = "flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition";
    div.innerHTML = `
      <input type="checkbox" id="subpage_chk_${originalIndex}" ${p.selected ? "checked" : ""} class="mt-0.5 w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer">
      <label for="subpage_chk_${originalIndex}" class="flex-1 min-w-0 cursor-pointer select-none">
        <div class="flex items-center gap-2">
          <span class="font-medium text-xs text-white truncate max-w-md">${escapeHtml(p.title || p.url)}</span>
          ${p.is_root ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700">홈/루트</span>' : ''}
        </div>
        <div class="text-[11px] text-slate-400 font-mono truncate hover:text-indigo-300" title="${escapeHtml(p.url)}">
          ${escapeHtml(p.url)}
        </div>
      </label>
      <a href="${p.url}" target="_blank" class="text-slate-500 hover:text-indigo-400 p-1 transition" title="새 창으로 원본 열기">
        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
      </a>
    `;

    const chk = div.querySelector("input[type='checkbox']");
    chk.addEventListener("change", (e) => {
      discoveredSubpages[originalIndex].selected = e.target.checked;
      const count = discoveredSubpages.filter(item => item.selected).length;
      if (subpageSelectedCount) subpageSelectedCount.textContent = count;
      if (convertSelectedSubpagesBtn) convertSelectedSubpagesBtn.disabled = count === 0;
      if (convertSelectedSubpagesBtnText) {
        convertSelectedSubpagesBtnText.textContent = count > 0
          ? `선택한 ${count}개 페이지 변환 시작`
          : `페이지를 선택해 주세요`;
      }
    });

    subpageListContainer.appendChild(div);
  });
}

function filterSubpagesList() {
  renderSubpagesList();
}

function toggleSelectAllSubpages(selectAll) {
  discoveredSubpages.forEach(p => { p.selected = selectAll; });
  renderSubpagesList();
}

async function convertSelectedSubpages() {
  const selectedUrls = discoveredSubpages.filter(p => p.selected).map(p => p.url);
  if (selectedUrls.length === 0) {
    alert("변환할 페이지를 최소 1개 이상 선택해 주세요.");
    return;
  }

  closeSubpageModal();

  resultsSection.classList.remove("hidden");
  loadingIndicator.classList.remove("hidden");
  loadingIndicator.classList.add("flex");

  try {
    const res = await fetch(`${API_BASE}/api/convert/url-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: selectedUrls,
        enable_frontmatter: frontmatterToggle.checked,
        tags: frontmatterTags.value.trim()
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `일괄 변환 오류 (${res.status})`);
    }

    const data = await res.json();
    const items = data.results || [];
    if (items.length === 0) {
      alert("변환된 페이지가 없습니다.");
      return;
    }

    for (let i = items.length - 1; i >= 0; i--) {
      convertedItems.unshift(items[i]);
    }
    renderFileList();

    const successful = items.filter(it => it.success);
    showToast(`선택한 ${successful.length}개 페이지 마크다운 변환 완료!`);

    const totalChars = successful.reduce((acc, it) => acc + (it.char_count || 0), 0);
    recordTokenUsage(Math.round(totalChars / 3.5), successful.length);

    const gdriveAutoSave = localStorage.getItem("GDRIVE_AUTO_SAVE") === "true";
    const gdriveUrl = localStorage.getItem("GDRIVE_WEBHOOK_URL");
    if (gdriveAutoSave && gdriveUrl) {
      for (let idx = 0; idx < successful.length; idx++) {
        saveSingleToGdrive(idx);
      }
    }
  } catch (err) {
    alert(`선택 페이지 일괄 변환 중 오류: ${err.message}`);
  } finally {
    loadingIndicator.classList.add("hidden");
    loadingIndicator.classList.remove("flex");
  }
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

    let totalChars = 0;
    data.results.forEach(item => {
      convertedItems.unshift(item);
      if (item.success) totalChars += (item.char_count || 0);
    });

    renderFileList();
    showToast(`${data.success_count}개 파일 변환이 완료되었습니다.`);

    // Record token usage
    const estTokens = isVisionModeActive 
      ? Math.round(data.results.length * 1500 + totalChars / 3.5)
      : Math.round(totalChars / 3.5);
    recordTokenUsage(estTokens, data.results.length);

    // Auto-save to Google Drive if enabled and configured
    const gdriveAutoSave = localStorage.getItem("GDRIVE_AUTO_SAVE") === "true";
    const gdriveUrl = localStorage.getItem("GDRIVE_WEBHOOK_URL");
    if (gdriveAutoSave && gdriveUrl && data.results.some(item => item.success)) {
      setTimeout(() => {
        uploadAllToGdrive();
      }, 500);
    }
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
    if (uploadAllGdriveBtn && localStorage.getItem("GDRIVE_WEBHOOK_URL")) {
      uploadAllGdriveBtn.disabled = false;
    }
  } else {
    downloadAllZipBtn.disabled = true;
    if (uploadAllGdriveBtn) uploadAllGdriveBtn.disabled = true;
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
        <button id="gdriveBtn_${index}" onclick="saveSingleToGdrive(${index})" class="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 text-xs font-medium flex items-center gap-1 transition" title="구글 드라이브에 저장">
          <i class="fa-brands fa-google-drive"></i>
          <span id="gdriveBtnText_${index}">드라이브</span>
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
if (gdriveModal) {
  gdriveModal.addEventListener("click", (e) => {
    if (e.target === gdriveModal) closeGdriveModal();
  });
}
if (tokenModal) {
  tokenModal.addEventListener("click", (e) => {
    if (e.target === tokenModal) closeTokenModal();
  });
}
if (subpageSelectModal) {
  subpageSelectModal.addEventListener("click", (e) => {
    if (e.target === subpageSelectModal) closeSubpageModal();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePreviewModal();
    closeApiKeyModal();
    closeGdriveModal();
    closeTokenModal();
    closeSubpageModal();
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
