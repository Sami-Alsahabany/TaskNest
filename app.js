// عناصر DOM الأساسية
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const dueDateInput = document.getElementById("dueDateInput");
const repeatSelect = document.getElementById("repeatSelect");
const addTaskBtn = document.getElementById("addTaskBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const taskList = document.getElementById("taskList");
const taskCounters = document.getElementById("taskCounters");
const errorMsg = document.getElementById("errorMsg");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const darkModeToggle = document.getElementById("darkModeToggle");

// تخزين المهام في مصفوفة
let tasks = [];
// لتتبع حالة التعديل
let isEditing = false;
let editingId = null;

// --- الوظائف --- //

// حفظ المهام في التخزين المحلي (localStorage)
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// تحميل المهام من التخزين المحلي
function loadTasks() {
  const data = localStorage.getItem("tasks");
  if (data) {
    tasks = JSON.parse(data);
  }
}

// توليد معرف فريد لكل مهمة
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// تحديث عداد المهام
function updateCounters() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  taskCounters.textContent = `عدد المهام: ${total} | المكتملة: ${completed} | غير المكتملة: ${pending}`;
}

// التحقق من صحة المدخلات
function validateInput(text) {
  if (!text.trim()) {
    errorMsg.textContent = "⚠️ الرجاء إدخال نص المهمة.";
    return false;
  }
  if (text.trim().length > 200) {
    errorMsg.textContent = "⚠️ نص المهمة طويل جداً. الحد الأقصى 200 حرف.";
    return false;
  }
  errorMsg.textContent = "";
  return true;
}

// تنسيق التاريخ لعرضه
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// إضافة أو تحديث مهمة
function addOrUpdateTask(e) {
  e.preventDefault();

  const text = taskInput.value.trim();
  if (!validateInput(text)) return;

  const priority = prioritySelect.value;
  const dueDate = dueDateInput.value;
  const repeat = repeatSelect.value;

  if (isEditing && editingId) {
    // تحديث المهمة
    const task = tasks.find(t => t.id === editingId);
    if (task) {
      task.text = text;
      task.priority = priority;
      task.dueDate = dueDate;
      task.repeat = repeat;
    }
    isEditing = false;
    editingId = null;
    addTaskBtn.textContent = "💾 حفظ";
    cancelEditBtn.hidden = true;
  } else {
    // إضافة مهمة جديدة
    const newTask = {
      id: generateId(),
      text,
      priority,
      dueDate,
      repeat,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    tasks.push(newTask);
  }

  taskForm.reset();
  renderTasks();
  saveTasks();
  updateCounters();
}

// إلغاء التعديل
function cancelEdit() {
  isEditing = false;
  editingId = null;
  taskForm.reset();
  addTaskBtn.textContent = "💾 حفظ";
  cancelEditBtn.hidden = true;
  errorMsg.textContent = "";
}

// تغيير حالة إكمال المهمة
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    // إذا كانت المهمة متكررة وأكملت واحدة، نقوم بإنشاء مهمة جديدة للتكرار
    if (task.completed && task.repeat !== "none") {
      createNextRecurringTask(task);
    }
  }
  saveTasks();
  renderTasks();
  updateCounters();
}

// حذف مهمة
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  updateCounters();
}

// بدء تعديل مهمة
function startEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  isEditing = true;
  editingId = id;
  taskInput.value = task.text;
  prioritySelect.value = task.priority;
  dueDateInput.value = task.dueDate;
  repeatSelect.value = task.repeat;
  addTaskBtn.textContent = "✏️ تعديل";
  cancelEditBtn.hidden = false;
  errorMsg.textContent = "";
  taskInput.focus();
}

// إنشاء مهمة متكررة جديدة بناءً على المهمة الأصلية
function createNextRecurringTask(task) {
  const newTask = {...task};
  newTask.id = generateId();
  newTask.completed = false;
  newTask.completedAt = null;
  newTask.createdAt = new Date().toISOString();

  let nextDate = new Date(task.dueDate || new Date());
  switch(task.repeat) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      nextDate = null;
  }

  if (nextDate) {
    newTask.dueDate = nextDate.toISOString().slice(0, 10);
  }

  tasks.push(newTask);
  saveTasks();
}

