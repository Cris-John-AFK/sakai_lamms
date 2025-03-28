<script setup>
import { useLayout } from '@/layout/composables/layout';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { QrcodeStream } from 'vue-qrcode-reader';

const { layoutState, isSidebarActive } = useLayout();
const outsideClickListener = ref(null);
const scanning = ref(true); // Auto-start scanning
const attendanceRecords = ref([]);
const searchQuery = ref('');
const selectedStudent = ref(null);

// Mock student data instead of using AttendanceService.getData()
const allStudents = ref([
    {
        id: '12345',
        name: 'Jane Smith',
        gradeLevel: '10',
        section: 'A',
        contact: '(555) 123-4567',
        emergencyContact: '(555) 987-6543',
        validUntil: 'June 30, 2024',
        photo: '/demo/images/student-photo.jpg'
    },
    {
        id: '23456',
        name: 'John Doe',
        gradeLevel: '11',
        section: 'B',
        contact: '(555) 234-5678',
        emergencyContact: '(555) 876-5432',
        validUntil: 'June 30, 2024',
        photo: '/demo/images/student-photo.jpg'
    },
    {
        id: '34567',
        name: 'Alice Johnson',
        gradeLevel: '9',
        section: 'C',
        contact: '(555) 345-6789',
        emergencyContact: '(555) 765-4321',
        validUntil: 'June 30, 2024',
        photo: '/demo/images/student-photo.jpg'
    }
]);

const currentDateTime = ref(new Date());
const guardName = ref('John Doe');
const guardId = ref('G-12345');
const statusFilter = ref('all');
const scanFeedback = ref({ show: false, type: '', message: '' });
const cameraError = ref(null);

// Stats
const totalCheckins = computed(() => attendanceRecords.value.filter((record) => record.recordType === 'check-in').length);
const totalCheckouts = computed(() => attendanceRecords.value.filter((record) => record.recordType === 'check-out').length);
const lateArrivals = computed(() => attendanceRecords.value.filter((record) => record.status === 'late' && record.recordType === 'check-in').length);
const unauthorizedAttempts = computed(() => attendanceRecords.value.filter((record) => record.status === 'unauthorized').length);

// Timer reference for cleanup
const timeInterval = ref(null);

// Update time every second
onMounted(() => {
    timeInterval.value = setInterval(() => {
        currentDateTime.value = new Date();
    }, 1000);

    console.log('Component mounted, students data:', allStudents.value);
});

// Clean up interval on component unmount
onBeforeUnmount(() => {
    if (timeInterval.value) {
        clearInterval(timeInterval.value);
    }
});

watch(isSidebarActive, (newVal) => {
    if (newVal) {
        bindOutsideClickListener();
    } else {
        unbindOutsideClickListener();
    }
});

function bindOutsideClickListener() {
    if (!outsideClickListener.value) {
        outsideClickListener.value = (event) => {
            if (isOutsideClicked(event)) {
                layoutState.overlayMenuActive = false;
                layoutState.staticMenuMobileActive = false;
                layoutState.menuHoverActive = false;
            }
        };
        document.addEventListener('click', outsideClickListener.value);
    }
}

function unbindOutsideClickListener() {
    if (outsideClickListener.value) {
        document.removeEventListener('click', outsideClickListener.value);
        outsideClickListener.value = null;
    }
}

function isOutsideClicked(event) {
    const topbarEl = document.querySelector('.layout-menu-button');
    return !(topbarEl && (topbarEl.isSameNode(event.target) || topbarEl.contains(event.target)));
}

const onDetect = (detectedCodes) => {
    console.log('QR Code Detected:', detectedCodes);
    if (detectedCodes.length > 0) {
        const studentId = detectedCodes[0].rawValue;
        console.log('Detected Student ID:', studentId);
        processStudentScan(studentId);
    }
};

const onCameraError = (error) => {
    console.error('Camera Error:', error);
    cameraError.value = error.message || 'Failed to access camera';
    scanning.value = false;
};

const restartCamera = () => {
    cameraError.value = null;
    scanning.value = true;
};

