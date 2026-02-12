/* ============================================
   account.js — скрипты личного кабинета
   ============================================ */

/* ---------- Состояние ---------- */
let allOrders = [];
let allCoursesAcc = [];
let allTutorsAcc = [];
let ordersPage = 1;
const ORDERS_PER_PAGE = 5;

let editingOrderId = null;
let deletingOrderId = null;

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();

  document.getElementById('order-edit-submit')
    .addEventListener('click', submitEditOrder);

  document.getElementById('order-delete-confirm')
    .addEventListener('click', confirmDeleteOrder);
});

/* ======================================================
   Загрузка всех данных (курсы + репетиторы + заявки)
   ====================================================== */

async function loadAllData() {
  try {
    const [courses, tutors, orders] = await Promise.all([
      getCourses(),
      getTutors(),
      getOrders()
    ]);
    allCoursesAcc = courses;
    allTutorsAcc = tutors;
    allOrders = orders;
    ordersPage = 1;
    renderOrders();
  } catch (err) {
    showNotification(
      'Не удалось загрузить данные: ' + err.message, 'danger'
    );
  }
}

/* Поиск курса / репетитора по ID в локальном массиве */
function findCourseById(id) {
  return allCoursesAcc.find(c => c.id === id) || null;
}

function findTutorById(id) {
  return allTutorsAcc.find(t => t.id === id) || null;
}

/* ---------- Отрисовка таблицы ---------- */

function renderOrders() {
  const tbody = document.getElementById('orders-table-body');
  const start = (ordersPage - 1) * ORDERS_PER_PAGE;
  const pageItems = allOrders.slice(start, start + ORDERS_PER_PAGE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4">
          У вас пока нет заявок
        </td>
      </tr>`;
    document.getElementById('orders-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = pageItems.map((order, idx) => {
    const num = start + idx + 1;
    const course = findCourseById(order.course_id);
    const tutor = findTutorById(order.tutor_id);
    const courseName = course ? course.name
      : (tutor ? tutor.name : 'Заявка #' + order.id);
    const dateStr = order.date_start
      ? formatDate(order.date_start) : '—';
    const price = order.price != null ? order.price + ' ₽' : '—';

    return `
      <tr>
        <td>${num}</td>
        <td>${courseName}</td>
        <td>${dateStr}</td>
        <td>${price}</td>
        <td>
          <button class="btn btn-pink btn-sm me-1"
                  onclick="openOrderDetails(${order.id})">
            Подробнее
          </button>
          <button class="btn btn-outline-pink btn-sm me-1"
                  onclick="openOrderEdit(${order.id})">
            Изменить
          </button>
          <button class="btn btn-outline-pink btn-sm"
                  onclick="openOrderDelete(${order.id})">
            Удалить
          </button>
        </td>
      </tr>`;
  }).join('');

  renderPagination(
    'orders-pagination',
    allOrders.length,
    ORDERS_PER_PAGE,
    ordersPage,
    (page) => { ordersPage = page; renderOrders(); }
  );
}

/* ======================================================
   3.4 — Подробности заявки
   ====================================================== */

async function openOrderDetails(orderId) {
  try {
    const order = await getOrderById(orderId);
    const course = findCourseById(order.course_id);
    const tutor = findTutorById(order.tutor_id);

    const courseName = course ? course.name
      : (tutor ? tutor.name : 'Неизвестный курс');
    const teacher = course ? course.teacher
      : (tutor ? tutor.name : '—');

    const options = [];
    if (order.early_registration) options.push(
      '<span class="badge badge-discount me-1">Ранняя регистрация −10%</span>'
    );
    if (order.group_enrollment) options.push(
      '<span class="badge badge-discount me-1">Группа 5+ −15%</span>'
    );
    if (order.intensive_course) options.push(
      '<span class="badge badge-surcharge me-1">Интенсив +20%</span>'
    );
    if (order.supplementary) options.push(
      '<span class="badge badge-surcharge me-1">Доп. материалы</span>'
    );
    if (order.personalized) options.push(
      '<span class="badge badge-surcharge me-1">Персональный план</span>'
    );
    if (order.excursions) options.push(
      '<span class="badge badge-surcharge me-1">Экскурсии +25%</span>'
    );
    if (order.assessment) options.push(
      '<span class="badge badge-surcharge me-1">Сертификация +300₽</span>'
    );
    if (order.interactive) options.push(
      '<span class="badge badge-surcharge me-1">Интерактив +50%</span>'
    );

    document.getElementById('order-details-body').innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <p><strong>Курс:</strong> ${courseName}</p>
          <p><strong>Преподаватель:</strong> ${teacher}</p>
          <p><strong>Дата начала:</strong> ${order.date_start
            ? formatDate(order.date_start) : '—'}</p>
          <p><strong>Время:</strong> ${order.time_start || '—'}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Продолжительность:</strong> ${order.duration || '—'} нед.</p>
          <p><strong>Студентов:</strong> ${order.persons || 1}</p>
          <p><strong>Стоимость:</strong> <span class="fw-bold">${order.price} ₽</span></p>
          <p><strong>Создано:</strong> ${order.created_at
            ? formatDate(order.created_at) : '—'}</p>
        </div>
      </div>
      <hr>
      <p><strong>Опции:</strong></p>
      <div>${options.length > 0 ? options.join(' ')
        : '<span class="text-muted">Нет дополнительных опций</span>'}</div>
    `;

    const modal = new bootstrap.Modal(
      document.getElementById('orderDetailsModal')
    );
    modal.show();
  } catch (err) {
    showNotification(
      'Ошибка загрузки заявки: ' + err.message, 'danger'
    );
  }
}

