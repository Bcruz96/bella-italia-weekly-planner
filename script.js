const SUPABASE_URL = "https://snimrlbzcigltlcifneb.supabase.co";
const SUPABASE_KEY = "sb_publishable_9_pd1IQnNYYRzDFT-TLJ_A_xWVzSxHr";

// Bound network waits so a stalled request cannot lock task controls indefinitely.
async function fetchWithTimeout(input, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 15000);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
const database = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: fetchWithTimeout }
});

const RESTAURANT_ID = "bi-wellington-street";
const daysContainer = document.getElementById("daysContainer");
const previousDayButton = document.getElementById("previousDay");
const nextDayButton = document.getElementById("nextDay");

const previousLabel = document.getElementById("previousLabel");
const nextLabel = document.getElementById("nextLabel");
const todayButton = document.getElementById("todayButton");
const monthTitle = document.getElementById("monthTitle");

const dayCard = document.getElementById("dayCard");
const selectedDayName = document.getElementById("selectedDayName");
const selectedDayNumber = document.getElementById("selectedDayNumber");
const selectedMonth = document.getElementById("selectedMonth");

const checklistTitle = document.getElementById("checklistTitle");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const taskGroups = document.getElementById("taskGroups");

const openTaskModal = document.getElementById("openTaskModal");
const closeTaskModal = document.getElementById("closeTaskModal");
const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");

const taskTitle = document.getElementById("taskTitle");
const taskDay = document.getElementById("taskDay");
const taskCategory = document.getElementById("taskCategory");

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const shortDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function getTodayDayIndex() {
  const today = new Date().getDay();

  if (today === 0) {
    return 6; // Sunday
  }

  return today - 1; // Monday = 0, Tuesday = 1, etc.
}

let selectedDayIndex = getTodayDayIndex();

