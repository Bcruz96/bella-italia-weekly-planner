const SUPABASE_URL = "https://snimrlbzcigltlcifneb.supabase.co";
const SUPABASE_KEY = "sb_publishable_9_pd1IQnNYYRzDFT-TLJ_A_xWVzSxHr";

const database = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase conectado:", database);
const RESTAURANT_ID = "bi-wellington-street";
async function testSupabaseConnection() {
  const { data, error } = await database
    .from("manual_tasks")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Erro no Supabase:", error);
    return;
  }

  console.log("Teste Supabase OK:", data);
}

testSupabaseConnection();
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
},,

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

let fixedTaskCompletion = {};
let manualTasks = [];

async function loadDataFromSupabase() {
  const { data: completionData, error: completionError } = await database
    .from("fixed_task_completion")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID);

  if (completionError) {
    console.error("Error loading fixed task completion:", completionError);
  } else {
    fixedTaskCompletion = {};

    completionData.forEach((item) => {
      const completionKey = `${item.date_key}|${item.task_id}`;
      fixedTaskCompletion[completionKey] = item.completed;
    });
  }

  const { data: manualData, error: manualError } = await database
    .from("manual_tasks")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID);

  if (manualError) {
    console.error("Error loading manual tasks:", manualError);
  } else {
    manualTasks = manualData.map((task) => {
      return {
        id: task.id,
        title: task.title,
        day: task.day,
        dateKey: task.date_key,
        category: task.category,
        completed: task.completed
      };
    });
  }

  renderApp();
}

async function saveFixedCompletion(taskId, completed) {
  const selectedDateKey = getSelectedDateKey();

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
    console.error("Error saving fixed task completion:", error);
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
    console.error("Error adding manual task:", error);
    return null;
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
    .eq("id", taskId);

  if (error) {
    console.error("Error updating manual task:", error);
  }
}

async function deleteManualTaskOnline(taskId) {
  const { error } = await database
    .from("manual_tasks")
    .delete()
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("id", taskId);

  if (error) {
    console.error("Error deleting manual task:", error);
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

    const dayElement = document.createElement("div");
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

  taskDay.value = currentDay;
}

function getTasksForSelectedDay() {
  const selectedDay = dayNames[selectedDayIndex];
  const selectedDateKey = getSelectedDateKey();

  const fixedForDay = fixedTasks
    .filter((task) => task.day === selectedDay)
    .map((task) => {
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
  const groups = {};

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
    const headerStyle = groupIsComplete
    ? 'style="background: linear-gradient(145deg, #1f7a68 0%, #166b59 50%, #0f4f43 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -10px 18px rgba(0,0,0,0.08), 0 10px 22px rgba(22,107,89,0.16);"'
   : "";

    groupElement.innerHTML = `
    <div class="${headerClass}">
        <h3>${category}</h3>

        <div class="group-progress">
          <div class="group-progress-bar">
            <div class="group-progress-fill" style="width: ${percentage}%"></div>
          </div>

          <strong>${completed}/${total}</strong>
        </div>
      </div>
    `;

    group.forEach((task) => {
      const taskElement = document.createElement("div");
      taskElement.classList.add("task-item");

      if (task.completed) {
        taskElement.classList.add("completed");
      }

const deleteButton = task.isFixed === false
  ? `<button type="button" class="delete-task" onclick="deleteTask('${task.id}')">×</button>`
  : "";

taskElement.innerHTML = `
  <button 
    type="button" 
    class="task-check" 
    onclick="toggleTask('${task.id}', ${task.isFixed === true})">
  </button>

  <div class="task-info">
    <div class="task-title">${task.title}</div>
  </div>

  ${deleteButton}
`;

      groupElement.appendChild(taskElement);
    });

    taskGroups.appendChild(groupElement);
  });
}

async function toggleTask(taskId, isFixed) {
  if (isFixed === true) {
    const selectedDateKey = getSelectedDateKey();
    const completionKey = `${selectedDateKey}|${taskId}`;
    const newCompletedValue = !fixedTaskCompletion[completionKey];

    fixedTaskCompletion[completionKey] = newCompletedValue;

    renderApp();

    await saveFixedCompletion(taskId, newCompletedValue);
  } else {
    let newCompletedValue = false;

    manualTasks = manualTasks.map((task) => {
      if (String(task.id) === String(taskId)) {
        newCompletedValue = !task.completed;

        return {
          ...task,
          completed: newCompletedValue
        };
      }

      return task;
    });

    renderApp();

    await updateManualTaskOnline(taskId, newCompletedValue);
  }
}

async function deleteTask(taskId) {
  const confirmDelete = confirm("Delete this manual task?");

  if (!confirmDelete) {
    return;
  }

  manualTasks = manualTasks.filter((task) => String(task.id) !== String(taskId));

  renderApp();

  await deleteManualTaskOnline(taskId);
}

function openModal() {
  taskModal.classList.add("show");
  taskDay.value = dayNames[selectedDayIndex];
}

function closeModal() {
  taskModal.classList.remove("show");
  taskForm.reset();
}

taskForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const selectedManualDayIndex = dayNames.indexOf(taskDay.value);
  const manualTaskDate = getDateForDay(selectedManualDayIndex);
  const manualTaskDateKey = getDateKey(manualTaskDate);

  const newTask = {
    title: taskTitle.value,
    day: taskDay.value,
    dateKey: manualTaskDateKey,
    category: taskCategory.value,
    completed: false
  };

  const savedTask = await addManualTaskOnline(newTask);

  if (savedTask) {
    manualTasks.push(savedTask);
    closeModal();
    renderApp();
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
  selectedDayIndex = selectedDayIndex === 0 ? 6 : selectedDayIndex - 1;
  renderApp();
});

nextDayButton.addEventListener("click", function () {
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

// First load
loadDataFromSupabase();

// Live auto refresh
let isLiveRefreshing = false;

async function refreshLiveData() {
  if (isLiveRefreshing) return;

  isLiveRefreshing = true;

  try {
    await loadDataFromSupabase();
    console.log("Live data refreshed:", new Date().toLocaleTimeString());
  } catch (error) {
    console.error("Live refresh error:", error);
  } finally {
    isLiveRefreshing = false;
  }
}

// Refresh every 10 seconds while app is open
setInterval(() => {
  if (!document.hidden) {
    refreshLiveData();
  }
}, 10000);

// Refresh immediately when user comes back to the app
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshLiveData();
  }
});

// Extra refresh when browser/tab gets focus
window.addEventListener("focus", refreshLiveData);