const processStudentScan = (studentId) => {
    console.log('Processing student scan for ID:', studentId);
    console.log('All students:', allStudents.value);

    // Find the student in our allStudents array
    // Handle both string and number IDs
    const student = allStudents.value.find((s) => s.id.toString() === studentId.toString());

    console.log('Found student:', student);

    if (student) {
        // Get today's records for this student
        const todaysRecords = attendanceRecords.value.filter((record) => record.id.toString() === student.id.toString() && record.date === new Date().toLocaleDateString());

        console.log("Today's records for this student:", todaysRecords);

        // Determine record type based on the pattern of previous records
        let recordType;

        if (todaysRecords.length === 0) {
            // First scan of the day - always a check-in
            recordType = 'check-in';
        } else {
            // Get the most recent record for this student
            const latestRecord = [...todaysRecords].sort((a, b) => {
                // Convert timestamps to Date objects for proper comparison
                const timeA = new Date(`1/1/2023 ${a.timestamp}`);
                const timeB = new Date(`1/1/2023 ${b.timestamp}`);
                return timeB - timeA; // Sort in descending order (newest first)
            })[0];

            console.log('Latest record:', latestRecord);

            // If the latest record is a check-in, this should be a check-out
            // If the latest record is a check-out, this should be a check-in
            recordType = latestRecord.recordType === 'check-in' ? 'check-out' : 'check-in';
        }

        console.log('Determined record type:', recordType);

        // Determine status (simplified logic - in real app would check against schedule)
        let status = 'on-time';
        const currentHour = new Date().getHours();

        // Only check for late status on check-ins
        if (recordType === 'check-in' && currentHour >= 8) {
            status = 'late';
        }

        // Create record with unique ID
        const record = {
            ...student,
            timestamp: new Date().toLocaleTimeString(),
            date: new Date().toLocaleDateString(),
            status: status,
            recordType: recordType,
            recordId: `${student.id}-${Date.now()}` // Unique ID for each record
        };

        // Show feedback
        showScanFeedback(status, recordType);

        // Play sound based on status
        playStatusSound(status);

        // Add to records and show details
        attendanceRecords.value.unshift(record); // Add to beginning
        selectedStudent.value = record;

        console.log('Student record created:', record);
    } else {
        // Invalid QR code
        console.log('Invalid student ID:', studentId);
        showScanFeedback('unauthorized', null, 'Invalid student ID');
        playStatusSound('unauthorized');
    }
};

const showScanFeedback = (status, recordType, message = '') => {
    // Default messages based on record type and status
    let defaultMessage = '';
    if (recordType === 'check-in') {
        defaultMessage = status === 'on-time' ? 'Check-in successful' : status === 'late' ? 'Late check-in recorded' : 'Unauthorized check-in attempt';
    } else if (recordType === 'check-out') {
        defaultMessage = 'Check-out successful';
    } else {
        defaultMessage = 'Unauthorized scan';
    }

    scanFeedback.value = {
        show: true,
        type: status,
        message: message || defaultMessage
    };

    // Hide feedback after 3 seconds
    setTimeout(() => {
        scanFeedback.value.show = false;
    }, 3000);
};

const playStatusSound = (status) => {
    // In a real app, would play different sounds based on status
    let sound;

    if (status === 'on-time') {
        sound = new Audio('/demo/sounds/success.mp3');
    } else if (status === 'late') {
        sound = new Audio('/demo/sounds/warning.mp3');
    } else {
        sound = new Audio('/demo/sounds/error.mp3');
    }

    // Attempt to play the sound (may fail if sounds don't exist)
    try {
        sound.play().catch((e) => console.log('Sound play failed:', e));
    } catch (e) {
        console.log('Sound play error:', e);
    }

    console.log(`Playing ${status} sound`);
};

const manualCheckIn = () => {
    const studentId = prompt('Enter student ID:');
    if (studentId) {
        processStudentScan(studentId);
    }
};

const exportReport = () => {
    alert('Exporting attendance report...');
    // In a real app, would generate CSV/PDF
};

const filteredRecords = computed(() => {
    let records = attendanceRecords.value;

    // Apply status filter
    if (statusFilter.value !== 'all') {
        records = records.filter((record) => record.status === statusFilter.value);
    }

    // Apply search filter
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        records = records.filter((record) => record.name.toLowerCase().includes(query) || record.id.toString().includes(query) || record.gradeLevel.toString().toLowerCase().includes(query) || record.section.toLowerCase().includes(query));
    }

    return records;
});
</script>

