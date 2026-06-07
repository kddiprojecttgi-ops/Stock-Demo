/**
 * Truck Record Management - Core Logic Engine
 * Fulfills all client requirements of responsiveness, modular translation strings,
 * robust individual and multi-column filtering, option additions, and local/live database synchronization.
 */

import { STRINGS } from './strings.js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://uglgodlywfgyzasbniwp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2KYlXCRCQ6Q63ejR9XWZ2A_Nn9xEzSC';

// --- SYSTEM STATE ---
let records = [];
let dropdownOptions = {
  truck_number: [],
  owner: [],
  size: [],
  weight: [],
  warehouse_number: []
};
let isSupabaseOnline = false;
let supabase = null;
let activeDeleteId = null; // Stored ID for confirming deletion
let confirmAction = null; // Stored callback for general delete confirmation modal

// --- DEFAULT SYSTEM VALUES (Seed data for empty states/first load) ---
const DEFAULT_OPTIONS = {
  truck_number: ["TRK-001", "TRK-002", "TRK-003", "TRK-004", "TRK-005"],
  owner: ["John Doe Logistics", "Smith Transport", "Global Freighters", "Apex Movers", "Express Shipping"],
  size: ["10-footer", "20-footer", "40-footer", "Flatbed", "Reefer"],
  weight: ["5.5 Tons", "10 Tons", "15 Tons", "20.5 Tons", "25 Tons"],
  warehouse_number: ["WH-A1", "WH-B2", "WH-C3", "WH-D4", "WH-E5"]
};

const SEED_RECORDS = [
  {
    id: 1,
    record_date: "2026-01-20",
    truck_number: "TRK-001",
    owner: "John Doe Logistics",
    size: "40-footer",
    weight: "25 Tons",
    warehouse_number: "WH-A1"
  },
  {
    id: 2,
    record_date: "2026-02-05",
    truck_number: "TRK-003",
    owner: "Global Freighters",
    size: "20-footer",
    weight: "10 Tons",
    warehouse_number: "WH-C3"
  },
  {
    id: 3,
    record_date: "2026-06-07",
    truck_number: "TRK-002",
    owner: "Apex Movers",
    size: "Flatbed",
    weight: "15 Tons",
    warehouse_number: "WH-B2"
  }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. Set current date default in forms
    const today = new Date().toISOString().split('T')[0];
    const recordDateEl = document.getElementById('record-date');
    if (recordDateEl) recordDateEl.value = today;
    const editRecordDateEl = document.getElementById('edit-record-date');
    if (editRecordDateEl) editRecordDateEl.value = today;

    // 2. Initialize UI Translations
    applyTranslations();

    // 3. Register All Interactive User Event Handlers
    registerEventListeners();
    
    // 4. Refresh page-load vector icon maps
    lucide.createIcons();
  } catch (err) {
    console.error("Error during initial synchronous setup", err);
  }

  // 5. Run Database connection & data population asynchronously without blocking interactivity!
  initAndFetchData();
});

// --- ASYNCHRONOUS INITIAL DATA POPULATION ---
async function initAndFetchData() {
  try {
    await initDatabase();
  } catch (err) {
    console.error("Failed to initialize database", err);
  }

  try {
    await loadDropdownOptions();
  } catch (err) {
    console.error("Failed to load dropdown options", err);
  }

  try {
    await loadRecords();
  } catch (err) {
    console.error("Failed to load records", err);
  }

  // Refresh icons again to handle dynamically inserted records/elements
  lucide.createIcons();
}