/* ======================================================
   3.5 — Редактирование заявки
   ====================================================== */

async function openOrderEdit(orderId) {
  try {
    const order = await getOrderById(orderId);
    editingOrderId = orderId;

    const course = findCourseById(order.course_id);
    const tutor = findTutorById(order.tutor_id);

    const courseName = course ? course.name
      : (tutor ? tutor.name : 'Заявка #' + order.course_id);
    const teacher = course ? course.teacher
      : (tutor ? tutor.name : '—');

    /* Извлекаем уникальные даты из курса */
    let dateOptions = '';
    let timeOptions = '';

    if (course && course.start_dates) {
      const dateMap = {};
      course.start_dates.forEach(dt => {
        const d = new Date(dt);
        const dateKey = d.toISOString().split('T')[0];
        if (!dateMap[dateKey]) dateMap[dateKey] = [];
        dateMap[dateKey].push(d);
      });

      const uniqueDates = Object.keys(dateMap).sort();
      dateOptions = uniqueDates.map(d => {
        const formatted = new Date(d + 'T00:00:00')
          .toLocaleDateString('ru-RU');
        const selected = order.date_start === d ? ' selected' : '';
        return `<option value="${d}"${selected}>${formatted}</option>`;
      }).join('');

      /* Если дата выбрана, подготавливаем слоты времени */
      const currentDate = order.date_start || '';
      if (currentDate && dateMap[currentDate]) {
        const wl = course.week_length || 1;
        timeOptions = dateMap[currentDate].map(d => {
          const sh = String(d.getHours()).padStart(2, '0');
          const sm = String(d.getMinutes()).padStart(2, '0');
          const end = new Date(d.getTime() + wl * 3600000);
          const eh = String(end.getHours()).padStart(2, '0');
          const em = String(end.getMinutes()).padStart(2, '0');
          const val = `${sh}:${sm}`;
          const selected = order.time_start === val ? ' selected' : '';
          return `<option value="${val}"${selected}>${sh}:${sm} — ${eh}:${em}</option>`;
        }).join('');
      }
    }

    document.getElementById('order-edit-form').innerHTML = `
      <div class="mb-3">
        <label class="form-label">Курс</label>
        <input type="text" class="form-control" value="${courseName}" readonly>
      </div>
      <div class="mb-3">
        <label class="form-label">Преподаватель</label>
        <input type="text" class="form-control" value="${teacher}" readonly>
      </div>
      <div class="mb-3">
        <label class="form-label">Дата начала</label>
        <select class="form-select" id="edit-date"
                onchange="onEditDateChange()">
          <option value="">Выберите дату...</option>
          ${dateOptions}
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Время занятия</label>
        <select class="form-select" id="edit-time"
                ${timeOptions ? '' : 'disabled'}
                onchange="recalculateEditCost()">
          ${timeOptions
            ? '<option value="">Выберите время...</option>' + timeOptions
            : '<option value="">Сначала выберите дату</option>'}
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Количество студентов</label>
        <input type="number" class="form-control" id="edit-students"
               min="1" max="20" value="${order.persons || 1}"
               onchange="recalculateEditCost()"
               oninput="recalculateEditCost()">
      </div>
      <div class="mb-3" id="edit-auto-options-area"></div>
      <div class="mb-3">
        <label class="form-label">Дополнительные опции</label>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="edit-opt-supplementary"
                 ${order.supplementary ? 'checked' : ''}
                 onchange="recalculateEditCost()">
          <label class="form-check-label" for="edit-opt-supplementary">
            Доп. материалы (+2 000 ₽ за студента)
          </label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="edit-opt-personalized"
                 ${order.personalized ? 'checked' : ''}
                 onchange="recalculateEditCost()">
          <label class="form-check-label" for="edit-opt-personalized">
            Персональный план (+1 500 ₽ за неделю)
          </label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="edit-opt-excursions"
                 ${order.excursions ? 'checked' : ''}
                 onchange="recalculateEditCost()">
          <label class="form-check-label" for="edit-opt-excursions">
            Экскурсии (+25% к стоимости)
          </label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="edit-opt-assessment"
                 ${order.assessment ? 'checked' : ''}
                 onchange="recalculateEditCost()">
          <label class="form-check-label" for="edit-opt-assessment">
            Сертификация (+300 ₽)
          </label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="edit-opt-interactive"
                 ${order.interactive ? 'checked' : ''}
                 onchange="recalculateEditCost()">
          <label class="form-check-label" for="edit-opt-interactive">
            Интерактивные занятия (+50% к стоимости)
          </label>
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Общая стоимость</label>
        <div class="input-group">
          <input type="text" class="form-control fw-bold"
                 id="edit-total-cost" value="${order.price || 0}" readonly>
          <span class="input-group-text">₽</span>
        </div>
      </div>
    `;

    /* Сохраняем данные курса для пересчёта */
    window._editCourse = course;
    window._editOrder = order;

    recalculateEditCost();

    const modal = new bootstrap.Modal(
      document.getElementById('orderEditModal')
    );
    modal.show();
  } catch (err) {
    showNotification(
      'Ошибка загрузки заявки: ' + err.message, 'danger'
    );
  }
}