<template>
    <div class="layout-wrapper">
        <!-- Fixed Header -->
        <header class="dashboard-header">
            <div class="header-left">
                <img src="/demo/images/logo.png" alt="School Logo" class="school-logo" />
                <h1>Attendance Monitoring System</h1>
            </div>
            <div class="header-center">
                <div class="date-time">
                    <div class="date">{{ currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</div>
                    <div class="time">{{ currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</div>
                </div>
            </div>
            <div class="header-right">
                <div class="guard-info">
                    <i class="pi pi-user"></i>
                    <div>
                        <div class="guard-name">{{ guardName }}</div>
                        <div class="guard-id">ID: {{ guardId }}</div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Dashboard -->
        <div class="dashboard-container">
            <div class="dashboard-content">
                <!-- Left Panel: QR Scanner -->
                <div class="scanner-section">
                    <div class="section-header">
                        <h2><i class="pi pi-camera"></i> QR Scanner</h2>
                        <div class="scanner-actions">
                            <button @click="scanning = !scanning" class="action-button">
                                <i :class="scanning ? 'pi pi-pause' : 'pi pi-play'"></i>
                                {{ scanning ? 'Pause' : 'Resume' }}
                            </button>
                            <button @click="manualCheckIn" class="action-button">
                                <i class="pi pi-pencil"></i>
                                Manual
                            </button>
                        </div>
                    </div>

                    <div class="scanner-container" :class="{ 'scanning-active': scanning }">
                        <!-- Show camera feed when scanning -->
                        <qrcode-stream v-if="scanning && !cameraError" @detect="onDetect" @error="onCameraError" class="qr-scanner"></qrcode-stream>

                        <!-- Show paused message when not scanning -->
                        <div v-else-if="!scanning && !cameraError" class="scanner-paused">
                            <i class="pi pi-camera-off"></i>
                            <p>Scanner paused</p>
                        </div>

                        <!-- Show error message when camera fails -->
                        <div v-else class="scanner-error">
                            <i class="pi pi-exclamation-triangle"></i>
                            <p>{{ cameraError || 'Camera error occurred' }}</p>
                            <button @click="restartCamera" class="restart-button">
                                <i class="pi pi-refresh"></i>
                                Retry Camera
                            </button>
                        </div>

                        <!-- Scanner overlay with corners -->
                        <div class="scanner-overlay">
                            <div class="scanner-corners">
                                <span></span>
                            </div>
                        </div>

                        <!-- Scan feedback notification -->
                        <div v-if="scanFeedback.show" :class="['scan-feedback', 'feedback-' + scanFeedback.type]">
                            <i :class="scanFeedback.type === 'on-time' ? 'pi pi-check-circle' : scanFeedback.type === 'late' ? 'pi pi-clock' : 'pi pi-exclamation-circle'"></i>
                            {{ scanFeedback.message }}
                        </div>
                    </div>

                    <!-- Student Preview Section -->
                    <div class="student-preview" v-if="selectedStudent">
                        <div class="preview-header" :class="`status-${selectedStudent.status}`">
                            <div class="status-badge" :class="`status-${selectedStudent.status}`">
                                <i :class="selectedStudent.status === 'on-time' ? 'pi pi-check-circle' : selectedStudent.status === 'late' ? 'pi pi-clock' : 'pi pi-exclamation-circle'"></i>
                                {{ selectedStudent.recordType === 'check-in' ? 'Check In' : 'Check Out' }}
                                ({{ selectedStudent.status === 'on-time' ? 'On Time' : selectedStudent.status === 'late' ? 'Late' : 'Unauthorized' }})
                            </div>
                            <div class="timestamp">{{ selectedStudent.timestamp }}</div>
                        </div>

                        <div class="preview-content">
                            <div class="student-photo-container">
                                <img :src="selectedStudent.photo" alt="Student Photo" class="student-photo" />
                            </div>
                            <div class="student-info">
                                <h3>{{ selectedStudent.name }}</h3>
                                <div class="info-row">
                                    <span class="info-label">ID:</span>
                                    <span class="info-value">{{ selectedStudent.id }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Grade:</span>
                                    <span class="info-value">{{ selectedStudent.gradeLevel }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Section:</span>
                                    <span class="info-value">{{ selectedStudent.section }}</span>
                                </div>
                                <div class="info-row" v-if="selectedStudent.contact">
                                    <span class="info-label">Contact:</span>
                                    <span class="info-value">{{ selectedStudent.contact }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Empty state when no student is selected -->
                    <div class="student-preview empty-state" v-else>
                        <div class="empty-content">
                            <i class="pi pi-user-plus"></i>
                            <p>Scan a student ID or enter manually to see details</p>
                        </div>
                    </div>
                </div>

                <!-- Right Panel: Attendance Feed -->
                <div class="attendance-feed">
                    <div class="section-header">
                        <h2><i class="pi pi-list"></i> Attendance Feed</h2>
                        <div class="feed-actions">
                            <div class="search-container">
                                <span class="p-input-icon-left">
                                    <i class="pi pi-search"></i>
                                    <input v-model="searchQuery" type="text" placeholder="Search..." class="search-input" />
                                </span>
                            </div>

                            <div class="filter-buttons">
                                <button @click="statusFilter = 'all'" :class="['filter-button', statusFilter === 'all' ? 'active' : '']">All</button>
                                <button @click="statusFilter = 'on-time'" :class="['filter-button', statusFilter === 'on-time' ? 'active' : '']"><i class="pi pi-check-circle"></i> On Time</button>
                                <button @click="statusFilter = 'late'" :class="['filter-button', statusFilter === 'late' ? 'active' : '']"><i class="pi pi-clock"></i> Late</button>
                                <button @click="statusFilter = 'unauthorized'" :class="['filter-button', statusFilter === 'unauthorized' ? 'active' : '']"><i class="pi pi-exclamation-circle"></i> Unauthorized</button>
                            </div>
                        </div>
                    </div>

                    <!-- Empty state for attendance feed -->
                    <div v-if="filteredRecords.length === 0" class="empty-feed">
                        <i class="pi pi-calendar-times"></i>
                        <p>No attendance records found</p>
                        <span>Records will appear here as students check in</span>
                    </div>

                    <!-- Attendance records table -->
                    <DataTable v-else :value="filteredRecords" paginator :rows="10" class="attendance-table" responsiveLayout="scroll" :rowHover="true" v-model:selection="selectedStudent" selectionMode="single" dataKey="id">
                        <Column field="id" header="ID" :sortable="true"></Column>
                        <Column field="name" header="Name" :sortable="true"></Column>
                        <Column field="recordType" header="Type" :sortable="true">
                            <template #body="slotProps">
                                <span :class="['record-type', slotProps.data.recordType === 'check-in' ? 'type-in' : 'type-out']">
                                    <i :class="slotProps.data.recordType === 'check-in' ? 'pi pi-sign-in' : 'pi pi-sign-out'"></i>
                                    {{ slotProps.data.recordType === 'check-in' ? 'Check In' : 'Check Out' }}
                                </span>
                            </template>
                        </Column>
                        <Column field="gradeLevel" header="Grade" :sortable="true"></Column>
                        <Column field="section" header="Section"></Column>
                        <Column field="timestamp" header="Time" :sortable="true"></Column>
                        <Column field="status" header="Status" :sortable="true">
                            <template #body="slotProps">
                                <span class="status-badge" :class="`status-${slotProps.data.status}`">
                                    <i :class="slotProps.data.status === 'on-time' ? 'pi pi-check-circle' : slotProps.data.status === 'late' ? 'pi pi-clock' : 'pi pi-exclamation-circle'"></i>
                                    {{ slotProps.data.status === 'on-time' ? 'On Time' : slotProps.data.status === 'late' ? 'Late' : 'Unauthorized' }}
                                </span>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
        </div>

        <!-- Fixed Footer -->
        <div class="dashboard-footer">
            <div class="footer-stats">
                <div class="stat-item">
                    <div class="stat-label">Check-ins</div>
                    <div class="stat-value">{{ totalCheckins }}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Check-outs</div>
                    <div class="stat-value">{{ totalCheckouts }}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Late Arrivals</div>
                    <div class="stat-value status-late">{{ lateArrivals }}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Unauthorized</div>
                    <div class="stat-value status-unauthorized">{{ unauthorizedAttempts }}</div>
                </div>
            </div>

            <div class="footer-actions">
                <button @click="exportReport" class="export-button">
                    <i class="pi pi-download"></i>
                    Export Report
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
:root {
    --color-primary: #3b82f6;
    --color-secondary: #64748b;
    --color-dark: #1e293b;
    --color-light: #f8fafc;
    --color-ontime: #10b981;
    --color-late: #f59e0b;
    --color-danger: #ef4444;

    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 1rem;

    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Global Styles */
.layout-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #f1f5f9;
}

/* Header Styles */
.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 10;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.school-logo {
    height: 55px;
    width: auto;
}

.header-left h1 {
    font-size: 1.8rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
}

.header-center {
    text-align: center;
}

.date-time {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.date {
    font-size: 1.2rem;
    color: #64748b;
}

.time {
    font-size: 1.8rem;
    font-weight: 600;
    color: #1e293b;
}

.header-right {
    display: flex;
    align-items: center;
}

.guard-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    i {
        font-size: 2rem;
        color: #64748b;
        background: #f1f5f9;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    div {
        display: flex;
        flex-direction: column;
    }
}

.guard-name {
    font-size: 1.2rem;
    font-weight: 600;
    color: #1e293b;
}

.guard-id {
    font-size: 1.2rem;
    color: #64748b;
}

/* Main Container Styles */
.dashboard-container {
    flex: 1;
    padding: 1.5rem 2rem;
}

.dashboard-content {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1.5rem;
    height: 100%;
}

/* Section Header Styles */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        i {
            color: #3b82f6;
        }
    }
}

/* Scanner Section Styles */
.scanner-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.scanner-actions {
    display: flex;
    gap: 0.5rem;
}

.action-button {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #f8fafc;
        color: #3b82f6;
        border-color: #bfdbfe;
    }
}

.scanner-container {
    position: relative;
    height: 300px;
    border-radius: 0.75rem;
    overflow: hidden;
    background: #0f172a;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.qr-scanner {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.scanner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.scanner-corners {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 200px;

    &::before,
    &::after {
        content: '';
        position: absolute;
        width: 30px;
        height: 30px;
        border-color: rgba(255, 255, 255, 0.8);
        border-style: solid;
        border-width: 0;
    }

    &::before {
        top: 0;
        left: 0;
        border-top-width: 3px;
        border-left-width: 3px;
    }

    &::after {
        top: 0;
        right: 0;
        border-top-width: 3px;
        border-right-width: 3px;
    }

    span {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;

        &::before,
        &::after {
            content: '';
            position: absolute;
            width: 30px;
            height: 30px;
            border-color: rgba(255, 255, 255, 0.8);
            border-style: solid;
            border-width: 0;
        }

        &::before {
            bottom: 0;
            left: 0;
            border-bottom-width: 3px;
            border-left-width: 3px;
        }

        &::after {
            bottom: 0;
            right: 0;
            border-bottom-width: 3px;
            border-right-width: 3px;
        }
    }
}

.scanning-active .scanner-corners {
    &::before,
    &::after,
    span::before,
    span::after {
        animation: pulse 2s infinite;
    }
}

@keyframes pulse {
    0% {
        opacity: 0.5;
    }
    50% {
        opacity: 1;
    }
    100% {
        opacity: 0.5;
    }
}

.scanner-paused {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    background: rgba(15, 23, 42, 0.9);
}

.scanner-paused i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.7;
}

.scanner-paused p {
    font-size: 1.25rem;
    opacity: 0.9;
}

.scanner-error {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    background: rgba(15, 23, 42, 0.9);
}

.scanner-error i {
    font-size: 3rem;
    color: #ef4444;
    margin-bottom: 1rem;
}

.scanner-error p {
    font-size: 1.25rem;
    opacity: 0.9;
    margin-bottom: 1.5rem;
}

.restart-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    border: none;
    background: #3b82f6;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.restart-button:hover {
    background: #2563eb;
}

.scan-feedback {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
    animation: fadeInOut 3s ease-in-out;
}

.feedback-on-time {
    background: rgba(16, 185, 129, 0.9);
    color: white;
}

.feedback-late {
    background: rgba(245, 158, 11, 0.9);
    color: white;
}

.feedback-unauthorized {
    background: rgba(239, 68, 68, 0.9);
    color: white;
}

@keyframes fadeInOut {
    0% {
        opacity: 0;
        transform: translate(-50%, -20px);
    }
    10% {
        opacity: 1;
        transform: translate(-50%, 0);
    }
    90% {
        opacity: 1;
        transform: translate(-50%, 0);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -20px);
    }
}

.student-preview {
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.preview-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.preview-header.status-on-time {
    background: rgba(16, 185, 129, 0.1);
}

.preview-header.status-late {
    background: rgba(245, 158, 11, 0.1);
}

.preview-header.status-unauthorized {
    background: rgba(239, 68, 68, 0.1);
}

.status-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
}

.status-badge.status-on-time {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.status-badge.status-late {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
}

.status-badge.status-unauthorized {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.timestamp {
    font-size: 0.875rem;
    color: #64748b;
}

.preview-content {
    padding: 1.5rem;
    display: flex;
    gap: 1.5rem;
}

.student-photo-container {
    width: 100px;
    height: 120px;
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

.student-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.student-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.student-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #1e293b;
}

.info-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.info-label {
    font-weight: 600;
    color: #64748b;
    width: 70px;
}

.info-value {
    color: #334155;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.empty-content i {
    font-size: 3rem;
    color: #cbd5e1;
    margin-bottom: 1rem;
}

.empty-content p {
    color: #64748b;
    font-size: 1rem;
}

/* Attendance Feed Styles */
.attendance-feed {
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.feed-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.search-container {
    position: relative;
    width: 100%;
}

.search-input {
    width: 100%;
    padding: 0.625rem 0.75rem 0.625rem 2.5rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    font-size: 0.875rem;
    transition: all 0.2s;

    &:focus {
        outline: none;
        border-color: #93c5fd;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
}

.p-input-icon-left {
    position: relative;
    width: 100%;

    i {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
    }
}

.filter-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.filter-button {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #f8fafc;
    }

    &.active {
        background: #eff6ff;
        color: #3b82f6;
        border-color: #bfdbfe;
    }

    i {
        font-size: 0.875rem;
    }
}

.empty-feed {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;

    i {
        font-size: 3rem;
        color: #cbd5e1;
        margin-bottom: 1rem;
    }

    p {
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
    }

    span {
        color: #64748b;
        font-size: 0.875rem;
    }
}

/* DataTable Customizations */
:deep(.p-datatable) {
    .p-datatable-thead > tr > th {
        background: #f8fafc;
        color: #64748b;
        font-weight: 600;
        padding: 0.75rem 1rem;
        border-bottom: 2px solid #e2e8f0;
    }

    .p-datatable-tbody > tr {
        transition: background-color 0.2s;

        &:hover {
            background-color: #f1f5f9;
        }

        > td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f1f5f9;
        }

        &:nth-child(even) {
            background-color: #f8fafc;
        }
    }
}

/* Footer Styles */
.dashboard-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
}

.footer-stats {
    display: flex;
    gap: 2rem;
}

.stat-item {
    text-align: center;

    .stat-label {
        font-size: 0.8rem;
        color: #64748b;
        margin-bottom: 0.25rem;
    }

    .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;

        &.status-late {
            color: #f59e0b;
        }

        &.status-unauthorized {
            color: #ef4444;
        }
    }
}

.footer-actions {
    .export-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: #2563eb;
        }
    }
}

/* Responsive Adjustments */
@media (max-width: 1024px) {
    .dashboard-content {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }

    .scanner-container {
        height: 350px;
    }
}

@media (max-width: 768px) {
    .dashboard-header {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }

    .header-left,
    .header-center,
    .header-right {
        width: 100%;
        justify-content: center;
    }

    .dashboard-container {
        padding: 1rem;
    }

    .feed-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .search-input {
        width: 100%;
    }

    .dashboard-footer {
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem 1rem;
    }

    .footer-stats {
        width: 100%;
        justify-content: space-between;
    }
}
</style>