// --- TRANSLATION AND STRINGS INJECTION ---
function applyTranslations() {
  // Title & Header info
  document.getElementById('app-title-display').innerText = STRINGS.appTitle;
  document.getElementById('app-subtitle-display').innerText = STRINGS.appSubtitle;
  
  // Form Labels and legends
  document.getElementById('form-card-title').innerText = STRINGS.addRecordForm.title;
  document.getElementById('label-date').innerText = STRINGS.addRecordForm.dateLabel;
  document.getElementById('label-truck').innerText = STRINGS.cols.truckNumber;
  document.getElementById('label-owner').innerText = STRINGS.cols.owner;
  document.getElementById('label-size').innerText = STRINGS.cols.size;
  document.getElementById('label-weight').innerText = STRINGS.cols.weight;
  document.getElementById('label-warehouse').innerText = STRINGS.cols.warehouseNumber;
  
  // Form placeholders/select default hints
  document.getElementById('opt-select-truck').innerText = STRINGS.addRecordForm.selectTruck;
  document.getElementById('opt-select-owner').innerText = STRINGS.addRecordForm.selectOwner;
  document.getElementById('opt-select-size').innerText = STRINGS.addRecordForm.selectSize;
  document.getElementById('opt-select-weight').innerText = STRINGS.addRecordForm.selectWeight;
  document.getElementById('opt-select-warehouse').innerText = STRINGS.addRecordForm.selectWarehouse;
  document.getElementById('btn-text-submit').innerText = STRINGS.addRecordForm.submitBtn;
  document.getElementById('btn-text-cancel').innerText = STRINGS.addRecordForm.cancelBtn;

  // Filters setup
  document.getElementById('filter-card-title').innerText = STRINGS.filters.title;
  document.getElementById('filter-btn-clear').innerText = STRINGS.filters.clearFiltersBtn;
  document.getElementById('label-filter-no').innerText = STRINGS.cols.no;
  document.getElementById('label-filter-date-range').innerText = "Range Filters";
  document.getElementById('label-filter-truck').innerText = STRINGS.cols.truckNumber;
  document.getElementById('label-filter-owner').innerText = STRINGS.cols.owner;
  document.getElementById('label-filter-size').innerText = STRINGS.cols.size;
  document.getElementById('label-filter-weight').innerText = STRINGS.cols.weight;
  document.getElementById('label-filter-warehouse').innerText = STRINGS.cols.warehouseNumber;

  document.getElementById('filter-no').placeholder = STRINGS.filters.noPlaceholder;
  document.getElementById('opt-all-trucks').innerText = STRINGS.filters.allTrucks;
  document.getElementById('opt-all-owners').innerText = STRINGS.filters.allOwners;
  document.getElementById('opt-all-sizes').innerText = STRINGS.filters.allSizes;
  document.getElementById('opt-all-weights').innerText = STRINGS.filters.allWeights;
  document.getElementById('opt-all-warehouses').innerText = STRINGS.filters.allWarehouses;

  // Settings / Option Append layout
  document.getElementById('settings-card-title').innerText = STRINGS.addDropdownOptionsForm.title;
  document.getElementById('settings-card-subtitle').innerText = STRINGS.addDropdownOptionsForm.subtitle;
  document.getElementById('btn-text-add-options').innerText = STRINGS.addDropdownOptionsForm.submitBtn;

  document.getElementById('lbl-add-truck').innerText = STRINGS.addDropdownOptionsForm.truckLabel;
  document.getElementById('lbl-add-owner').innerText = STRINGS.addDropdownOptionsForm.ownerLabel;
  document.getElementById('lbl-add-size').innerText = STRINGS.addDropdownOptionsForm.sizeLabel;
  document.getElementById('lbl-add-weight').innerText = STRINGS.addDropdownOptionsForm.weightLabel;
  document.getElementById('lbl-add-warehouse').innerText = STRINGS.addDropdownOptionsForm.warehouseLabel;

  document.getElementById('add-opt-truck').placeholder = STRINGS.addDropdownOptionsForm.inputTruckPlaceholder;
  document.getElementById('add-opt-owner').placeholder = STRINGS.addDropdownOptionsForm.inputOwnerPlaceholder;
  document.getElementById('add-opt-size').placeholder = STRINGS.addDropdownOptionsForm.inputSizePlaceholder;
  document.getElementById('add-opt-weight').placeholder = STRINGS.addDropdownOptionsForm.inputWeightPlaceholder;
  document.getElementById('add-opt-warehouse').placeholder = STRINGS.addDropdownOptionsForm.inputWarehousePlaceholder;

  // Table Column Headers
  document.getElementById('th-no').innerText = STRINGS.cols.no;
  document.getElementById('th-date').innerText = STRINGS.cols.date;
  document.getElementById('th-truck').innerText = STRINGS.cols.truckNumber;
  document.getElementById('th-owner').innerText = STRINGS.cols.owner;
  document.getElementById('th-size').innerText = STRINGS.cols.size;
  document.getElementById('th-weight').innerText = STRINGS.cols.weight;
  document.getElementById('th-warehouse').innerText = STRINGS.cols.warehouseNumber;
  document.getElementById('th-actions').innerText = STRINGS.cols.actions;

  // Modals
  document.getElementById('sql-guide-title').innerText = STRINGS.supabaseSetupGuide.title;
  document.getElementById('sql-guide-intro').innerText = STRINGS.supabaseSetupGuide.intro;
  document.getElementById('sql-guide-done').innerText = STRINGS.supabaseSetupGuide.doneMsg;
  
  // Load raw sqls into guides
  document.getElementById('sql-records-code').innerText = STRINGS.supabaseSetupGuide.recordsSql;
  document.getElementById('sql-options-code').innerText = STRINGS.supabaseSetupGuide.optionsSql;
  document.getElementById('sql-seed-code').innerText = STRINGS.supabaseSetupGuide.seedSql;

  document.getElementById('edit-modal-title').innerText = STRINGS.addRecordForm.editTitle;
  document.getElementById('edit-modal-cancel').innerText = STRINGS.addRecordForm.cancelBtn;
  document.getElementById('edit-modal-save').innerText = STRINGS.addRecordForm.saveChangeBtn;
}