const fixedTasks = [
  {
    id: "mon-payroll-1",
    title: "Complete 8:30–9am. Payroll must be submitted by 9am.",
    day: "Monday",
    category: "Payroll Checks"
  },
  {
    id: "mon-payroll-2",
    title: "Check holidays/sickness has been added prior to submitting.",
    day: "Monday",
    category: "Payroll Checks"
  },
  {
    id: "mon-payroll-3",
    title: "Complete Gui's weekly spreadsheet before 9am.",
    day: "Monday",
    category: "Payroll Checks"
  },

  {
    id: "mon-orders-1",
    title: "Matthew Clark for Tuesday before 11am.",
    day: "Monday",
    category: "Orders"
  },
  {
    id: "mon-orders-2",
    title: "Oil — ask Chandra if we need. Send email to order. Usually order every 2 weeks, not weekly.",
    day: "Monday",
    category: "Orders"
  },
  {
    id: "mon-orders-3",
    title: "Check BOC gas. If less than 2, order on website. Only order if you have 1 or 2 left. Usually order monthly.",
    day: "Monday",
    category: "Orders"
  },
  {
    id: "mon-orders-4",
    title: "Any POS or stationery needed? Order through smartpad. Usually only paper, staples and pens from here.",
    day: "Monday",
    category: "Orders"
  },
  {
    id: "mon-orders-5",
    title: "Bunzl order for Thursday delivery. No minimum spend now, so only order what we need. Chandra sends a list, check it.",
    day: "Monday",
    category: "Orders"
  },
  {
    id: "mon-orders-6",
    title: "Any takeaway packaging needed? Order through inventory. Biopack Bella and Supernonna form. Must spend £100 minimum or order will be rejected.",
    day: "Monday",
    category: "Orders"
  },
  {
    id: "mon-orders-7",
    title: "Zenith order.",
    day: "Monday",
    category: "Orders"
  },
  {
    id: "mon-orders-8",
    title: "Any red or blue bags needed? Email Sita.",
    day: "Monday",
    category: "Orders"
  },

  {
    id: "mon-paperwork-1",
    title: "Print new paperwork for office and start a new folder for this week.",
    day: "Monday",
    category: "Weekly and daily paperwork"
  },
  {
    id: "mon-paperwork-2",
    title: "Last week’s paperwork in folder.",
    day: "Monday",
    category: "Weekly and daily paperwork"
  },
  {
    id: "mon-paperwork-3",
    title: "Complete a list of this week’s group sales bookings for office and kitchen.",
    day: "Monday",
    category: "Weekly and daily paperwork"
  },
  {
    id: "mon-paperwork-4",
    title: "Check Equals is all updated and upload any receipts, if possible. Receipts must be uploaded with VAT entered, and print a receipt for this week's folder as well.",
    day: "Monday",
    category: "Weekly and daily paperwork"
  },
  {
    id: "mon-paperwork-5",
    title: "Open Ecolab portal and check pest recommendations.",
    day: "Monday",
    category: "Weekly and daily paperwork"
  },

  {
    id: "mon-restaurant-1",
    title: "Check HGEM and update team on social scores for last week.",
    day: "Monday",
    category: "Restaurant bits"
  },
  {
    id: "mon-restaurant-2",
    title: "Organise drinks room ready for Tuesday MC.",
    day: "Monday",
    category: "Restaurant bits"
  },
  {
    id: "mon-restaurant-3",
    title: "Set up restaurant.",
    day: "Monday",
    category: "Restaurant bits"
  },
  {
    id: "mon-restaurant-4",
    title: "Clean ice machine.",
    day: "Monday",
    category: "Restaurant bits"
  },
  {
    id: "mon-restaurant-5",
    title: "Bella ‘Weekly bites’ email — read it. Any updates or marketing news?",
    day: "Monday",
    category: "Restaurant bits"
  },

  {
    id: "mon-logit-1",
    title: "Complete safe check.",
    day: "Monday",
    category: "Logit tasks"
  },
  {
    id: "mon-logit-2",
    title: "Complete all Monday extra Logit tasks.",
    day: "Monday",
    category: "Logit tasks"
  },
  {
    id: "mon-logit-3",
    title: "Legionella water check.",
    day: "Monday",
    category: "Logit tasks"
  },
  {
    id: "mon-logit-4",
    title: "Probe calibration check.",
    day: "Monday",
    category: "Logit tasks"
  },
  {
    id: "mon-logit-5",
    title: "WorkSafe weekly risk assessment checks. Sometimes shows on Tuesdays and not on Mondays Logit.",
    day: "Monday",
    category: "Logit tasks"
  },

  {
    id: "mon-computer-1",
    title: "Check emails, reply to any bookings, delete any emails not needed, and pin emails if not actioned or awaiting action.",
    day: "Monday",
    category: "Computer checks"
  },
  {
    id: "mon-computer-2",
    title: "Check maintenance and chase any open jobs.",
    day: "Monday",
    category: "Computer checks"
  },
  {
    id: "mon-computer-3",
    title: "Check FLOW is at 100%.",
    day: "Monday",
    category: "Computer checks"
  },

  {
    id: "mon-gui-1",
    title: "Complete following week forecast and rota.",
    day: "Monday",
    category: "Bits for Gui"
  },
  {
    id: "mon-gui-2",
    title: "Line checks.",
    day: "Monday",
    category: "Bits for Gui"
  },
  {
    id: "mon-gui-3",
    title: "Remember to post dish of the week by Tuesday. Dish found in the ‘Weekly bites’ email sent on Mondays. Remember to post some engagement on Fourth on Saturday.",
    day: "Monday",
    category: "Bits for Gui"
  },

{
  id: "tue-weekly-1",
  title: "Matthew Clark delivery",
  day: "Tuesday",
  category: "Weekly Tasks"
},
{
  id: "tue-weekly-2",
  title: "Brakes delivery",
  day: "Tuesday",
  category: "Weekly Tasks"
},
{
  id: "tue-weekly-3",
  title: "Approve all delivery",
  day: "Tuesday",
  category: "Weekly Tasks"
},
{
  id: "tue-weekly-4",
  title: "DOTW was posted",
  day: "Tuesday",
  category: "Weekly Tasks"
},
{
  id: "tue-weekly-5",
  title: "G4S collection",
  day: "Tuesday",
  category: "Weekly Tasks"
},
{
  id: "wed-weekly-1",
  title: "Brakes order for Friday before 11am",
  day: "Wednesday",
  category: "Weekly Tasks"
},

{
  id: "thu-weekly-1",
  title: "Matthew Clark order for Friday before 11am",
  day: "Thursday",
  category: "Weekly Tasks"
},
{
  id: "thu-weekly-2",
  title: "Bunzl delivery",
  day: "Thursday",
  category: "Weekly Tasks"
},
{
  id: "thu-weekly-3",
  title: "Approve all delivery",
  day: "Thursday",
  category: "Weekly Tasks"
},
{
  id: "fri-weekly-1",
  title: "Matthew Clark delivery",
  day: "Friday",
  category: "Weekly Tasks"
},
{
  id: "fri-weekly-2",
  title: "Brakes delivery",
  day: "Friday",
  category: "Weekly Tasks"
},
{
  id: "fri-weekly-3",
  title: "Approve all delivery",
  day: "Friday",
  category: "Weekly Tasks"
},

{
  id: "sat-weekly-1",
  title: "Brakes order for Tuesday before 11am",
  day: "Saturday",
  category: "Weekly Tasks"
},
{
  id: "sat-weekly-2",
  title: "Picture Super Saturday Fourth",
  day: "Saturday",
  category: "Weekly Tasks"
}
];