/* ---------- Смена даты в форме редактирования ---------- */

function onEditDateChange() {
  const dateSelect = document.getElementById('edit-date');
  const timeSelect = document.getElementById('edit-time');
  const selectedDate = dateSelect.value;
  const course = window._editCourse;

  if (!selectedDate || !course || !course.start_dates) {
    timeSelect.disabled = true;
    timeSelect.innerHTML =
      '<option value="">Сначала выберите дату</option>';
    recalculateEditCost();
    return;
  }

  const times = course.start_dates
    .map(dt => new Date(dt))
    .filter(d => d.toISOString().split('T')[0] === selectedDate);

  const wl = course.week_length || 1;

  timeSelect.innerHTML = '<option value="">Выберите время...</option>' +
    times.map(d => {
      const sh = String(d.getHours()).padStart(2, '0');
      const sm = String(d.getMinutes()).padStart(2, '0');
      const end = new Date(d.getTime() + wl * 3600000);
      const eh = String(end.getHours()).padStart(2, '0');
      const em = String(end.getMinutes()).padStart(2, '0');
      return `<option value="${sh}:${sm}">${sh}:${sm} — ${eh}:${em}</option>`;
    }).join('');

  timeSelect.disabled = false;
  recalculateEditCost();
}

/* ---------- Пересчёт стоимости (редактирование) ---------- */

function recalculateEditCost() {
  const course = window._editCourse;
  if (!course) return;

  const dateVal    = document.getElementById('edit-date')?.value;
  const timeVal    = document.getElementById('edit-time')?.value;
  const studentsEl = document.getElementById('edit-students');
  const students   = studentsEl
    ? Math.max(1, Math.min(20, parseInt(studentsEl.value) || 1))
    : 1;

  const totalHours = (course.total_length || 1) * (course.week_length || 1);
  const feePerHour = course.course_fee_per_hour || 0;

  let weekendMul = 1;
  if (dateVal) {
    const day = new Date(dateVal + 'T00:00:00').getDay();
    if (day === 0 || day === 6) weekendMul = 1.5;
  }

  let morningSur = 0, eveningSur = 0;
  if (timeVal) {
    const hour = parseInt(timeVal.split(':')[0]);
    if (hour >= 9  && hour < 12)  morningSur  = 400;
    if (hour >= 18 && hour < 20) eveningSur = 1000;
  }

  let cost = (feePerHour * totalHours * weekendMul
            + morningSur + eveningSur)
            * students;

  /* Автоматические опции */
  const auto = getEditAutoOptions(dateVal, students, course.week_length || 0);
  renderEditAutoOptions(auto);

  if (auto.earlyRegistration) cost *= 0.9;
  if (auto.groupEnrollment)   cost *= 0.85;
  if (auto.intensiveCourse)   cost *= 1.2;

  if (document.getElementById('edit-opt-supplementary')?.checked)
    cost += 2000 * students;
  if (document.getElementById('edit-opt-personalized')?.checked)
    cost += 1500 * (course.total_length || 1);
  if (document.getElementById('edit-opt-excursions')?.checked)
    cost *= 1.25;
  if (document.getElementById('edit-opt-assessment')?.checked)
    cost += 300;
  if (document.getElementById('edit-opt-interactive')?.checked)
    cost *= 1.5;

  const el = document.getElementById('edit-total-cost');
  if (el) el.value = Math.round(cost);
}