// --- DATABASE CONNECTION SETUP ---
async function initDatabase() {
  const badgeText = document.getElementById('badge-text');
  const badgePulse = document.getElementById('badge-pulse');
  const badgeDot = document.getElementById('badge-dot');
  const connectionBadge = document.getElementById('connection-badge');

  if (typeof window.supabase === 'undefined') {
    isSupabaseOnline = false;
    connectionBadge.classList.replace('bg-slate-100', 'bg-amber-100');
    connectionBadge.classList.replace('text-slate-600', 'text-amber-800');
    badgeDot.className = "relative inline-flex rounded-full h-2 w-2 bg-amber-500";
    badgePulse.remove();
    badgeText.innerText = "Local Fallback Mode";
    return;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Quick probe check by querying a single record from options to see if table structure is present
    const { error } = await supabase.from('dropdown_options').select('id').limit(1);
    
    if (error) {
      throw error;
    }
    
    // Connected successfully and tables exist
    isSupabaseOnline = true;
    connectionBadge.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all duration-300";
    badgeDot.className = "relative inline-flex rounded-full h-2 w-2 bg-emerald-500";
    badgePulse.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
    badgeText.innerText = "Supabase Synced";
    
    // Register Real-time listeners
    setupRealtimeSubscriptions();
    
  } catch (err) {
    console.warn("Supabase database did not connect or tables have not been created yet.", err);
    isSupabaseOnline = false;
    connectionBadge.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 transition-all duration-300";
    badgeDot.className = "relative inline-flex rounded-full h-2 w-2 bg-amber-500";
    if (badgePulse) badgePulse.className = "hidden";
    badgeText.innerText = "Offline Cache Mode";
    
    showToast(STRINGS.notifications.localModeActive, 'warning');
  }
}

// --- REAL-TIME DATABASE SYNCHRONIZATION ---
function setupRealtimeSubscriptions() {
  if (!supabase || !isSupabaseOnline) return;

  try {
    // Subscribe to public:truck_records
    supabase
      .channel('public:truck_records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_records' }, async (payload) => {
        console.log('Real-time: truck_records table updated.', payload);
        await loadRecords();
      })
      .subscribe();

    // Subscribe to public:dropdown_options
    supabase
      .channel('public:dropdown_options')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dropdown_options' }, async (payload) => {
        console.log('Real-time: dropdown_options table updated.', payload);
        await loadDropdownOptions();
      })
      .subscribe();
  } catch (err) {
    console.error("Failed to setup real-time listeners for Supabase:", err);
  }
}

// --- LOAD DROPDOWN OPTIONS ---
async function loadDropdownOptions() {
  // If not initialized, set defaults in localStorage
  if (!localStorage.getItem('truck_dropdown_options')) {
    localStorage.setItem('truck_dropdown_options', JSON.stringify(DEFAULT_OPTIONS));
  }

  // Load from local storage
  dropdownOptions = JSON.parse(localStorage.getItem('truck_dropdown_options') || "{}");

  // Keep a safety check to ensure all categories exist
  for (const cat of ['truck_number', 'owner', 'size', 'weight', 'warehouse_number']) {
    if (!dropdownOptions[cat]) {
      dropdownOptions[cat] = DEFAULT_OPTIONS[cat] || [];
    }
  }

  // If Supabase is online, query records and establish sole source of truth
  if (isSupabaseOnline) {
    try {
      const { data, error } = await supabase.from('dropdown_options').select('category, value');
      if (!error && data) {
        if (data.length === 0) {
          // If Supabase is connected but has no records, seed default options to database!
          const seedPayload = [];
          for (const [category, values] of Object.entries(DEFAULT_OPTIONS)) {
            values.forEach(val => {
              seedPayload.push({ category, value: val });
            });
          }
          await supabase.from('dropdown_options').insert(seedPayload);
        } else {
          // Supabase has records; recreate local dropdownOptions state entirely from those records
          dropdownOptions = {
            truck_number: [],
            owner: [],
            size: [],
            weight: [],
            warehouse_number: []
          };
          
          data.forEach(item => {
            const cat = item.category;
            const val = item.value;
            if (dropdownOptions[cat] && !dropdownOptions[cat].includes(val)) {
              dropdownOptions[cat].push(val);
            }
          });
          
          // Keep local storage strictly synchronized in case connection is lost next time
          localStorage.setItem('truck_dropdown_options', JSON.stringify(dropdownOptions));
        }
      }
    } catch (err) {
      console.error("Failed to query options from Supabase", err);
    }
  }

  // Sort values alphabetically except some logical items
  for (const key in dropdownOptions) {
    if (key !== 'size' && key !== 'weight') {
      dropdownOptions[key].sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
    }
  }

  populateDropdownSelectors();
  populateDropdownManageLists();
}

// --- POPULATE ALL ELEMENTS IN RELEVANT SELECT DIALOGUES ---
function populateDropdownSelectors() {
  const fields = ['truck', 'owner', 'size', 'weight', 'warehouse'];

  fields.forEach(field => {
    const category = field === 'truck' ? 'truck_number' : field === 'warehouse' ? 'warehouse_number' : field;
    const optionsList = dropdownOptions[category] || [];

    // 1. Selector in Top "Add Record" form
    const addSelect = document.getElementById(`record-${field}`);
    const selectedVal = addSelect.value;
    addSelect.innerHTML = `<option value="" disabled id="opt-select-${field}">${getFormSelectPlaceholder(field)}</option>`;
    
    // 2. Selector in "Filter Records" form
    const filterSelect = document.getElementById(`filter-${field}`);
    const filterVal = filterSelect.value;
    filterSelect.innerHTML = `<option value="">${getFilterSelectPlaceholder(field)}</option>`;

    // 3. Selector in "Edit modal" form
    const editSelect = document.getElementById(`edit-record-${field}`);
    const editVal = editSelect.value;
    editSelect.innerHTML = `<option value="" disabled>${getFormSelectPlaceholder(field)}</option>`;

    // Loop and append options
    optionsList.forEach(option => {
      const optElem1 = document.createElement('option');
      optElem1.value = option;
      optElem1.innerText = option;
      addSelect.appendChild(optElem1);

      const optElem2 = optElem1.cloneNode(true);
      filterSelect.appendChild(optElem2);

      const optElem3 = optElem1.cloneNode(true);
      editSelect.appendChild(optElem3);
    });

    // Reapply old selectors values if they still exist
    if (selectedVal && optionsList.includes(selectedVal)) addSelect.value = selectedVal;
    else addSelect.selectedIndex = 0;

    if (filterVal && optionsList.includes(filterVal)) filterSelect.value = filterVal;
    else filterSelect.selectedIndex = 0;

    if (editVal && optionsList.includes(editVal)) editSelect.value = editVal;
    else editSelect.selectedIndex = 0;
  });
}