const stockCountingTask = {
  id: "sunday-month-end-stock-counting",
  title: "Stock Counting",
  day: "Sunday",
  category: "Monthly Tasks"
};

function isLastSundayOfMonth(date) {
  if (date.getDay() !== 0) {
    return false;
  }

  const nextWeek = new Date(date);
  nextWeek.setDate(date.getDate() + 7);

  return nextWeek.getMonth() !== date.getMonth();
}

let fixedTaskCompletion = {};
let manualTasks = [];

let dataBusy = false;
let dataLoaded = false;
let submittingTask = false;
const syncStatus = document.getElementById("syncStatus");
const syncText = document.getElementById("syncText");
const appMessage = document.getElementById("appMessage");
const saveTaskButton = taskForm.querySelector('[type="submit"]');
function setSyncStatus(state, message) {
  syncStatus.dataset.state = state;
  syncText.textContent = message;
}
function showError(message) {
  appMessage.textContent = message;
  appMessage.hidden = false;
  setSyncStatus("error", navigator.onLine === false ? "Offline" : "Sync error");
}
function renderBusyState() {
  taskGroups.querySelectorAll("button").forEach(button => { button.disabled = dataBusy || !dataLoaded; });
  saveTaskButton.disabled = dataBusy || !dataLoaded;
  saveTaskButton.textContent = submittingTask ? "Saving..." : "Save Task";
}
async function loadDataFromSupabase() {
  const results = await Promise.all([
    database.from("fixed_task_completion").select("*").eq("restaurant_id", RESTAURANT_ID),
    database.from("manual_tasks").select("*").eq("restaurant_id", RESTAURANT_ID)
  ]);
  for (const result of results) if (result.error) throw result.error;
  const nextCompletion = {};
  results[0].data.forEach(item => { nextCompletion[item.date_key + "|" + item.task_id] = item.completed; });
  fixedTaskCompletion = nextCompletion;
  manualTasks = results[1].data.map(task => ({
    id: task.id, title: task.title, day: task.day, dateKey: task.date_key,
    category: task.category, completed: task.completed
  }));
  dataLoaded = true;
}
async function runDataOperation(operation, saving = false) {
  if (dataBusy) return false;
  dataBusy = true;
  setSyncStatus("busy", saving ? "Saving..." : "Syncing...");
  renderBusyState();
  try {
    await operation();
    appMessage.hidden = true;
    setSyncStatus("synced", "Synced");
    return true;
  } catch (error) {
    console.error("Data operation failed:", error);
    const reason = error?.message ? " Details: " + error.message : "";
    showError(saving ? "Could not save the change. Please try again." + reason
      : dataLoaded
        ? "Could not refresh tasks. Check your connection. Sync will retry automatically."
        : "Cannot connect to the task database. Task changes are unavailable until the connection is restored. Please check your connection and try again.");
    return false;
  } finally {
    dataBusy = false;
    renderApp();
  }
}

