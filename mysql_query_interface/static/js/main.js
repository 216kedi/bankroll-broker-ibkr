/**
 * MySQL Web Query Interface - Frontend JavaScript
 * Veritabanı tabloları ile etkileşim için kullanıcı arayüzü yönetimi
 */

// Global State
const state = {
    tables: [],
    currentTable: null,
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    perPage: 100,
    sortBy: '',
    sortOrder: 'asc',
    searchTerm: '',
    searchTimeout: null
};

// API Base URL
const API_BASE = window.location.origin;

// ===== Utility Functions =====

/**
 * Toast bildirim göster
 */
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    const titles = {
        success: 'Başarılı',
        error: 'Hata',
        warning: 'Uyarı'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Loading spinner göster/gizle
 */
function setLoading(isLoading, target = 'table') {
    if (target === 'table') {
        const overlay = document.getElementById('tableLoading');
        overlay.style.display = isLoading ? 'flex' : 'none';
    }
}

/**
 * API çağrısı yap
 */
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Bir hata oluştu');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===== Database Connection Check =====

async function checkDatabaseConnection() {
    const statusDot = document.getElementById('dbStatus');
    const statusText = document.getElementById('dbStatusText');

    try {
        const result = await apiCall('/api/health');
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Bağlantı Başarılı';
    } catch (error) {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Bağlantı Hatası';
        showToast('Veritabanına bağlanılamadı: ' + error.message, 'error');
    }
}

// ===== Table List Functions =====

/**
 * Tablo listesini yükle
 */
async function loadTables() {
    const tableList = document.getElementById('tableList');
    const tableCount = document.getElementById('tableCount');

    try {
        tableList.innerHTML = '<div class="loading-spinner">Yükleniyor...</div>';

        const result = await apiCall('/api/tables');
        state.tables = result.tables || [];

        tableCount.textContent = state.tables.length;

        if (state.tables.length === 0) {
            tableList.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Tablo bulunamadı</div>';
            return;
        }

        renderTableList(state.tables);
    } catch (error) {
        tableList.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Tablolar yüklenemedi</div>';
        showToast('Tablolar yüklenirken hata: ' + error.message, 'error');
    }
}

/**
 * Tablo listesini render et
 */
function renderTableList(tables) {
    const tableList = document.getElementById('tableList');

    if (tables.length === 0) {
        tableList.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Sonuç bulunamadı</div>';
        return;
    }

    tableList.innerHTML = tables.map(table => `
        <div class="table-item ${state.currentTable === table ? 'active' : ''}"
             onclick="selectTable('${table}')">
            ${table}
        </div>
    `).join('');
}

/**
 * Tablo seç
 */
async function selectTable(tableName) {
    state.currentTable = tableName;
    state.currentPage = 1;
    state.sortBy = '';
    state.sortOrder = 'asc';
    state.searchTerm = '';

    // Arayüzü güncelle
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('tableContent').style.display = 'flex';
    document.getElementById('currentTableName').textContent = tableName;
    document.getElementById('dataSearch').value = '';
    document.getElementById('clearSearch').style.display = 'none';

    // Tablo listesini güncelle
    renderTableList(state.tables);

    // Verileri yükle
    await loadTableData();
}

/**
 * Tablo verilerini yükle
 */
async function loadTableData() {
    if (!state.currentTable) return;

    setLoading(true);

    try {
        const params = new URLSearchParams({
            page: state.currentPage,
            per_page: state.perPage,
            sort_by: state.sortBy,
            sort_order: state.sortOrder,
            search: state.searchTerm
        });

        const result = await apiCall(`/api/table/${state.currentTable}?${params}`);

        // State güncelle
        state.totalPages = result.pagination.total_pages;
        state.totalRecords = result.pagination.total_records;

        // Tabloyu render et
        renderTable(result.columns, result.rows);
        updatePagination(result.pagination);

    } catch (error) {
        showToast('Veriler yüklenirken hata: ' + error.message, 'error');
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 40px; color: #ef4444;">Veriler yüklenemedi</td></tr>';
    } finally {
        setLoading(false);
    }
}

/**
 * Tabloyu render et
 */
function renderTable(columns, rows) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    // Başlıkları render et
    tableHead.innerHTML = `
        <tr>
            ${columns.map(col => `
                <th class="sortable ${state.sortBy === col ? 'sorted-' + state.sortOrder : ''}"
                    onclick="sortTable('${col}')">
                    ${col}
                </th>
            `).join('')}
        </tr>
    `;

    // Verileri render et
    if (rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 40px; color: #64748b;">Kayıt bulunamadı</td></tr>';
        return;
    }

    tableBody.innerHTML = rows.map(row => `
        <tr>
            ${columns.map(col => `
                <td title="${escapeHtml(String(row[col] || ''))}">${escapeHtml(String(row[col] || ''))}</td>
            `).join('')}
        </tr>
    `).join('');

    // Kayıt sayısını güncelle
    document.getElementById('recordCount').textContent = `${state.totalRecords.toLocaleString('tr-TR')} kayıt`;
}