// --- POPULATE THE MANAGEABLE OPTIONS LISTS (WITH DELETE OPTIONS) ---
function populateDropdownManageLists() {
  const fields = ['truck', 'owner', 'size', 'weight', 'warehouse'];

  fields.forEach(field => {
    const category = field === 'truck' ? 'truck_number' : field === 'warehouse' ? 'warehouse_number' : field;
    const optionsList = dropdownOptions[category] || [];
    const container = document.getElementById(`opts-container-${field}`);
    if (!container) return;

    if (optionsList.length === 0) {
      container.innerHTML = `<span class="text-[10px] text-slate-400 italic px-1">None</span>`;
      return;
    }

    container.innerHTML = '';
    optionsList.forEach(option => {
      const chip = document.createElement('div');
      chip.className = "inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 text-[11px] text-slate-700 rounded-lg shadow-sm font-medium hover:border-red-200 hover:bg-red-50/40 transition group max-w-full";
      
      const label = document.createElement('span');
      label.className = "truncate max-w-[120px] select-none";
      label.innerText = option;
      chip.appendChild(label);

      const deleteBtn = document.createElement('span');
      deleteBtn.setAttribute('role', 'button');
      deleteBtn.setAttribute('tabindex', '0');
      deleteBtn.className = "text-slate-400 hover:text-red-500 transition leading-none cursor-pointer focus:outline-none p-0.5 rounded";
      deleteBtn.innerHTML = `<i data-lucide="x" class="w-3 h-3"></i>`;
      deleteBtn.title = `Delete "${option}"`;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        triggerDeleteOption(category, option);
      });

      chip.appendChild(deleteBtn);
      container.appendChild(chip);
    });
  });

  lucide.createIcons();
}

function getFormSelectPlaceholder(field) {
  switch (field) {
    case 'truck': return STRINGS.addRecordForm.selectTruck;
    case 'owner': return STRINGS.addRecordForm.selectOwner;
    case 'size': return STRINGS.addRecordForm.selectSize;
    case 'weight': return STRINGS.addRecordForm.selectWeight;
    case 'warehouse': return STRINGS.addRecordForm.selectWarehouse;
    default: return '-- Select Option --';
  }
}

function getFilterSelectPlaceholder(field) {
  switch (field) {
    case 'truck': return STRINGS.filters.allTrucks;
    case 'owner': return STRINGS.filters.allOwners;
    case 'size': return STRINGS.filters.allSizes;
    case 'weight': return STRINGS.filters.allWeights;
    case 'warehouse': return STRINGS.filters.allWarehouses;
    default: return 'All';
  }
}