async function saveFixedCompletion(taskId, completed, selectedDateKey) {

  const { error } = await database
    .from("fixed_task_completion")
    .upsert(
      {
        restaurant_id: RESTAURANT_ID,
        task_id: taskId,
        date_key: selectedDateKey,
        completed: completed
      },
      {
        onConflict: "restaurant_id,task_id,date_key"
      }
    );

  if (error) {
    throw error;
  }
}

async function addManualTaskOnline(newTask) {
  const { data, error } = await database
    .from("manual_tasks")
    .insert({
      restaurant_id: RESTAURANT_ID,
      title: newTask.title,
      day: newTask.day,
      date_key: newTask.dateKey,
      category: newTask.category,
      completed: newTask.completed
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    day: data.day,
    dateKey: data.date_key,
    category: data.category,
    completed: data.completed
  };
}

async function updateManualTaskOnline(taskId, completed) {
  const { error } = await database
    .from("manual_tasks")
    .update({ completed: completed })
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("id", taskId).select("id").single();

  if (error) {
    throw error;
  }
}

async function deleteManualTaskOnline(taskId) {
  const { error } = await database
    .from("manual_tasks")
    .delete()
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("id", taskId).select("id").single();

  if (error) {
    throw error;
  }
}

function getMondayOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + difference);

  return monday;
}

let weekStart = getMondayOfCurrentWeek();

function getDateForDay(index) {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + index);
  return date;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSelectedDateKey() {
  const selectedDate = getDateForDay(selectedDayIndex);
  return getDateKey(selectedDate);
}

function renderDays() {
  daysContainer.innerHTML = "";

  dayNames.forEach((day, index) => {
    const date = getDateForDay(index);

    const dayElement = document.createElement("button");
    dayElement.type = "button";
    dayElement.setAttribute("aria-pressed", String(index === selectedDayIndex));
    dayElement.classList.add("day-item");

    if (index === selectedDayIndex) {
      dayElement.classList.add("active");
    }

    const today = new Date();

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday && index !== selectedDayIndex) {
      dayElement.classList.add("today");
    }

    dayElement.innerHTML = `
      <strong>${shortDays[index]}</strong>
      <h3>${date.getDate()}</h3>
      <span>${monthNames[date.getMonth()].slice(0, 3)}</span>
    `;

    dayElement.addEventListener("click", function () {
      selectedDayIndex = index;
      renderApp();
    });

    daysContainer.appendChild(dayElement);
  });
}

