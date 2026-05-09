const urlInput = document.getElementById('urlInput');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loader = document.getElementById('loader');
const resultSection = document.getElementById('resultSection');
const resultThumb = document.getElementById('resultThumb');
const resultTitle = document.getElementById('resultTitle');
const downloadList = document.getElementById('downloadList');
const closeResult = document.getElementById('closeResult');

// History Edit Elements
const editHistoryBtn = document.getElementById('editHistoryBtn');
const historyActions = document.getElementById('historyActions');
const clearAllBtn = document.getElementById('clearAllBtn');
const doneEditBtn = document.getElementById('doneEditBtn');
let isEditingHistory = false;

// Modal Elements
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const modalThumb = document.getElementById('modalThumb');
const modalTitle = document.getElementById('modalTitle');
const modalUrl = document.getElementById('modalUrl');
const redownloadBtn = document.getElementById('redownloadBtn');

// Confirm Modal Elements
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const okConfirmBtn = document.getElementById('okConfirmBtn');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

// Settings Elements
const clearCacheBtn = document.getElementById('clearCacheBtn');
const darkModeToggle = document.getElementById('darkModeToggle');

// Capacitor Plugins
const { CapacitorHttp, Filesystem, Media, Toast } = window.Capacitor?.Plugins || {};

// Init Theme
const savedTheme = localStorage.getItem('mori_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (darkModeToggle) darkModeToggle.checked = savedTheme === 'dark';

darkModeToggle?.addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mori_theme', theme);
});

urlInput.addEventListener('input', () => {
    clearBtn.classList.toggle('hidden', urlInput.value === '');
});

clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.classList.add('hidden');
    urlInput.focus();
});

closeResult?.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    const supportedSection = document.querySelector('.supported-section');
    if (supportedSection) supportedSection.classList.remove('hidden');
});

function truncate(str, num = 80) {
    if (!str) return "";
    return str.length > num ? str.slice(0, num) + "..." : str;
}

// Toast Function
async function showToast(message) {
    if (Toast) {
        await Toast.show({ text: message, duration: 'short', position: 'bottom' });
    } else {
        const toastEl = document.createElement('div');
        toastEl.className = 'custom-toast';
        toastEl.textContent = message;
        document.body.appendChild(toastEl);
        setTimeout(() => toastEl.classList.add('show'), 10);
        setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 300);
        }, 3000);
    }
}

// Error Handling Helper
function handleScrapeError(err, status = null) {
    let msg = "Something went wrong.";
    if (status === 403 || status === 429) {
        msg = "IP Blocked! Please use a VPN or mobile data.";
    } else if (err.message?.includes('Token') || err.message?.includes('selector')) {
        msg = "Scraper outdated. Please wait for an update.";
    } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        msg = "Network error. Check your connection.";
    } else if (err.message) {
        msg = err.message;
    }
    showToast(msg);
}

// Custom Confirm Function
function showConfirm(title, message, onConfirm) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOverlay.classList.remove('hidden');
    
    okConfirmBtn.onclick = () => {
        onConfirm();
        confirmOverlay.classList.add('hidden');
    };
    
    cancelConfirmBtn.onclick = () => {
        confirmOverlay.classList.add('hidden');
    };
}

// History Edit Handlers
editHistoryBtn?.addEventListener('click', () => {
    isEditingHistory = true;
    editHistoryBtn.classList.add('hidden');
    historyActions.classList.remove('hidden');
    renderHistory();
});

doneEditBtn?.addEventListener('click', () => {
    isEditingHistory = false;
    editHistoryBtn.classList.remove('hidden');
    historyActions.classList.add('hidden');
    renderHistory();
});

clearAllBtn?.addEventListener('click', () => {
    showConfirm('Clear All', 'Are you sure you want to delete all download history?', () => {
        localStorage.removeItem('mori_history');
        isEditingHistory = false;
        editHistoryBtn.classList.remove('hidden');
        historyActions.classList.add('hidden');
        renderHistory();
    });
});