// --- LOAD LOG RECORDS ---
async function loadRecords() {
  const tableBody = document.getElementById('table-body');
  
  // Set immediate loading visual indicator
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-12">
        <div class="flex flex-col items-center justify-center gap-2">
          <div class="w-8 h-8 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin"></div>
          <span class="text-slate-500 font-medium text-xs">${STRINGS.notifications.loadingText}</span>
        </div>
      </td>
    </tr>
  `;

  let fetchedList = [];

  if (isSupabaseOnline) {
    try {
      const { data, error } = await supabase
        .from('truck_records')
        .select('*')
        .order('record_date', { ascending: false })
        .order('id', { ascending: false });

      if (!error && data) {
        fetchedList = data;
      } else {
        throw error;
      }
    } catch (err) {
      console.error("Supabase records load error. Falling back.", err);
      fetchedList = fetchLocalRecords();
    }
  } else {
    fetchedList = fetchLocalRecords();
  }

  records = fetchedList;
  renderRecordsTable();
}

function fetchLocalRecords() {
  const str = localStorage.getItem('truck_records_items');
  if (str) {
    return JSON.parse(str);
  } else {
    // Seed and save initial records
    localStorage.setItem('truck_records_items', JSON.stringify(SEED_RECORDS));
    return JSON.parse(JSON.stringify(SEED_RECORDS));
  }
}

function saveLocalRecords() {
  localStorage.setItem('truck_records_items', JSON.stringify(records));
}

// --- FORMAT DATE REPRESENTATIONS ---
// Converts "YYYY-MM-DD" to "DD-MMM-YYYY" (e.g. "2026-06-07" to "07-Jun-2026")
function formatDateString(isoString) {
  if (!isoString) return '';
  const dateParts = isoString.split('-');
  if (dateParts.length !== 3) return isoString; // Fallback if format differs

  const year = dateParts[0];
  const monthIdx = parseInt(dateParts[1], 10) - 1;
  const day = dateParts[2];

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthStr = monthNames[monthIdx] || 'Jan';
  return `${day.padStart(2, '0')}-${monthStr}-${year}`;
}

// --- RENDER RECORDS TO TABLE ---
function renderRecordsTable() {
  const tableBody = document.getElementById('table-body');
  const countSpan = document.getElementById('record-count-num');

  // Gather filter inputs
  const filterNo = document.getElementById('filter-no').value.trim();
  const filterStartVal = document.getElementById('filter-start-date').value;
  const filterEndVal = document.getElementById('filter-end-date').value;
  const filterTruck = document.getElementById('filter-truck').value;
  const filterOwner = document.getElementById('filter-owner').value;
  const filterSize = document.getElementById('filter-size').value;
  const filterWeight = document.getElementById('filter-weight').value;
  const filterWarehouse = document.getElementById('filter-warehouse').value;

  // Perform independent multi-column in-memory filtering!
  // Assign simple incremental No (1, 2, 3...) based on their matched positions
  let matchIdx = 1;
  
  const filteredList = records.filter(record => {
    // 1. Filter by sequential No (Index is matchIdx placeholder or original index)
    // We compute what NO the record represents before filtering to make No searching intuitive!
    // Wait, the prompt says "filter records by: No, Start Date and End Date, Truck Number...".
    // If we search No "2", we want the record that usually sits at No 2, or matches record's sequential rendering.
    // If they filter other columns, the sequential Nos change dynamically, which is standard. 
    // To match No searching reliably, we verify if the input query matches the original sorted position in the main list.
    const originalNo = records.indexOf(record) + 1;
    if (filterNo !== '' && !String(originalNo).includes(filterNo)) {
      return false;
    }

    // 2. Filter by Date range (inclusive)
    const rowDate = record.record_date; // "YYYY-MM-DD"
    if (filterStartVal && rowDate < filterStartVal) return false;
    if (filterEndVal && rowDate > filterEndVal) return false;

    // 3. Dropdowns exact match
    if (filterTruck && record.truck_number !== filterTruck) return false;
    if (filterOwner && record.owner !== filterOwner) return false;
    if (filterSize && record.size !== filterSize) return false;
    if (filterWeight && record.weight !== filterWeight) return false;
    if (filterWarehouse && record.warehouse_number !== filterWarehouse) return false;

    return true;
  });

  countSpan.innerText = filteredList.length;

  if (filteredList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10">
          <div class="flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <i data-lucide="inbox" class="w-10 h-10 stroke-1 text-slate-300"></i>
            <span class="text-sm font-semibold">${STRINGS.filters.noRecordsFound}</span>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  tableBody.innerHTML = '';

  filteredList.forEach(record => {
    const rowId = record.id;
    const formattedDate = formatDateString(record.record_date);
    
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/50 transition duration-150 group";
    tr.id = `row-${rowId}`;
    
    // Highlight helper function for matches inside cells
    const highlightCell = (text, query, selectQuery) => {
      if (selectQuery) {
        return text === selectQuery ? `<span class="bg-amber-100/75 text-amber-900 border border-amber-200/50 px-1.5 py-0.5 rounded">${text}</span>` : text;
      }
      return text;
    };

    tr.innerHTML = `
      <td class="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">${matchIdx++}</td>
      <td class="px-6 py-4 font-semibold text-slate-900 text-xs">${formattedDate}</td>
      <td class="px-6 py-4 text-slate-900 font-semibold">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 uppercase">${highlightCell(record.truck_number, '', filterTruck)}</span>
        </div>
      </td>
      <td class="px-6 py-4 text-slate-700 min-w-[150px] overflow-hidden truncate max-w-xs">${highlightCell(record.owner, '', filterOwner)}</td>
      <td class="px-6 py-4 text-slate-600">${highlightCell(record.size, '', filterSize)}</td>
      <td class="px-6 py-4 text-slate-600 font-semibold font-mono text-xs">${highlightCell(record.weight, '', filterWeight)}</td>
      <td class="px-6 py-4 text-slate-600">
        <span class="px-1.5 py-0.5 rounded border border-slate-100 text-xs bg-slate-50/50">${highlightCell(record.warehouse_number, '', filterWarehouse)}</span>
      </td>
      <td class="px-6 py-4 flex items-center justify-center gap-2 print:hidden">
        <button class="edit-btn p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg transition" title="Edit Log" data-id="${rowId}">
          <i data-lucide="edit-2" class="w-4 h-4"></i>
        </button>
        <button class="delete-btn p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition" title="Delete Log" data-id="${rowId}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(tr);
  });

  // Attach button triggers
  const editButtons = tableBody.querySelectorAll('.edit-btn');
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
  });

  const deleteButtons = tableBody.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => triggerDeleteConfirmation(btn.getAttribute('data-id')));
  });

  lucide.createIcons();
}