function updateDateInformation() {
  const currentDate = getDateForDay(selectedDayIndex);
  const currentDay = dayNames[selectedDayIndex];
  const month = monthNames[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  monthTitle.textContent = `${month} ${year}`;
  selectedDayName.textContent = currentDay.toUpperCase();
  selectedDayNumber.textContent = currentDate.getDate();
  selectedMonth.textContent = `${month} ${year}`;
  checklistTitle.textContent = `${currentDay} Checklist`;

 previousLabel.textContent = "← Previous week";
nextLabel.textContent = "Next week →";

dayCard.classList.add("active-dark");

  if (!taskModal.classList.contains("show")) taskDay.value = currentDay;
}

function getTasksForSelectedDay() {
  const selectedDay = dayNames[selectedDayIndex];
  const selectedDate = getDateForDay(selectedDayIndex);
  const selectedDateKey = getSelectedDateKey();

  const applicableFixedTasks = fixedTasks.filter((task) => task.day === selectedDay);

  if (isLastSundayOfMonth(selectedDate)) {
    applicableFixedTasks.push(stockCountingTask);
  }

  const fixedForDay = applicableFixedTasks.map((task) => {
    const completionKey = `${selectedDateKey}|${task.id}`;

    return {
      ...task,
      isFixed: true,
      completed: fixedTaskCompletion[completionKey] || false
    };
  });

  const manualForDay = manualTasks
    .filter((task) => task.dateKey === selectedDateKey)
    .map((task) => {
      return {
        ...task,
        isFixed: false
      };
    });

  return [...manualForDay, ...fixedForDay];
}

function updateProgress(dayTasks) {
  const completedTasks = dayTasks.filter((task) => task.completed).length;
  const totalTasks = dayTasks.length;

  progressText.textContent = `${completedTasks}/${totalTasks} tasks completed`;

  const percentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
  progressFill.style.width = `${percentage}%`;
}

function groupTasksByCategory(dayTasks) {
  const groups = Object.create(null);

  dayTasks.forEach((task) => {
    if (!groups[task.category]) {
      groups[task.category] = [];
    }

    groups[task.category].push(task);
  });

  return groups;
}

function renderTaskGroups() {
  const dayTasks = getTasksForSelectedDay();
  taskGroups.innerHTML = "";

  updateProgress(dayTasks);

  if (dayTasks.length === 0) {
    taskGroups.innerHTML = `
      <div class="empty-message">
        No tasks for this day yet.
      </div>
    `;
    return;
  }

  const groupedTasks = groupTasksByCategory(dayTasks);

  Object.keys(groupedTasks).forEach((category) => {
    const group = groupedTasks[category];
    const completed = group.filter((task) => task.completed).length;
    const total = group.length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;

    const groupElement = document.createElement("div");
    groupElement.classList.add("task-group");

    const groupIsComplete = total > 0 && completed === total;

    const headerClass = groupIsComplete
    ? "task-group-header completed"
    : "task-group-header danger";

    groupElement.innerHTML = `
    <div class="${headerClass}">
        <h3></h3>

        <div class="group-progress">
          <div class="group-progress-bar">
            <div class="group-progress-fill" style="width: ${percentage}%"></div>
          </div>

          <strong>${completed}/${total}</strong>
        </div>
      </div>
    `;

    groupElement.querySelector("h3").textContent = category;
    group.forEach((task) => {
      const taskElement = document.createElement("div");
      taskElement.classList.add("task-item");

      if (task.completed) {
        taskElement.classList.add("completed");
      }

      const check = document.createElement("button");
      check.type = "button";
      check.className = "task-check";
      check.setAttribute("aria-label", "Complete task: " + task.title);
      check.setAttribute("aria-pressed", String(Boolean(task.completed)));
      check.addEventListener("click", () => toggleTask(task.id, task.isFixed));
      const info = document.createElement("div");
      info.className = "task-info";
      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;
      info.appendChild(title);
      taskElement.append(check, info);
      if (!task.isFixed) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete-task";
        remove.textContent = "\u00d7";
        remove.setAttribute("aria-label", "Delete task: " + task.title);
        remove.addEventListener("click", () => deleteTask(task.id));
        taskElement.appendChild(remove);
      }
      groupElement.appendChild(taskElement);
    });

    taskGroups.appendChild(groupElement);
  });
}

async function toggleTask(taskId, isFixed) {
  if (dataBusy || !dataLoaded) return;
  const dateKey = getSelectedDateKey();
  const key = dateKey + "|" + taskId;
  const task = manualTasks.find(item => String(item.id) === String(taskId));
  if (!isFixed && !task) return;
  const completed = isFixed ? !fixedTaskCompletion[key] : !task.completed;
  await runDataOperation(async () => {
    if (isFixed) {
      await saveFixedCompletion(taskId, completed, dateKey);
      fixedTaskCompletion[key] = completed;
    } else {
      await updateManualTaskOnline(taskId, completed);
      task.completed = completed;
    }
  }, true);
}
async function deleteTask(taskId) {
  if (dataBusy || !dataLoaded || !confirm("Delete this manual task?")) return;
  await runDataOperation(async () => {
    await deleteManualTaskOnline(taskId);
    manualTasks = manualTasks.filter(task => String(task.id) !== String(taskId));
  }, true);
}

