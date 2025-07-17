document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // CONFIGURATION
    // =================================================================
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby3fFK8PhgqXGdRMbI_Oo_dTM7qVh0Ll-QpIXwttWtOaIYAG2LzRaKoUWl-0dIA6PUjSw/exec';
    
    // =================================================================
    // GLOBAL STATE & VARIABLES
    // =================================================================
    let currentUser = null;
    let journalEntries = [];
    let attendanceData = [];
    let availableClasses = [];
    let currentCalDate = new Date();
    
    // =================================================================
    // DOM ELEMENTS
    // =================================================================
    const loadingOverlay = document.getElementById('loadingOverlay');
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    const welcomeMessage = document.getElementById('welcomeMessage');

    // --- Views ---
    const dashboardView = document.getElementById('dashboard');
    const allEntriesView = document.getElementById('allEntriesView');
    const attendanceView = document.getElementById('attendanceView');
    const reportsView = document.getElementById('reportsView');
    
    // --- Custom Modals ---
    const confirmModal = document.getElementById('confirmModal');
    const confirmModalMessage = document.getElementById('confirmModalMessage');
    const confirmModalOkBtn = document.getElementById('confirmModalOkBtn');
    const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
    
    const alertModal = document.getElementById('alertModal');
    const alertModalHeader = document.getElementById('alertModalHeader');
    const alertModalTitle = document.getElementById('alertModalTitle');
    const alertModalMessage = document.getElementById('alertModalMessage');
    const alertModalOkBtn = document.getElementById('alertModalOkBtn');
    
    // =================================================================
    // INITIALIZATION & CORE LOGIC
    // =================================================================
    let confirmCallback = null;
    checkSession();

    // =================================================================
    // CUSTOM MODAL LOGIC
    // =================================================================
    function showAlertModal(message, type = 'info') {
        alertModalMessage.textContent = message;
        alertModalHeader.className = 'p-4 rounded-t-xl';
        alertModalOkBtn.className = 'px-8 py-2 text-white rounded-lg';

        if (type === 'success') {
            alertModalTitle.textContent = 'Sukses';
            alertModalHeader.classList.add('bg-green-500');
            alertModalOkBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        } else if (type === 'error') {
            alertModalTitle.textContent = 'Terjadi Kesalahan';
            alertModalHeader.classList.add('bg-red-500');
            alertModalOkBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
            alertModalTitle.textContent = 'Informasi';
            alertModalHeader.classList.add('bg-blue-500');
            alertModalOkBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
        alertModal.classList.remove('hidden');
    }
    
    alertModalOkBtn.addEventListener('click', () => {
        alertModal.classList.add('hidden');
    });

    function showConfirmModal(message, onConfirm) {
        confirmModalMessage.textContent = message;
        confirmCallback = onConfirm;
        if(message.toLowerCase().includes('hapus') || message.toLowerCase().includes('keluar')){
            confirmModalOkBtn.className = 'px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700';
        } else {
            confirmModalOkBtn.className = 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700';
        }
        confirmModal.classList.remove('hidden');
    }

    confirmModalOkBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        confirmModal.classList.add('hidden');
        confirmCallback = null;
    });

    confirmModalCancelBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        confirmCallback = null;
    });

    // =================================================================
    // AUTHENTICATION & ROUTING
    // =================================================================
    function checkSession() {
        const userSession = localStorage.getItem('currentUser');
        if (userSession) {
            currentUser = JSON.parse(userSession);
            showApp();
        } else {
            showAuth();
        }
    }

    function showAuth() {
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    async function showApp() {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        welcomeMessage.textContent = `Selamat datang, ${currentUser.nama}!`;
        await loadInitialData();
    }
    
    function showView(viewToShow) {
        [dashboardView, allEntriesView, attendanceView, reportsView].forEach(v => v.classList.add('hidden'));
        viewToShow.classList.remove('hidden');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.loginEmail.value;
        const password = e.target.loginPassword.value;

        if (email === 'Admin' && password === 'admin69') {
            currentUser = { nama: 'Administrator', email: 'Admin' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            await showApp();
            return;
        }

        showLoader(true);
        try {
            const response = await callAppsScript('login', { email, password });
            if (response.status === 'success') {
                currentUser = response.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                await showApp();
            } else if (response.status === 'pending') {
                showAlertModal(response.message, 'info');
            }
        } catch (error) {
            showAlertModal(`Login Gagal: ${error.message}`, 'error');
        } finally {
            showLoader(false);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader(true);
        try {
            const result = await callAppsScript('register', { nama: e.target.registerName.value, email: e.target.registerEmail.value, password: e.target.registerPassword.value });
            showAlertModal(result.message, 'success');
            e.target.reset();
            document.getElementById('loginView').classList.remove('hidden');
            document.getElementById('registerView').classList.add('hidden');
        } catch (error) {
            showAlertModal(`Pendaftaran Gagal: ${error.message}`, 'error');
        } finally {
            showLoader(false);
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        showConfirmModal('Yakin ingin keluar?', () => {
            localStorage.removeItem('currentUser');
            showAuth();
        });
    });

    showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('loginView').classList.add('hidden'); document.getElementById('registerView').classList.remove('hidden'); });
    showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('registerView').classList.add('hidden'); document.getElementById('loginView').classList.remove('hidden'); });

    // =================================================================
    // NAVIGATION
    // =================================================================
    document.getElementById('viewAllBtn').addEventListener('click', () => { showView(allEntriesView); renderAllEntries(); });
    document.getElementById('attendanceBtn').addEventListener('click', () => showView(attendanceView));
    document.getElementById('reportsBtn').addEventListener('click', () => {
        showView(reportsView);
        const today = new Date(), firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('reportFromDate').value = firstDay.toISOString().split('T')[0];
        document.getElementById('reportToDate').value = today.toISOString().split('T')[0];
    });
    document.getElementById('backToDashboard').addEventListener('click', () => showView(dashboardView));
    document.getElementById('backToDashboardFromAttendance').addEventListener('click', () => showView(dashboardView));
    document.getElementById('backToDashboardFromReports').addEventListener('click', () => showView(dashboardView));

    // =================================================================
    // API & DATA
    // =================================================================
    function showLoader(show) { loadingOverlay.classList.toggle('hidden', !show); }

    async function callAppsScript(action, data = {}) {
        if (SCRIPT_URL.includes('MASUKKAN')) { throw new Error('URL Apps Script belum dikonfigurasi.'); }
        const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify({ action, data }) });
        const result = await response.json();
        if (result.status === 'error') throw new Error(result.message);
        return result.data;
    }

    async function loadInitialData() {
        showLoader(true);
        try {
            [journalEntries, attendanceData, availableClasses] = await Promise.all([
                callAppsScript('getJournal', { userEmail: currentUser.email }),
                callAppsScript('getAttendance', { userEmail: currentUser.email }),
                callAppsScript('getUniqueClasses')
            ]);
            populateClassDropdowns();
            const today = new Date();
            document.getElementById('quickDate').value = today.toISOString().split('T')[0];
            document.getElementById('attendanceDate').value = today.toISOString().split('T')[0];
            updateDashboard();
            showView(dashboardView);
        } catch (error) {
            showAlertModal(`Gagal memuat data: ${error.message}`, 'error');
        } finally {
            showLoader(false);
        }
    }
    
    // --- FUNGSI DIPERBAIKI ---
    function populateClassDropdowns() {
        const dropdownSelectors = ['#quickClass', '#filterClass', '#attendanceClass', '#reportClass', '#editClass'];
        
        dropdownSelectors.forEach(selector => {
            const selectElement = document.querySelector(selector);
            if (selectElement) {
                // Simpan teks dan nilai dari opsi pertama
                const firstOptionText = selectElement.options[0].textContent;
                const firstOptionValue = selectElement.options[0].value;
                
                // Kosongkan dropdown
                selectElement.innerHTML = '';
                
                // Buat ulang dan tambahkan opsi pertama
                const firstOption = document.createElement('option');
                firstOption.value = firstOptionValue;
                firstOption.textContent = firstOptionText;
                selectElement.appendChild(firstOption);

                // Tambahkan kelas dari data yang diambil
                availableClasses.forEach(className => {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    selectElement.appendChild(option);
                });
            }
        });
    }

    function updateDashboard() {
        renderRecentEntries();
        updateStatistics();
        renderCalendar(currentCalDate.getFullYear(), currentCalDate.getMonth());
    }

    // =================================================================
    // JOURNAL & DASHBOARD LOGIC
    // =================================================================
    document.getElementById('quickSaveBtn').addEventListener('click', async () => {
        const entry = { date: document.getElementById('quickDate').value, class: document.getElementById('quickClass').value, subject: document.getElementById('quickSubject').value, activity: document.getElementById('quickActivity').value, userEmail: currentUser.email };
        if (!entry.date || !entry.class || !entry.subject || !entry.activity) { showAlertModal('Lengkapi semua field!', 'error'); return; }
        showLoader(true);
        try {
            const result = await callAppsScript('saveJournal', entry);
            entry.id = result.entryId;
            journalEntries.push(entry);
            document.getElementById('quickClass').value = ''; document.getElementById('quickSubject').value = ''; document.getElementById('quickActivity').value = '';
            updateDashboard();
            showAlertModal('Jurnal berhasil disimpan!', 'success');
        } catch (e) { showAlertModal(`Error: ${e.message}`, 'error'); } finally { showLoader(false); }
    });

    function renderRecentEntries() {
        const container = document.getElementById('recentEntries'); container.innerHTML = '';
        [...journalEntries].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5).forEach(e => {
            const el = document.createElement('div'); el.className = 'bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer';
            el.innerHTML = `<div class="flex justify-between"><div><h4>${formatDate(e.date)} - ${e.class}</h4><p class="text-sm">${e.subject}</p></div></div><p class="mt-2 text-sm line-clamp-2">${e.activity}</p>`;
            el.onclick = () => showEntryDetail(e);
            container.appendChild(el);
        });
    }

    function updateStatistics() {
        document.getElementById('totalEntries').textContent = journalEntries.length;
        const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        document.getElementById('weekEntries').textContent = journalEntries.filter(e => new Date(e.date) >= startOfWeek).length;
        const classCounts = journalEntries.reduce((a, e) => { a[e.class] = (a[e.class] || 0) + 1; return a; }, {});
        document.getElementById('topClass').textContent = Object.keys(classCounts).reduce((a, b) => classCounts[a] > classCounts[b] ? a : b, '-');
    }

    function renderCalendar(year, month) {
        const monthNames = ['Januari','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
        const calendarDays = document.getElementById('calendarDays'); calendarDays.innerHTML = '';
        const firstDay = new Date(year, month, 1).getDay();
        for (let i=0; i<firstDay; i++) calendarDays.appendChild(document.createElement('div'));
        for (let day=1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const el = document.createElement('div'); el.className = 'calendar-day'; el.textContent = day;
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            if (journalEntries.some(e => e.date === dateStr)) el.classList.add('has-entry');
            el.onclick = () => { if(el.classList.contains('has-entry')) { showView(allEntriesView); document.getElementById('filterFromDate').value = dateStr; document.getElementById('filterToDate').value = dateStr; renderAllEntries(); }};
            calendarDays.appendChild(el);
        }
    }
    document.getElementById('prevMonth').addEventListener('click', () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); renderCalendar(currentCalDate.getFullYear(), currentCalDate.getMonth()); });
    document.getElementById('nextMonth').addEventListener('click', () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); renderCalendar(currentCalDate.getFullYear(), currentCalDate.getMonth()); });

    document.getElementById('applyFilterBtn').addEventListener('click', renderAllEntries);
    function renderAllEntries() {
        const tbody = document.getElementById('entriesTableBody'); tbody.innerHTML = '';
        const from=document.getElementById('filterFromDate').value, to=document.getElementById('filterToDate').value, fClass=document.getElementById('filterClass').value, fSub=document.getElementById('filterSubject').value;
        let filtered = [...journalEntries].filter(e => (!from||e.date>=from)&&(!to||e.date<=to)&&(!fClass||e.class===fClass)&&(!fSub||e.subject===fSub));
        document.getElementById('noEntriesMessage').classList.toggle('hidden', filtered.length > 0);
        filtered.forEach(e => {
            const row = tbody.insertRow();
            row.innerHTML = `<td class="p-3">${formatDate(e.date)}</td><td class="p-3">${e.class}</td><td class="p-3">${e.subject}</td><td class="p-3 line-clamp-2">${e.activity}</td><td class="p-3 text-right"><button class="text-blue-600">Lihat</button></td>`;
            row.querySelector('button').onclick = () => showEntryDetail(e);
        });
    }

    function showEntryDetail(entry) {
        document.getElementById('detailDate').textContent = formatDate(entry.date);
        document.getElementById('detailClass').textContent = entry.class;
        document.getElementById('detailSubject').textContent = entry.subject;
        document.getElementById('detailActivity').textContent = entry.activity;
        document.getElementById('editEntryBtn').onclick = () => {
            document.getElementById('editEntryId').value = entry.id; document.getElementById('editDate').value = entry.date;
            document.getElementById('editClass').value = entry.class; document.getElementById('editSubject').value = entry.subject; document.getElementById('editActivity').value = entry.activity;
            document.getElementById('entryDetailModal').classList.add('hidden'); document.getElementById('editEntryModal').classList.remove('hidden');
        };
        document.getElementById('deleteEntryBtn').onclick = () => {
            showConfirmModal('Yakin hapus jurnal ini?', async () => {
                showLoader(true);
                try { 
                    await callAppsScript('deleteJournal', { entryId: entry.id, userEmail: currentUser.email });
                    journalEntries = journalEntries.filter(j => j.id !== entry.id);
                    updateDashboard(); 
                    document.getElementById('entryDetailModal').classList.add('hidden');
                    showAlertModal('Jurnal berhasil dihapus.', 'success');
                } catch (e) { 
                    showAlertModal(`Error: ${e.message}`, 'error'); 
                } finally { 
                    showLoader(false); 
                }
            });
        };
        document.getElementById('entryDetailModal').classList.remove('hidden');
    }
    document.getElementById('closeDetailModal').addEventListener('click', () => document.getElementById('entryDetailModal').classList.add('hidden'));
    document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editEntryModal').classList.add('hidden'));
    document.getElementById('updateEntryBtn').addEventListener('click', async () => {
        const entry = { id: document.getElementById('editEntryId').value, date: document.getElementById('editDate').value, class: document.getElementById('editClass').value, subject: document.getElementById('editSubject').value, activity: document.getElementById('editActivity').value, userEmail: currentUser.email };
        showLoader(true);
        try {
            await callAppsScript('saveJournal', entry);
            const index = journalEntries.findIndex(j => j.id === entry.id);
            if(index > -1) journalEntries[index] = entry;
            updateDashboard(); document.getElementById('editEntryModal').classList.add('hidden');
            showAlertModal('Jurnal berhasil diperbarui!', 'success');
        } catch(e){ showAlertModal(`Error: ${e.message}`, 'error'); } finally { showLoader(false); }
    });

    // =================================================================
    // ATTENDANCE LOGIC
    // =================================================================
    document.getElementById('newAttendanceTab').addEventListener('click', (e) => { e.target.classList.add('tab-active'); document.getElementById('attendanceHistoryTab').classList.remove('tab-active'); document.getElementById('newAttendanceForm').classList.remove('hidden'); document.getElementById('attendanceHistoryContent').classList.add('hidden'); });
    document.getElementById('attendanceHistoryTab').addEventListener('click', (e) => { e.target.classList.add('tab-active'); document.getElementById('newAttendanceTab').classList.remove('tab-active'); document.getElementById('newAttendanceForm').classList.add('hidden'); document.getElementById('attendanceHistoryContent').classList.remove('hidden'); renderAttendanceHistory(); });
    
    document.getElementById('loadStudentsBtn').addEventListener('click', async () => {
        const className = document.getElementById('attendanceClass').value;
        if (!className) { showAlertModal('Pilih kelas terlebih dahulu!', 'error'); return; }
        showLoader(true);
        try {
            const students = await callAppsScript('getStudentsByClass', { className });
            const tbody = document.getElementById('studentListBody'); tbody.innerHTML = '';
            students.forEach((s, i) => {
                const row = tbody.insertRow(); row.setAttribute('data-student-id', s.id);
                row.innerHTML = `<td class="p-3">${i+1}</td><td class="p-3 student-name">${s.name}</td><td class="p-3"><select class="w-full p-1 border rounded student-status"><option value="hadir">Hadir</option><option value="sakit">Sakit</option><option value="izin">Izin</option><option value="tidak_hadir">Alpha</option></select></td><td class="p-3"><input type="text" class="w-full p-1 border rounded student-note" placeholder="Ket..."></td>`;
            });
            document.getElementById('studentListContainer').classList.remove('hidden');
        } catch(e) { showAlertModal(`Error: ${e.message}`, 'error'); } finally { showLoader(false); }
    });

    document.getElementById('saveAttendanceBtn').addEventListener('click', async () => {
        const record = { date: document.getElementById('attendanceDate').value, class: document.getElementById('attendanceClass').value, subject: document.getElementById('attendanceSubject').value, userEmail: currentUser.email, students: [] };
        if (!record.date || !record.class || !record.subject) { showAlertModal('Lengkapi data absensi!', 'error'); return; }
        document.querySelectorAll('#studentListBody tr').forEach(row => {
            record.students.push({ id: row.dataset.studentId, name: row.querySelector('.student-name').textContent, status: row.querySelector('.student-status').value, note: row.querySelector('.student-note').value });
        });
        showLoader(true);
        try {
            const result = await callAppsScript('saveAttendance', record);
            record.id = result.attendanceId;
            attendanceData.push(record);
            showAlertModal('Absensi berhasil disimpan!', 'success');
            document.getElementById('attendanceHistoryTab').click();
        } catch(e) { showAlertModal(`Error: ${e.message}`, 'error'); } finally { showLoader(false); }
    });

    function renderAttendanceHistory() {
        const tbody = document.getElementById('attendanceHistoryBody'); tbody.innerHTML = '';
        document.getElementById('noAttendanceMessage').classList.toggle('hidden', attendanceData.length > 0);
        [...attendanceData].sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(a => {
            const present = a.students.filter(s => s.status === 'hadir').length, absent = a.students.length - present;
            const row = tbody.insertRow();
            row.innerHTML = `<td class="p-3">${formatDate(a.date)}</td><td class="p-3">${a.class}</td><td class="p-3">${a.subject}</td><td class="p-3 text-green-600">${present}</td><td class="p-3 text-red-600">${absent}</td><td class="p-3 text-right"><button class="text-blue-600">Detail</button></td>`;
            row.querySelector('button').onclick = () => showAttendanceDetail(a);
        });
    }

    function showAttendanceDetail(att) {
        document.getElementById('attendanceDetailDate').textContent = formatDate(att.date);
        document.getElementById('attendanceDetailClass').textContent = att.class;
        document.getElementById('attendanceDetailSubject').textContent = att.subject;
        const tbody = document.getElementById('attendanceDetailBody'); tbody.innerHTML = '';
        att.students.forEach((s, i) => {
            const row = tbody.insertRow();
            row.innerHTML = `<td class="p-3">${i+1}</td><td class="p-3">${s.name}</td><td class="p-3">${s.status}</td><td class="p-3">${s.note || '-'}</td>`;
        });
        document.getElementById('attendanceDetailModal').classList.remove('hidden');
    }
    document.getElementById('closeAttendanceDetailModal').addEventListener('click', () => document.getElementById('attendanceDetailModal').classList.add('hidden'));
    
    // =================================================================
    // REPORTS SECTION LOGIC
    // =================================================================
    let statusChart = null, classChart = null;

    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('tab-active'));
            tab.classList.add('tab-active');
            document.querySelectorAll('.report-content-item').forEach(c => { c.innerHTML = ''; c.classList.add('hidden'); });
            document.getElementById('reportPlaceholder').classList.remove('hidden');
            const contentToShow = document.getElementById(tab.id.replace('Tab', 'Content'));
            if (contentToShow) contentToShow.classList.remove('hidden');
        });
    });

    document.getElementById('generateReportBtn').addEventListener('click', () => {
        const activeTabId = document.querySelector('.report-tab.tab-active').id;
        const filters = { from: document.getElementById('reportFromDate').value, to: document.getElementById('reportToDate').value, class: document.getElementById('reportClass').value, subject: document.getElementById('reportSubject').value };
        if (!filters.from || !filters.to) { showAlertModal('Pilih rentang tanggal.', 'error'); return; }
        document.getElementById('reportPlaceholder').classList.add('hidden');
        
        if (activeTabId === 'journalReportTab') generateJournalReport(filters);
        else if (activeTabId === 'attendanceReportTab') generateDetailedAttendanceReport(filters);
        else if (activeTabId === 'summaryReportTab') generateSummaryReport(filters);
    });

    function generateJournalReport(filters) {
        const container = document.getElementById('journalReportContent');
        let filtered = journalEntries.filter(e => (!filters.from||e.date>=filters.from)&&(!filters.to||e.date<=filters.to)&&(!filters.class||e.class===filters.class)&&(!filters.subject||e.subject===filters.subject));
        if (filtered.length === 0) { container.innerHTML = '<p class="text-center p-8">Tidak ada data jurnal ditemukan.</p>'; return; }
        let tableHTML = `<thead class="bg-gray-50"><tr><th class="p-3 text-left text-xs uppercase">No</th><th class="p-3 text-left text-xs uppercase">Tanggal</th><th class="p-3 text-left text-xs uppercase">Kelas</th><th class="p-3 text-left text-xs uppercase">Mapel</th><th class="p-3 text-left text-xs uppercase">Kegiatan</th></tr></thead><tbody>`;
        filtered.forEach((e, i) => { tableHTML += `<tr><td class="p-3">${i+1}</td><td class="p-3">${formatDate(e.date)}</td><td class="p-3">${e.class}</td><td class="p-3">${e.subject}</td><td class="p-3">${e.activity.replace(/\n/g, '<br>')}</td></tr>`; });
        container.innerHTML = `<div class="bg-white p-6 rounded-xl shadow-md"><h3 class="text-xl font-semibold mb-4">Laporan Jurnal Mengajar</h3><div class="overflow-x-auto"><table class="min-w-full divide-y">${tableHTML}</tbody></table></div></div>`;
    }

    function generateSummaryReport(filters) {
        const container = document.getElementById('summaryReportContent');
        let journals = journalEntries.filter(e=>(!filters.from||e.date>=filters.from)&&(!filters.to||e.date<=filters.to)&&(!filters.class||e.class===filters.class)&&(!filters.subject||e.subject===filters.subject));
        let attendance = attendanceData.filter(a=>(!filters.from||a.date>=filters.from)&&(!filters.to||a.date<=filters.to)&&(!filters.class||a.class===filters.class)&&(!filters.subject||a.subject===filters.subject));
        let total = 0, present = 0;
        attendance.forEach(r => r.students.forEach(s => { total++; if (s.status === 'hadir') present++; }));
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        container.innerHTML = `<div class="bg-white p-6 rounded-xl shadow-md"><h3 class="text-xl font-semibold mb-4">Ringkasan Umum</h3><div class="grid grid-cols-2 gap-4"><div class="border p-4 rounded text-center"><h4>Total Entri Jurnal</h4><p class="text-4xl font-bold">${journals.length}</p></div><div class="border p-4 rounded text-center"><h4>Tingkat Kehadiran</h4><p class="text-4xl font-bold">${percentage}%</p></div></div></div>`;
    }

    function generateDetailedAttendanceReport(filters) {
        const container = document.getElementById('attendanceReportContent');
        container.innerHTML = `<div class="bg-white rounded-xl shadow-md p-6 mb-6"><h3 class="text-lg font-semibold mb-4">Ringkasan Absensi</h3><div class="grid grid-cols-4 gap-4"><div class="bg-blue-50 p-4 rounded-lg"><p class="text-sm">Total Sesi</p><p id="totalSessions" class="text-2xl font-bold">0</p></div><div class="bg-green-50 p-4 rounded-lg"><p class="text-sm">Total Hadir</p><p id="totalPresent" class="text-2xl font-bold">0</p></div><div class="bg-red-50 p-4 rounded-lg"><p class="text-sm">Total Tdk Hadir</p><p id="totalAbsent" class="text-2xl font-bold">0</p></div><div class="bg-yellow-50 p-4 rounded-lg"><p class="text-sm">% Hadir</p><p id="attendancePercentage" class="text-2xl font-bold">0%</p></div></div></div><div class="grid md:grid-cols-2 gap-6 mb-6"><div class="bg-white rounded-xl p-6 shadow-md"><h3 class="text-lg font-semibold mb-4">Status Kehadiran</h3><div class="relative h-[300px]"><canvas id="attendanceStatusChart"></canvas></div></div><div class="bg-white rounded-xl p-6 shadow-md"><h3 class="text-lg font-semibold mb-4">Kehadiran per Kelas</h3><div class="relative h-[300px]"><canvas id="attendanceByClassChart"></canvas></div></div></div><div class="bg-white p-6 rounded-xl shadow-md mb-6"><div class="flex justify-between items-center mb-4"><h3>Detail Sesi</h3><button id="printReportBtnInternal" class="px-4 py-2 bg-gray-600 text-white rounded no-print">Cetak</button></div><div class="overflow-x-auto"><table id="detailedAttendanceTable" class="min-w-full divide-y"></table></div></div><div class="bg-white p-6 rounded-xl shadow-md"><h3 class="text-lg font-semibold mb-4">Analisis Kehadiran Siswa</h3><div class="mb-4"><select id="classAnalysis" class="w-full md:w-1/3 p-2 border rounded"></select></div><div id="studentAnalysisContent" class="hidden"><div class="overflow-x-auto"><table class="min-w-full divide-y"><thead class="bg-gray-50"><tr><th class="p-3 text-left text-xs uppercase">No</th><th class="p-3 text-left text-xs uppercase">Nama</th><th class="p-3 text-left text-xs uppercase">H</th><th class="p-3 text-left text-xs uppercase">S</th><th class="p-3 text-left text-xs uppercase">I</th><th class="p-3 text-left text-xs uppercase">A</th><th class="p-3 text-left text-xs uppercase">%</th></tr></thead><tbody id="studentAnalysisTableBody"></tbody></table></div></div></div>`;
        
        let filtered = attendanceData.filter(a=>(!filters.from||a.date>=filters.from)&&(!filters.to||a.date<=filters.to)&&(!filters.class||a.class===filters.class)&&(!filters.subject||a.subject===filters.subject));
        
        let totalSessions=filtered.length,totalPresent=0,totalSick=0,totalPermit=0,totalAbsent=0;
        filtered.forEach(s=>s.students.forEach(st=>{if(st.status==='hadir')totalPresent++;else if(st.status==='sakit')totalSick++;else if(st.status==='izin')totalPermit++;else totalAbsent++;}));
        const totalRecords = totalPresent+totalSick+totalPermit+totalAbsent;
        container.querySelector('#totalSessions').textContent=totalSessions;
        container.querySelector('#totalPresent').textContent=totalPresent;
        container.querySelector('#totalAbsent').textContent=totalSick+totalPermit+totalAbsent;
        container.querySelector('#attendancePercentage').textContent=`${totalRecords > 0 ? Math.round((totalPresent/totalRecords)*100) : 0}%`;

        if(statusChart) statusChart.destroy();
        statusChart = new Chart(container.querySelector('#attendanceStatusChart').getContext('2d'),{type:'doughnut',data:{labels:['Hadir','Sakit','Izin','Alpha'],datasets:[{data:[totalPresent,totalSick,totalPermit,totalAbsent],backgroundColor:['#22c55e','#facc15','#3b82f6','#ef4444']}]},options:{responsive:true,maintainAspectRatio:false}});
        
        const classCounts = filtered.reduce((acc, s)=>{acc[s.class]=(acc[s.class]||0)+s.students.filter(st=>st.status==='hadir').length;return acc;},{});
        if(classChart) classChart.destroy();
        classChart = new Chart(container.querySelector('#attendanceByClassChart').getContext('2d'),{type:'bar',data:{labels:Object.keys(classCounts),datasets:[{label:'Total Kehadiran',data:Object.values(classCounts),backgroundColor:'#3b82f6'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});

        let tableHTML = `<thead class="bg-gray-50"><tr><th class="p-3 text-left text-xs uppercase">Tgl</th><th class="p-3 text-left text-xs uppercase">Kelas</th><th class="p-3 text-left text-xs uppercase">Mapel</th><th class="p-3 text-left text-xs uppercase">H</th><th class="p-3 text-left text-xs uppercase">S</th><th class="p-3 text-left text-xs uppercase">I</th><th class="p-3 text-left text-xs uppercase">A</th></tr></thead><tbody>`;
        filtered.forEach(s=>{const h=s.students.filter(st=>st.status==='hadir').length,sk=s.students.filter(st=>st.status==='sakit').length,i=s.students.filter(st=>st.status==='izin').length,a=s.students.filter(st=>st.status==='tidak_hadir').length;tableHTML+=`<tr><td class="p-3">${formatDate(s.date)}</td><td>${s.class}</td><td>${s.subject}</td><td>${h}</td><td>${sk}</td><td>${i}</td><td>${a}</td></tr>`;});
        container.querySelector('#detailedAttendanceTable').innerHTML = tableHTML + `</tbody>`;

        const classSelect = container.querySelector('#classAnalysis'); classSelect.innerHTML='<option value="">Pilih Kelas</option>';
        [...new Set(filtered.map(i=>i.class))].forEach(c=>classSelect.innerHTML+=`<option value="${c}">${c}</option>`);
        classSelect.onchange=(e)=>showStudentAnalysis(e.target.value, filtered);
        container.querySelector('#printReportBtnInternal').onclick=()=>window.print();
    }

    async function showStudentAnalysis(className, filteredData) {
        const analysisContainer = document.getElementById('studentAnalysisContent'), tbody = document.getElementById('studentAnalysisTableBody');
        if(!className || !analysisContainer) { if(analysisContainer) analysisContainer.classList.add('hidden'); return; }
        showLoader(true);
        try {
            const students = await callAppsScript('getStudentsByClass', {className});
            const stats = students.reduce((acc,s)=>{acc[s.name]={name:s.name,h:0,s:0,i:0,a:0,total:0};return acc;},{});
            filteredData.filter(a=>a.class===className).forEach(session=>{
                Object.values(stats).forEach(stat=>stat.total++);
                session.students.forEach(rec=>{if(stats[rec.name]){if(rec.status==='hadir')stats[rec.name].h++;else if(rec.status==='sakit')stats[rec.name].s++;else if(rec.status==='izin')stats[rec.name].i++;else stats[rec.name].a++;}});
            });
            let html='';
            Object.values(stats).forEach((s,i)=>{const p=s.total>0?Math.round((s.h/s.total)*100):0;html+=`<tr><td class="p-3">${i+1}</td><td>${s.name}</td><td>${s.h}</td><td>${s.s}</td><td>${s.i}</td><td>${s.a}</td><td class="font-semibold">${p}%</td></tr>`;});
            tbody.innerHTML = html;
            analysisContainer.classList.remove('hidden');
        } catch(e){showAlertModal(`Error: ${e.message}`, 'error');} finally {showLoader(false);}
    }
    
    function formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
});