// --- EVENT LISTENERS REGISTRATION ---
function registerEventListeners() {
  
  // 1. Real-time Multi-Column Filters Listening
  document.getElementById('filter-no').addEventListener('input', renderRecordsTable);
  document.getElementById('filter-start-date').addEventListener('change', renderRecordsTable);
  document.getElementById('filter-end-date').addEventListener('change', renderRecordsTable);
  document.getElementById('filter-truck').addEventListener('change', renderRecordsTable);
  document.getElementById('filter-owner').addEventListener('change', renderRecordsTable);
  document.getElementById('filter-size').addEventListener('change', renderRecordsTable);
  document.getElementById('filter-weight').addEventListener('change', renderRecordsTable);
  document.getElementById('filter-warehouse').addEventListener('change', renderRecordsTable);

  // Clear Filters BUTTON action
  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    document.getElementById('filter-no').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-truck').selectedIndex = 0;
    document.getElementById('filter-owner').selectedIndex = 0;
    document.getElementById('filter-size').selectedIndex = 0;
    document.getElementById('filter-weight').selectedIndex = 0;
    document.getElementById('filter-warehouse').selectedIndex = 0;
    renderRecordsTable();
    showToast("Filters cleared.", "success");
  });

  // 2. Add New Record Form Submission
  const recordForm = document.getElementById('record-form');
  recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddRecordSubmit();
  });

  // 3. Add Dropdown Option Form Submission
  const optionForm = document.getElementById('add-option-form');
  optionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddOptionsSubmit();
  });

  // 4. Supabase SQL Setup Modal Triggers
  const guideTrigger = document.getElementById('guide-modal-trigger');
  const guideModal = document.getElementById('guide-modal');
  const guideClose = document.getElementById('guide-modal-close');
  const guideCloseBtn = document.getElementById('guide-modal-close-btn');

  guideTrigger.addEventListener('click', () => {
    guideModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  const hideGuide = () => {
    guideModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  };
  guideClose.addEventListener('click', hideGuide);
  guideCloseBtn.addEventListener('click', hideGuide);
  document.getElementById('guide-modal-backdrop').addEventListener('click', hideGuide);

  // 5. Delete Confirmation Modals
  const cancelDeleteBtn = document.getElementById('confirm-delete-cancel');
  const confirmDeleteBtn = document.getElementById('confirm-delete-button');
  const confirmModal = document.getElementById('confirm-modal');

  const hideDeleteModal = () => {
    confirmModal.classList.add('hidden');
    activeDeleteId = null;
    confirmAction = null;
    document.body.classList.remove('overflow-hidden');
  };

  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  document.getElementById('confirm-modal-backdrop').addEventListener('click', hideDeleteModal);

  confirmDeleteBtn.addEventListener('click', async () => {
    if (confirmAction) {
      await confirmAction();
    } else if (activeDeleteId) {
      await executeDeleteRecord(activeDeleteId);
    }
    hideDeleteModal();
  });

  // 6. Edit Modal Forms Submission & Closes
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-modal-form');
  const editCancel = document.getElementById('edit-modal-cancel');
  const editCloseHeader = document.getElementById('edit-modal-close');

  const hideEditModal = () => {
    editModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  };

  editCancel.addEventListener('click', hideEditModal);
  editCloseHeader.addEventListener('click', hideEditModal);
  document.getElementById('edit-modal-backdrop').addEventListener('click', hideEditModal);

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await executeUpdateRecord();
    hideEditModal();
  });

  // 7. Print PDF Report trigger
  const printPdfBtn = document.getElementById('print-pdf-btn');
  if (printPdfBtn) {
    printPdfBtn.addEventListener('click', () => {
      try {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedDateStr = now.toLocaleDateString(undefined, options);
        
        const printDateEl = document.getElementById('print-date');
        if (printDateEl) {
          printDateEl.innerText = `Report Date: ${formattedDateStr}`;
        }
        
        const countNum = document.getElementById('record-count-num')?.innerText || '0';
        const printCountEl = document.getElementById('print-count');
        if (printCountEl) {
          printCountEl.innerText = `Records Printed: ${countNum}`;
        }
        
        window.print();
      } catch (err) {
        console.error("Print error", err);
        showToast("Could not invoke print dialog: " + err.message, "error");
      }
    });
  }
}