function getEditAutoOptions(dateVal, students, weekLength) {
  const opts = {
    earlyRegistration: false,
    groupEnrollment:   false,
    intensiveCourse:   false,
  };

  if (dateVal) {
    const start = new Date(dateVal + 'T00:00:00');
    const today = new Date();
    const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    if (diffDays >= 30) opts.earlyRegistration = true;
  }
  if (students >= 5) opts.groupEnrollment = true;
  if (weekLength >= 5) opts.intensiveCourse = true;

  return opts;
}

function renderEditAutoOptions(opts) {
  const area = document.getElementById('edit-auto-options-area');
  if (!area) return;

  let html = '';
  if (opts.earlyRegistration)
    html += '<span class="badge badge-discount me-2 mb-1">'
          + 'Ранняя регистрация: −10%</span>';
  if (opts.groupEnrollment)
    html += '<span class="badge badge-discount me-2 mb-1">'
          + 'Группа 5+: −15%</span>';
  if (opts.intensiveCourse)
    html += '<span class="badge badge-surcharge me-2 mb-1">'
          + 'Интенсив 5+ ч/нед: +20%</span>';

  area.innerHTML = html
    || '<span class="text-muted" style="font-size:.9rem">'
     + 'Автоматические скидки/надбавки отсутствуют</span>';
}

/* ---------- Отправка редактирования ---------- */

async function submitEditOrder() {
  if (!editingOrderId) return;

  const course = window._editCourse;
  const dateVal  = document.getElementById('edit-date').value;
  const timeVal  = document.getElementById('edit-time').value;
  const students = parseInt(
    document.getElementById('edit-students').value
  ) || 1;
  const totalCost = parseInt(
    document.getElementById('edit-total-cost').value
  ) || 0;

  if (!dateVal) {
    showNotification('Выберите дату начала.', 'warning');
    return;
  }
  if (!timeVal) {
    showNotification('Выберите время занятия.', 'warning');
    return;
  }

  const auto = getEditAutoOptions(
    dateVal, students, course ? course.week_length : 0
  );

  const orderData = {
    course_id:          course ? course.id : window._editOrder.course_id,
    date_start:         dateVal,
    time_start:         timeVal,
    duration:           course ? course.total_length : window._editOrder.duration,
    persons:            students,
    price:              totalCost,
    early_registration: auto.earlyRegistration,
    group_enrollment:   auto.groupEnrollment,
    intensive_course:   auto.intensiveCourse,
    supplementary:
      document.getElementById('edit-opt-supplementary')?.checked || false,
    personalized:
      document.getElementById('edit-opt-personalized')?.checked  || false,
    excursions:
      document.getElementById('edit-opt-excursions')?.checked    || false,
    assessment:
      document.getElementById('edit-opt-assessment')?.checked    || false,
    interactive:
      document.getElementById('edit-opt-interactive')?.checked   || false,
  };

  try {
    await updateOrder(editingOrderId, orderData);

    const modalEl = document.getElementById('orderEditModal');
    const modal   = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    showNotification('Заявка успешно обновлена!', 'success');
    await loadAllData();
  } catch (err) {
    showNotification(
      'Ошибка обновления: ' + err.message, 'danger'
    );
  }
}

/* ======================================================
   3.6 — Удаление заявки
   ====================================================== */

function openOrderDelete(orderId) {
  deletingOrderId = orderId;
  const modal = new bootstrap.Modal(
    document.getElementById('orderDeleteModal')
  );
  modal.show();
}

async function confirmDeleteOrder() {
  if (!deletingOrderId) return;

  try {
    await deleteOrder(deletingOrderId);

    const modalEl = document.getElementById('orderDeleteModal');
    const modal   = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    showNotification('Заявка удалена.', 'success');
    deletingOrderId = null;
    await loadAllData();
  } catch (err) {
    showNotification(
      'Ошибка удаления: ' + err.message, 'danger'
    );
  }
}