// Clear Cache Logic
clearCacheBtn?.addEventListener('click', () => {
    showConfirm('Clear Cache', 'This will delete temporary files and reset history. Continue?', async () => {
        try {
            localStorage.removeItem('mori_history');
            if (Filesystem) {
                const files = await Filesystem.readdir({
                    path: '',
                    directory: 'CACHE'
                });
                for (const file of files.files) {
                    await Filesystem.deleteFile({
                        path: file.name,
                        directory: 'CACHE'
                    });
                }
            }
            renderHistory();
            showToast('Cache cleared.');
        } catch (e) {
            console.error(e);
            showToast('Cache cleared.');
            renderHistory();
        }
    });
});

// SCRAPERS
async function scrapeTikTok(url) {
    let currentStatus = null;
    try {
        const mainRes = await CapacitorHttp.get({
            url: 'https://snaptik.app/en',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        currentStatus = mainRes.status;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(mainRes.data, 'text/html');
        const token = doc.querySelector('input[name="token"]')?.value;
        if (!token) throw new Error("Scraper outdated (token missing).");

        const abcRes = await CapacitorHttp.post({
            url: 'https://snaptik.app/abc2.php',
            data: { token, url },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        currentStatus = abcRes.status;

        const script1 = abcRes.data;
        const script2 = await new Promise((resolve, reject) => {
            try {
                const mockEval = (s) => resolve(s);
                const fn = new Function('eval', script1);
                fn(mockEval);
            } catch (e) { reject(new Error("Scraper outdated (eval failed).")); }
        });

        const capturedHtml = await new Promise((resolve, reject) => {
            let html = "";
            const context = {
                $: () => ({ set innerHTML(t) { html = t; }, remove: () => {}, style: { display: "" } }),
                app: { showAlert: (msg) => reject(new Error(msg)) },
                document: { getElementById: () => ({ src: "" }) },
                fetch: () => { resolve(html); return { json: () => Promise.resolve({ thumbnail_url: "" }) }; },
                gtag: () => {}, Math: { round: () => 0 }, XMLHttpRequest: function () { return { open: () => {}, send: () => {} }; },
                window: { location: { hostname: "snaptik.app" } }, setTimeout: () => {}, setInterval: () => {}, console: { log: () => {} }
            };
            try {
                const keys = Object.keys(context);
                const values = Object.values(context);
                const fn = new Function(...keys, script2);
                fn(...values);
                setTimeout(() => { if (html) resolve(html); else reject(new Error("Request timeout.")); }, 1000);
            } catch (e) { reject(new Error("Execution failed.")); }
        });

        const resDoc = parser.parseFromString(capturedHtml, 'text/html');
        const downloads = [];
        resDoc.querySelectorAll('a').forEach(a => {
            let href = a.getAttribute('href');
            let text = a.textContent.trim().toLowerCase();
            if (href) {
                if (href.startsWith('/')) href = 'https://snaptik.app' + href;
                if (href.includes('snaptik.app') || href.includes('acxcdn.com') || href.includes('token=')) {
                    if (text.includes('app')) return;
                    let label = "VIDEO";
                    if (text.includes('music') || text.includes('mp3')) label = "MP3";
                    if (text.includes('photo')) label = "PHOTO";
                    downloads.push({ type: label, url: href });
                }
            }
        });

        const title = resDoc.querySelector('.video-title')?.textContent || resDoc.querySelector('h3')?.textContent || "TikTok Content";
        const thumb = resDoc.querySelector('img')?.src;

        return { status: true, result: { title, thumbnail: thumb, downloads } };
    } catch (err) {
        return { status: false, message: err.message, statusCode: currentStatus };
    }
}

async function scrapeInstagram(url) {
    let currentStatus = null;
    try {
        const cleanUrl = url.split('?')[0];
        const res1 = await CapacitorHttp.get({
            url: 'https://indown.io/',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        currentStatus = res1.status;

        const cookies = res1.headers['Set-Cookie'] || res1.headers['set-cookie'] || '';
        const parser = new DOMParser();
        const doc1 = parser.parseFromString(res1.data, 'text/html');
        const token = doc1.querySelector('input[name="_token"]')?.value;

        if (!token) throw new Error("Scraper outdated (token missing).");

        const res2 = await CapacitorHttp.post({
            url: 'https://indown.io/download',
            data: { link: cleanUrl, _token: token },
            headers: {
                'Cookie': cookies,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        currentStatus = res2.status;

        const doc2 = parser.parseFromString(res2.data, 'text/html');
        const downloads = [];
        let thumbnail = null;

        doc2.querySelectorAll('.container .row .col-md-4').forEach(el => {
            const a = el.querySelector('a');
            const img = el.querySelector('img');
            const href = a?.getAttribute('href');
            if (img && !thumbnail && !img.src.includes('logo')) {
                thumbnail = img.src;
            }
            if (href && href.includes('fetch?url=')) {
                downloads.push({
                    type: href.includes('.mp4') || href.includes('video') ? 'VIDEO' : 'IMAGE',
                    url: href
                });
            }
        });

        if (downloads.length === 0) throw new Error("Media links not found. Post might be private.");

        const title = doc2.querySelector('h5')?.textContent?.trim() || "Instagram Content";
        if (!thumbnail) thumbnail = doc2.querySelector('.row img:not([src*="logo"])')?.src;

        return { status: true, result: { title, thumbnail, downloads } };
    } catch (err) {
        return { status: false, message: err.message, statusCode: currentStatus };
    }
}

async function scrapeYouTube(url) {
    let currentStatus = null;
    try {
        const res = await CapacitorHttp.post({
            url: 'https://app.ytdown.to/proxy.php',
            data: { url: url },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        currentStatus = res.status;

        const data = res.data;
        if (!data || !data.api || data.api.status !== "ok") {
            throw new Error(data?.api?.message || "YouTube scraper error.");
        }

        const { title, imagePreviewUrl, mediaItems } = data.api;
        const downloads = mediaItems.map(item => ({
            type: `${item.mediaExtension.toUpperCase()} ${item.mediaQuality}`,
            url: item.mediaUrl
        }));

        return {
            status: true,
            result: {
                title: title || "YouTube Content",
                thumbnail: imagePreviewUrl,
                downloads
            }
        };
    } catch (err) {
        return { status: false, message: err.message, statusCode: currentStatus };
    }
}

async function scrapeProxy(url) {
    try {
        const res = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        return await res.json();
    } catch (e) {
        return { status: false, message: "Local server not available." };
    }
}

downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return;

    const supportedSection = document.querySelector('.supported-section');
    resultSection.classList.add('hidden');
    if (supportedSection) supportedSection.classList.add('hidden');
    loader.classList.remove('hidden');
    downloadBtn.disabled = true;

    let data;
    if (CapacitorHttp) {
        if (url.includes('tiktok.com')) {
            data = await scrapeTikTok(url);
        } else if (url.includes('instagram.com')) {
            data = await scrapeInstagram(url);
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            data = await scrapeYouTube(url);
        } else {
            data = { status: false, message: "URL not supported yet." };
        }
    } else {
        data = await scrapeProxy(url);
    }

    if (data.status) {
        saveToHistory(data.result, url);
        renderResult(data.result);
    } else {
        handleScrapeError(data, data.statusCode);
        if (supportedSection) supportedSection.classList.remove('hidden');
    }

    loader.classList.add('hidden');
    downloadBtn.disabled = false;
});

function renderResult(result) {
    resultThumb.src = result.thumbnail || '';
    resultThumb.style.display = 'block';
    resultThumb.onerror = () => resultThumb.style.display = 'none';
    
    resultTitle.textContent = truncate(result.title, 80);
    downloadList.innerHTML = '';
    result.downloads.forEach(dl => {
        const btn = document.createElement('button');
        btn.className = 'dl-item';
        btn.innerHTML = `<div>Download</div><span>${dl.type}</span>`;
        btn.addEventListener('click', (e) => startNativeDownload(dl.url, dl.type, result.title, e.currentTarget));
        downloadList.appendChild(btn);
    });
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

async function startNativeDownload(url, type, title, btn) {
    if (!Filesystem || !Media) {
        window.open(url, '_blank');
        return;
    }

    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div>Preparing...</div><span>Please wait</span>`;

    try {
        let finalUrl = url;

        if (url.includes('worker') || url.includes('ytdown')) {
            const statusRes = await CapacitorHttp.get({ url: url });
            if (statusRes.data && statusRes.data.fileUrl) {
                finalUrl = statusRes.data.fileUrl;
            } else if (statusRes.data && typeof statusRes.data === 'string' && statusRes.data.includes('"fileUrl":')) {
                const match = statusRes.data.match(/"fileUrl"\s*:\s*"([^"]+)"/);
                if (match) finalUrl = match[1];
            }
        }

        btn.innerHTML = `<div>Downloading...</div><span>Please wait</span>`;

        const response = await CapacitorHttp.get({
            url: finalUrl,
            responseType: 'blob',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.status !== 200) throw new Error("Download failed with status " + response.status);

        const blob = response.data;
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(new Error("File conversion failed."));
            reader.readAsDataURL(blob);
        });

        const isAudio = type.toLowerCase().includes('mp3') || type.toLowerCase().includes('audio') || type.toLowerCase().includes('128k') || type.toLowerCase().includes('48k') || type.toLowerCase().includes('m4a');
        const ext = isAudio ? 'mp3' : 'mp4';
        const fileName = `MORI_${Date.now()}.${ext}`;
        
        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: 'CACHE'
        });

        if (!isAudio) {
            await Media.saveVideo({ path: savedFile.uri });
        }

        btn.innerHTML = `<div>DONE!</div><span>Saved to Gallery</span>`;
        showToast("Download Complete: Saved to Gallery");
        
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }, 3000);

    } catch (err) {
        console.error("Native Download Error:", err);
        showToast("Download failed. Opening in browser.");
        window.open(url, '_blank');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

// History Management
function saveToHistory(result, url) {
    let history = JSON.parse(localStorage.getItem('mori_history') || '[]');
    const newItem = {
        title: result.title,
        thumbnail: result.thumbnail,
        url: url,
        timestamp: new Date().getTime()
    };
    history = history.filter(h => h.url !== url);
    history.unshift(newItem);
    localStorage.setItem('mori_history', JSON.stringify(history.slice(0, 50)));
    renderHistory();
}

function deleteHistoryItem(url) {
    showConfirm('Delete Item', 'Remove this item from history?', () => {
        let history = JSON.parse(localStorage.getItem('mori_history') || '[]');
        history = history.filter(h => h.url !== url);
        localStorage.setItem('mori_history', JSON.stringify(history));
        renderHistory();
    });
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('mori_history') || '[]');
    const historyPage = document.getElementById('historyPage');
    if (!historyPage) return;
    const emptyState = historyPage.querySelector('.empty-state');
    
    let list = historyPage.querySelector('.history-list');
    if (list) list.remove();

    if (history.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (editHistoryBtn) editHistoryBtn.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (editHistoryBtn && !isEditingHistory) editHistoryBtn.classList.remove('hidden');
    
    list = document.createElement('div');
    list.className = 'history-list';
    
    history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-item';
        card.innerHTML = `
            <div class="history-thumb-container">
                <img src="${item.thumbnail}" alt="thumb" class="hist-img" style="display: block;">
            </div>
            <div class="history-info">
                <h3>${truncate(item.title, 60)}</h3>
                <p>${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
            ${isEditingHistory ? `<button class="delete-item-btn" data-url="${item.url}">×</button>` : ''}
        `;
        
        const img = card.querySelector('.hist-img');
        img.onerror = () => img.style.display = 'none';

        if (!isEditingHistory) {
            card.addEventListener('click', () => showModal(item));
        } else {
            card.querySelector('.delete-item-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(item.url);
            });
        }
        
        list.appendChild(card);
    });
    historyPage.appendChild(list);
}

// Modal Logic
function showModal(item) {
    modalTitle.textContent = truncate(item.title, 100);
    modalThumb.src = item.thumbnail || '';
    modalThumb.style.display = 'block';
    modalThumb.onerror = () => modalThumb.style.display = 'none';
    
    modalUrl.textContent = item.url;
    modalOverlay.classList.remove('hidden');
    
    redownloadBtn.onclick = () => {
        urlInput.value = item.url;
        clearBtn.classList.remove('hidden');
        modalOverlay.classList.add('hidden');
        document.querySelector('.nav-item[data-page="home"]').click();
        downloadBtn.click();
    };
}

closeModal?.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});

// Initial Render
renderHistory();

// Nav Handling
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPageId = item.getAttribute('data-page') + 'Page';
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
        document.getElementById(targetPageId).classList.remove('hidden');
    });
});