// --- CONTROLLERS: ADD RECORD ---
async function handleAddRecordSubmit() {
  const dateVal = document.getElementById('record-date').value;
  const truckVal = document.getElementById('record-truck').value;
  const ownerVal = document.getElementById('record-owner').value;
  const sizeVal = document.getElementById('record-size').value;
  const weightVal = document.getElementById('record-weight').value;
  const warehouseVal = document.getElementById('record-warehouse').value;

  // Basic validation
  if (!dateVal || !truckVal || !ownerVal || !sizeVal || !weightVal || !warehouseVal) {
    showToast(STRINGS.notifications.fillRequiredFields, 'error');
    return;
  }

  const newRecord = {
    record_date: dateVal,
    truck_number: truckVal,
    owner: ownerVal,
    size: sizeVal,
    weight: weightVal,
    warehouse_number: warehouseVal
  };

  const submitBtn = document.getElementById('submit-record-btn');
  const oldHtml = submitBtn.innerHTML;
  
  // Set submission loader visual state
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<div class="w-3 w-3 sm:w-4 sm:h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div><span>Saving...</span>`;

  try {
    if (isSupabaseOnline) {
      const { error } = await supabase.from('truck_records').insert([newRecord]);
      if (error) {
        throw error;
      }
    } else {
      // Local addition
      const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
      records.unshift({ id: nextId, ...newRecord });
      saveLocalRecords();
    }

    showToast(STRINGS.notifications.addRecordSuccess, 'success');
    
    // Reset inputs
    document.getElementById('record-form').reset();
    document.getElementById('record-date').value = new Date().toISOString().split('T')[0];
    
    // Reload
    await loadRecords();
    
  } catch (err) {
    console.error("Failed to add record", err);
    showToast(STRINGS.notifications.supabaseError.replace('{error}', err.message || err), 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = oldHtml;
  }
}

// --- CONTROLLERS: EDIT RECORD ---
function openEditModal(recordId) {
  // Find record in active array
  const record = records.find(r => String(r.id) === String(recordId));
  if (!record) return;

  // Populate IDs and parameters
  document.getElementById('edit-record-id-field').value = recordId;
  document.getElementById('edit-record-date').value = record.record_date;
  
  // Wait, selectors in modal need to have valid options before we set them!
  // So we refresh selectors first
  populateDropdownSelectors();

  // Set selected options
  document.getElementById('edit-record-truck').value = record.truck_number;
  document.getElementById('edit-record-owner').value = record.owner;
  document.getElementById('edit-record-size').value = record.size;
  document.getElementById('edit-record-weight').value = record.weight;
  document.getElementById('edit-record-warehouse').value = record.warehouse_number;

  // Open modal
  const editModal = document.getElementById('edit-modal');
  editModal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  lucide.createIcons();
}

async function executeUpdateRecord() {
  const recordId = document.getElementById('edit-record-id-field').value;
  const dateVal = document.getElementById('edit-record-date').value;
  const truckVal = document.getElementById('edit-record-truck').value;
  const ownerVal = document.getElementById('edit-record-owner').value;
  const sizeVal = document.getElementById('edit-record-size').value;
  const weightVal = document.getElementById('edit-record-weight').value;
  const warehouseVal = document.getElementById('edit-record-warehouse').value;

  if (!dateVal || !truckVal || !ownerVal || !sizeVal || !weightVal || !warehouseVal) {
    showToast(STRINGS.notifications.fillRequiredFields, 'error');
    return;
  }

  const updatedRecord = {
    record_date: dateVal,
    truck_number: truckVal,
    owner: ownerVal,
    size: sizeVal,
    weight: weightVal,
    warehouse_number: warehouseVal
  };

  try {
    if (isSupabaseOnline) {
      const { error } = await supabase
        .from('truck_records')
        .update(updatedRecord)
        .eq('id', recordId);
      if (error) {
        throw error;
      }
    } else {
      // Local update
      const idx = records.findIndex(r => String(r.id) === String(recordId));
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...updatedRecord };
        saveLocalRecords();
      }
    }

    showToast(STRINGS.notifications.updateRecordSuccess, 'success');
    await loadRecords();
  } catch (err) {
    console.error("Failed to update record", err);
    showToast(STRINGS.notifications.supabaseError.replace('{error}', err.message || err), 'error');
  }
}

// --- UTILITY: SHOW CONFIRMATION DIALOG ---
function showConfirmModal(title, text, dangerText, actionFn) {
  const confirmModal = document.getElementById('confirm-modal');
  const titleElem = confirmModal.querySelector('h3');
  const descElem = document.getElementById('delete-confirm-text');
  const confirmBtn = document.getElementById('confirm-delete-button');

  titleElem.innerText = title;
  descElem.innerText = text;
  confirmBtn.innerText = dangerText;
  confirmAction = actionFn;

  confirmModal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  lucide.createIcons();
}

// --- CONTROLLERS: DELETE RECORD ---
function triggerDeleteConfirmation(recordId) {
  showConfirmModal(
    "Delete Record",
    "Are you sure you want to delete this truck record? This action cannot be reversed.",
    "Delete Record",
    async () => {
      await executeDeleteRecord(recordId);
    }
  );
}

async function executeDeleteRecord(id) {
  try {
    if (isSupabaseOnline) {
      const { error } = await supabase
        .from('truck_records')
        .delete()
        .eq('id', id);
      if (error) {
        throw error;
      }
    } else {
      // Local delete
      records = records.filter(r => String(r.id) !== String(id));
      saveLocalRecords();
    }

    showToast(STRINGS.notifications.deleteRecordSuccess, 'success');
    await loadRecords();
  } catch (err) {
    console.error("Failed to delete record", err);
    showToast(STRINGS.notifications.supabaseError.replace('{error}', err.message || err), 'error');
  }
}

// --- CONTROLLERS: DELETE DROPDOWN OPTION ---
function triggerDeleteOption(category, value) {
  const displayCategory = category.replace('_', ' ');
  showConfirmModal(
    "Delete Dropdown Option",
    `Are you sure you want to delete "${value}" from the ${displayCategory} options list?`,
    "Delete Option",
    async () => {
      await executeDeleteOption(category, value);
    }
  );
}