/**
 * HTML escape
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sayfalama kontrollerini güncelle
 */
function updatePagination(pagination) {
    document.getElementById('paginationText').textContent = `Sayfa ${pagination.page} / ${pagination.total_pages}`;

    const start = ((pagination.page - 1) * pagination.per_page) + 1;
    const end = Math.min(pagination.page * pagination.per_page, pagination.total_records);
    document.getElementById('rangeText').textContent = `${start.toLocaleString('tr-TR')}-${end.toLocaleString('tr-TR')} / ${pagination.total_records.toLocaleString('tr-TR')} kayıt`;

    document.getElementById('pageInput').value = pagination.page;
    document.getElementById('totalPagesText').textContent = `/ ${pagination.total_pages}`;
    document.getElementById('pageInput').max = pagination.total_pages;

    document.getElementById('firstPage').disabled = !pagination.has_prev;
    document.getElementById('prevPage').disabled = !pagination.has_prev;
    document.getElementById('nextPage').disabled = !pagination.has_next;
    document.getElementById('lastPage').disabled = !pagination.has_next;
}

// ===== Pagination Functions =====

function goToPage(page) {
    if (page < 1 || page > state.totalPages) return;
    state.currentPage = page;
    loadTableData();
}

function firstPage() {
    goToPage(1);
}

function prevPage() {
    goToPage(state.currentPage - 1);
}

function nextPage() {
    goToPage(state.currentPage + 1);
}

function lastPage() {
    goToPage(state.totalPages);
}

// ===== Sort Functions =====

function sortTable(column) {
    if (state.sortBy === column) {
        // Toggle sort order
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortBy = column;
        state.sortOrder = 'asc';
    }

    state.currentPage = 1; // Reset to first page
    loadTableData();
}

// ===== Search Functions =====

function performSearch(searchTerm) {
    state.searchTerm = searchTerm;
    state.currentPage = 1; // Reset to first page
    loadTableData();
}

function clearSearch() {
    document.getElementById('dataSearch').value = '';
    document.getElementById('clearSearch').style.display = 'none';
    performSearch('');
}

// ===== Export Function =====

async function exportToCSV() {
    if (!state.currentTable) return;

    try {
        showToast('CSV dosyası hazırlanıyor...', 'success', 2000);

        const params = new URLSearchParams({
            search: state.searchTerm
        });

        // Direct download using window.location
        window.location.href = `${API_BASE}/api/export/${state.currentTable}?${params}`;

        setTimeout(() => {
            showToast('CSV dosyası indirildi', 'success');
        }, 1000);

    } catch (error) {
        showToast('CSV export hatası: ' + error.message, 'error');
    }
}

// ===== Event Listeners =====

document.addEventListener('DOMContentLoaded', () => {
    // Veritabanı bağlantısını kontrol et
    checkDatabaseConnection();

    // Tabloları yükle
    loadTables();

    // Tablo arama
    document.getElementById('tableSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTables = state.tables.filter(table =>
            table.toLowerCase().includes(searchTerm)
        );
        renderTableList(filteredTables);
    });

    // Veri arama (debounced)
    document.getElementById('dataSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();

        // Clear search button visibility
        document.getElementById('clearSearch').style.display = searchTerm ? 'block' : 'none';

        // Debounce search
        clearTimeout(state.searchTimeout);
        state.searchTimeout = setTimeout(() => {
            performSearch(searchTerm);
        }, 500);
    });

    // Clear search button
    document.getElementById('clearSearch').addEventListener('click', clearSearch);

    // Pagination buttons
    document.getElementById('firstPage').addEventListener('click', firstPage);
    document.getElementById('prevPage').addEventListener('click', prevPage);
    document.getElementById('nextPage').addEventListener('click', nextPage);
    document.getElementById('lastPage').addEventListener('click', lastPage);

    // Page input
    document.getElementById('pageInput').addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        goToPage(page);
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Arrow keys for pagination (when not focused on input)
        if (document.activeElement.tagName !== 'INPUT') {
            if (e.key === 'ArrowLeft') {
                prevPage();
            } else if (e.key === 'ArrowRight') {
                nextPage();
            }
        }
    });
});

// Global functions (called from HTML onclick)
window.selectTable = selectTable;
window.sortTable = sortTable;