function openModal() {
  taskModal.classList.add("show");
  taskDay.value = dayNames[selectedDayIndex];
  taskTitle.focus();
}

function closeModal() {
  if (submittingTask) return;
  taskModal.classList.remove("show");
  taskForm.reset();
  taskTitle.setCustomValidity("");
  openTaskModal.focus();
}

taskForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (dataBusy || !dataLoaded || submittingTask) return;
  const title = taskTitle.value.trim();
  taskTitle.setCustomValidity(title ? "" : "Enter a task name.");
  if (!taskForm.reportValidity()) return;
  const index = dayNames.indexOf(taskDay.value);
  if (index < 0) return;
  const newTask = { title, day: taskDay.value, dateKey: getDateKey(getDateForDay(index)),
    category: taskCategory.value, completed: false };
  submittingTask = true;
  const saved = await runDataOperation(async () => {
    const savedTask = await addManualTaskOnline(newTask);
    manualTasks.push(savedTask);
  }, true);
  submittingTask = false;
  renderBusyState();
  if (saved) closeModal();
});

taskTitle.addEventListener("input", () => taskTitle.setCustomValidity(""));
taskModal.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
  if (event.key === "Tab") {
    const controls = [...taskModal.querySelectorAll("input, select, button")].filter(el => !el.disabled);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
openTaskModal.addEventListener("click", openModal);
closeTaskModal.addEventListener("click", closeModal);

taskModal.addEventListener("click", function (event) {
  if (event.target === taskModal) {
    closeModal();
  }
});

previousDayButton.addEventListener("click", function () {
  if (selectedDayIndex === 0) weekStart.setDate(weekStart.getDate() - 7);
  selectedDayIndex = selectedDayIndex === 0 ? 6 : selectedDayIndex - 1;
  renderApp();
});

nextDayButton.addEventListener("click", function () {
  if (selectedDayIndex === 6) weekStart.setDate(weekStart.getDate() + 7);
  selectedDayIndex = selectedDayIndex === 6 ? 0 : selectedDayIndex + 1;
  renderApp();
});

previousLabel.addEventListener("click", function () {
  weekStart.setDate(weekStart.getDate() - 7);
  renderApp();
});

nextLabel.addEventListener("click", function () {
  weekStart.setDate(weekStart.getDate() + 7);
  renderApp();
});

function renderApp() {
  renderDays();
  updateDateInformation();
  renderTaskGroups();
  renderBusyState();
}
function getMondayOfWeek(date) {
  const selectedDate = new Date(date);
  const day = selectedDate.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  selectedDate.setDate(selectedDate.getDate() + difference);
  selectedDate.setHours(0, 0, 0, 0);

  return selectedDate;
}

function getMondayFromDate(date) {
  const d = new Date(date);
  const day = d.getDay();

  // Sunday = 0, Monday = 1
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function goToToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const realMonday = new Date(today);
  const dayOfWeek = realMonday.getDay();

  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  realMonday.setDate(realMonday.getDate() + diffToMonday);
  realMonday.setHours(0, 0, 0, 0);

  weekStart.setTime(realMonday.getTime());

  selectedDayIndex = Math.round(
    (today.getTime() - realMonday.getTime()) / (1000 * 60 * 60 * 24)
  );

  renderApp();
}

todayButton.addEventListener("click", goToToday);

// Reads and writes share a lock so polling cannot replace an in-flight change.
async function refreshLiveData() {
  if (dataBusy) return;
  await runDataOperation(loadDataFromSupabase);
}
window.addEventListener("offline", () => showError("You are offline. Reconnect before saving changes."));
window.addEventListener("online", refreshLiveData);
setInterval(() => { if (!document.hidden) refreshLiveData(); }, 10000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshLiveData(); });
window.addEventListener("focus", refreshLiveData);
renderApp();
refreshLiveData();