async function executeDeleteOption(category, value) {
  try {
    if (isSupabaseOnline) {
      const { error } = await supabase
        .from('dropdown_options')
        .delete()
        .eq('category', category)
        .eq('value', value);
      if (error) {
        throw error;
      }
    }

    // Always delete locally from LocalStorage
    const localSaved = JSON.parse(localStorage.getItem('truck_dropdown_options') || "{}");
    if (localSaved[category]) {
      localSaved[category] = localSaved[category].filter(val => val !== value);
      localStorage.setItem('truck_dropdown_options', JSON.stringify(localSaved));
    }

    showToast(`Option "${value}" deleted successfully!`, 'success');
    await loadDropdownOptions();
  } catch (err) {
    console.error("Failed to delete dropdown option", err);
    showToast(`Failed to delete option: ${err.message || err}`, 'error');
  }
}

// --- CONTROLLERS: ADD DROPDOWN OPTIONS ---
async function handleAddOptionsSubmit() {
  const mapInputs = [
    { id: 'add-opt-truck', dbCat: 'truck_number', labelName: 'Truck Number' },
    { id: 'add-opt-owner', dbCat: 'owner', labelName: 'Owner' },
    { id: 'add-opt-size', dbCat: 'size', labelName: 'Size' },
    { id: 'add-opt-weight', dbCat: 'weight', labelName: 'Weight' },
    { id: 'add-opt-warehouse', dbCat: 'warehouse_number', labelName: 'Warehouse Number' }
  ];

  let anyAdded = false;

  for (const field of mapInputs) {
    const inputElement = document.getElementById(field.id);
    const value = inputElement.value.trim();

    if (value) {
      const activeArray = dropdownOptions[field.dbCat] || [];
      
      // Prevent duplicates
      if (activeArray.includes(value)) {
        showToast(`"${value}" is already in ${field.labelName} options list.`, 'warning');
        continue;
      }

      try {
        if (isSupabaseOnline) {
          // Push to Supabase db dropdown option table
          const { error } = await supabase
            .from('dropdown_options')
            .insert([{ category: field.dbCat, value }]);
          if (error) {
            throw error;
          }
        }
        
        // Push locally regardless (or as fallback)
        const localSaved = JSON.parse(localStorage.getItem('truck_dropdown_options') || "{}");
        if (!localSaved[field.dbCat]) localSaved[field.dbCat] = [];
        localSaved[field.dbCat].push(value);
        localStorage.setItem('truck_dropdown_options', JSON.stringify(localSaved));

        anyAdded = true;
        showToast(STRINGS.notifications.addOptionSuccess.replace('{val}', value).replace('{category}', field.labelName), 'success');
        
        // Clear input field text
        inputElement.value = '';

      } catch (err) {
        console.error("Error creating dropdown option", err);
        showToast(`Supabase insert failed for ${value}: ${err.message}`, 'error');
      }
    }
  }

  if (anyAdded) {
    await loadDropdownOptions();
  } else {
    // If empty inputs
    const valuesEntered = mapInputs.map(f => document.getElementById(f.id).value.trim()).filter(Boolean);
    if (valuesEntered.length === 0) {
      showToast("Please write a value in any of the parameter inputs to add it.", 'warning');
    }
  }
}

// --- UTILITY: TOAST POPUP SYSTEM ---
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  
  // Dynamic design presets based on alert severity
  let bgClass = 'bg-slate-900 text-white';
  let iconName = 'check-circle';
  let barGradient = 'from-emerald-400 to-teal-500';

  if (type === 'error') {
    bgClass = 'bg-red-950 text-red-100 border border-red-800/50';
    iconName = 'alert-triangle';
    barGradient = 'from-red-500 to-rose-600';
  } else if (type === 'warning') {
    bgClass = 'bg-amber-950 text-amber-100 border border-amber-800/50';
    iconName = 'help-circle';
    barGradient = 'from-amber-400 to-orange-500';
  } else if (type === 'info') {
    bgClass = 'bg-indigo-950 text-indigo-100 border border-indigo-800/50';
    iconName = 'info';
    barGradient = 'from-indigo-400 to-blue-500';
  }

  // Set structure with transition slide indices
  toast.className = `p-4 rounded-xl shadow-xl flex gap-3 relative overflow-hidden transition-all duration-300 transform translate-x-12 opacity-0 select-none ${bgClass} glass-panel`;
  toast.innerHTML = `
    <!-- Top progression timer line -->
    <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${barGradient} transition-all duration-[3000ms] w-full" id="toast-progress"></div>
    
    <div class="shrink-0">
      <i data-lucide="${iconName}" class="w-5 h-5 ${type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-amber-400'}"></i>
    </div>
    
    <div class="space-y-0.5 flex-1 pr-4">
      <p class="text-xs font-semibold leading-relaxed">${message}</p>
    </div>

    <button class="text-slate-400 hover:text-white leading-none hover:bg-slate-800/50 p-1 rounded transition absolute top-2 right-2 cursor-pointer" onclick="this.parentElement.remove()">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  toastContainer.appendChild(toast);
  lucide.createIcons();

  // Slide-in Animation trigger
  setTimeout(() => {
    toast.classList.replace('translate-x-12', 'translate-x-0');
    toast.classList.replace('opacity-0', 'opacity-100');
  }, 10);

  // Set line transition shrinkage
  setTimeout(() => {
    const progress = toast.querySelector('#toast-progress');
    if (progress) progress.style.width = '0%';
  }, 50);

  // Auto clean-up after timer
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