// فلترة المهام حسب البحث والتصفية
function filterTasks() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filter = filterSelect.value;

  return tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(searchTerm);
    const matchesFilter =
      filter === "all" ||
      (filter === "completed" && task.completed) ||
      (filter === "pending" && !task.completed);

    return matchesSearch && matchesFilter;
  });
}

// عرض المهام على الصفحة
function renderTasks() {
  const filteredTasks = filterTasks();

  taskList.innerHTML = "";

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `<li style="text-align:center; color:#64748b; font-style: italic;">لا توجد مهام للعرض.</li>`;
    return;
  }

  filteredTasks.forEach(task => {
    const li = document.createElement("li");
    li.className = "task-item";
    if (task.completed) li.classList.add("completed");

    // تلوين حسب الأولوية
    let priorityClass = "";
    switch (task.priority) {
      case "عالية":
        priorityClass = "priority-high";
        break;
      case "متوسطة":
        priorityClass = "priority-medium";
        break;
      case "منخفضة":
        priorityClass = "priority-low";
        break;
    }

    // المحتوى الرئيسي للمهمة
    const taskTextDiv = document.createElement("div");
    taskTextDiv.className = "task-text";
    taskTextDiv.tabIndex = 0;
    taskTextDiv.setAttribute("role", "button");
    taskTextDiv.setAttribute("aria-pressed", task.completed);
    taskTextDiv.title = "اضغط لتغيير حالة الإنجاز";

    // نص المهمة
    const mainTextSpan = document.createElement("span");
    mainTextSpan.className = `task-main-text ${priorityClass}`;
    mainTextSpan.textContent = task.text;
    taskTextDiv.appendChild(mainTextSpan);

    // تفاصيل إضافية: التاريخ والأولوية
    const detailsSpan = document.createElement("span");
    detailsSpan.className = "task-details";
    detailsSpan.textContent = `تاريخ الاستحقاق: ${formatDate(task.dueDate) || "غير محدد"} | تكرار: ${task.repeat === "none" ? "لا يوجد" : task.repeat} | تم الإنشاء: ${formatDate(task.createdAt)}`;
    taskTextDiv.appendChild(detailsSpan);

    // تغيير حالة الإنجاز بالنقر أو الضغط على Enter
    taskTextDiv.addEventListener("click", () => toggleComplete(task.id));
    taskTextDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleComplete(task.id);
      }
    });

    // أزرار التحكم
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "task-actions";

    // زر تعديل
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.title = "تعديل المهمة";
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => startEdit(task.id));
    actionsDiv.appendChild(editBtn);

    // زر حذف
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "حذف المهمة";
    deleteBtn.textContent = "🗑️";
    deleteBtn.addEventListener("click", () => {
      if (confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
        deleteTask(task.id);
      }
    });
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(taskTextDiv);
    li.appendChild(actionsDiv);
    taskList.appendChild(li);
  });
}

// تصدير المهام كملف JSON
function exportTasks() {
  const dataStr = JSON.stringify(tasks, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tasks.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// استيراد المهام من ملف JSON
function importTasks(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedTasks = JSON.parse(e.target.result);
      if (Array.isArray(importedTasks)) {
        tasks = importedTasks;
        saveTasks();
        renderTasks();
        updateCounters();
      } else {
        alert("ملف غير صالح.");
      }
    } catch {
      alert("خطأ في قراءة الملف.");
    }
  };
  reader.readAsText(file);
  importInput.value = "";
}

// تبديل الوضع الليلي
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark") ? "enabled" : "disabled");
}

// تحميل الإعدادات الأولية
function initialize() {
  loadTasks();
  renderTasks();
  updateCounters();

  // استعادة الوضع الليلي إذا كان مفعلًا سابقًا
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark");
    darkModeToggle.checked = true;
  }
}

// --- الأحداث --- //

taskForm.addEventListener("submit", addOrUpdateTask);
cancelEditBtn.addEventListener("click", cancelEdit);
searchInput.addEventListener("input", renderTasks);
filterSelect.addEventListener("change", renderTasks);
exportBtn.addEventListener("click", exportTasks);
importBtn.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", importTasks);
darkModeToggle.addEventListener("change", toggleDarkMode);

// بدء التطبيق
initialize();
