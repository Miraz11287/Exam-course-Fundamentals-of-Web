/* ============================================
   main.js — скрипты главной страницы
   ============================================ */

/* ---------- Состояние ---------- */
let allCourses = [];
let filteredCourses = [];
let coursesPage = 1;
const COURSES_PER_PAGE = 5;

let allTutors = [];
let filteredTutors = [];
let selectedTutorId = null;

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  console.log('LinguaPlay загружен');

  showNotification(
    'Добро пожаловать в LinguaPlay! Выбирайте курсы и записывайтесь.',
    'info'
  );

  if (document.getElementById('courses-table-body')) {
    loadCourses();
  }

  if (document.getElementById('tutors-table-body')) {
    loadTutors();
  }

  const searchBtn = document.getElementById('course-search-btn');
  if (searchBtn) searchBtn.addEventListener('click', filterCourses);

  const searchName = document.getElementById('course-search-name');
  if (searchName) searchName.addEventListener('input', filterCourses);

  const searchLevel = document.getElementById('course-search-level');
  if (searchLevel) searchLevel.addEventListener('change', filterCourses);

  const tutorBtn = document.getElementById('tutor-search-btn');
  if (tutorBtn) tutorBtn.addEventListener('click', filterTutors);

  const tutorLevel = document.getElementById('tutor-search-level');
  if (tutorLevel) tutorLevel.addEventListener('change', filterTutors);

  const tutorExp = document.getElementById('tutor-search-exp');
  if (tutorExp) tutorExp.addEventListener('input', filterTutors);

  const requestBtn = document.getElementById('request-tutor-btn');
  if (requestBtn) requestBtn.addEventListener('click', openTutorModal);

  const tutorSubmit = document.getElementById('tutor-order-submit');
  if (tutorSubmit) tutorSubmit.addEventListener('click', submitTutorRequest);

  const courseSubmit = document.getElementById('course-order-submit');
  if (courseSubmit) courseSubmit.addEventListener('click', submitCourseOrder);

  // Инициализация карты учебных ресурсов
  if (document.getElementById('yandex-map')) {
    initResourcesMap();
  }

  // Обработчики для фильтров ресурсов
  const resourceSearch = document.getElementById('resource-search');
  if (resourceSearch) resourceSearch.addEventListener('input', filterResources);

  const resourceType = document.getElementById('resource-type-filter');
  if (resourceType) resourceType.addEventListener('change', filterResources);
});

/* ---------- Курсы: загрузка ---------- */

async function loadCourses() {
  try {
    allCourses = await getCourses();
    filteredCourses = allCourses;
    coursesPage = 1;
    renderCourses();
  } catch (err) {
    showNotification('Не удалось загрузить курсы: ' + err.message, 'danger');
  }
}

/* ---------- Курсы: фильтрация ---------- */

function filterCourses() {
  const nameQuery = document.getElementById('course-search-name')
    .value.trim().toLowerCase();
  const levelQuery = document.getElementById('course-search-level').value;

  filteredCourses = allCourses.filter(course => {
    const matchName = !nameQuery
      || course.name.toLowerCase().includes(nameQuery);
    const matchLevel = !levelQuery
      || course.level === levelQuery;
    return matchName && matchLevel;
  });

  coursesPage = 1;
  renderCourses();
}

/* ---------- Курсы: отрисовка ---------- */

function renderCourses() {
  const tbody = document.getElementById('courses-table-body');
  const start = (coursesPage - 1) * COURSES_PER_PAGE;
  const pageItems = filteredCourses.slice(start, start + COURSES_PER_PAGE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          Курсы не найдены
        </td>
      </tr>`;
    document.getElementById('courses-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = pageItems.map(course => {
    const levelBadge = getLevelBadge(course.level);
    return `
      <tr>
        <td title="${course.description}">${course.name}</td>
        <td>${levelBadge}</td>
        <td>${course.teacher}</td>
        <td>${course.total_length}</td>
        <td>${course.week_length}</td>
        <td>${course.course_fee_per_hour}</td>
        <td>
          <button class="btn btn-pink btn-sm"
                  onclick="openCourseModal(${course.id})">
            Подать заявку
          </button>
        </td>
      </tr>`;
  }).join('');

  renderPagination(
    'courses-pagination',
    filteredCourses.length,
    COURSES_PER_PAGE,
    coursesPage,
    (page) => { coursesPage = page; renderCourses(); }
  );
}

/* ---------- Утилита: бейдж уровня ---------- */

function getLevelBadge(level) {
  const map = {
    'Beginner':     { text: 'Начальный',    cls: 'bg-success' },
    'Intermediate': { text: 'Средний',      cls: 'bg-warning text-dark' },
    'Advanced':     { text: 'Продвинутый',  cls: 'bg-danger' },
  };
  const info = map[level] || { text: level, cls: 'bg-secondary' };
  return `<span class="badge ${info.cls}">${info.text}</span>`;
}

/* ======================================================
   Репетиторы
   ====================================================== */

/* ---------- Репетиторы: загрузка ---------- */

async function loadTutors() {
  try {
    allTutors = await getTutors();
    filteredTutors = allTutors;
    renderTutors();
  } catch (err) {
    showNotification(
      'Не удалось загрузить репетиторов: ' + err.message, 'danger'
    );
  }
}

/* ---------- Репетиторы: фильтрация ---------- */

function filterTutors() {
  const levelQuery = document.getElementById('tutor-search-level').value;
  const expQuery = document.getElementById('tutor-search-exp').value;
  const minExp = expQuery ? parseInt(expQuery) : 0;

  filteredTutors = allTutors.filter(tutor => {
    const matchLevel = !levelQuery
      || tutor.language_level === levelQuery;
    const matchExp = tutor.work_experience >= minExp;
    return matchLevel && matchExp;
  });

  renderTutors();
}

/* ---------- Репетиторы: отрисовка ---------- */

function renderTutors() {
  const tbody = document.getElementById('tutors-table-body');

  if (filteredTutors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          Репетиторы не найдены
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filteredTutors.map(tutor => {
    const isSelected = tutor.id === selectedTutorId;
    const languages = tutor.languages_offered
      ? tutor.languages_offered.join(', ')
      : '';
    const levelBadge = getLevelBadge(tutor.language_level);

    return `
      <tr class="${isSelected ? 'selected' : ''}"
          data-tutor-id="${tutor.id}">
        <td>
          <div class="tutor-avatar">
            ${tutor.name.charAt(0)}
          </div>
        </td>
        <td>${tutor.name}</td>
        <td>${levelBadge}</td>
        <td>${languages}</td>
        <td>${tutor.work_experience}</td>
        <td>${tutor.price_per_hour}</td>
        <td>
          <button class="btn ${isSelected ? 'btn-outline-pink' : 'btn-pink'} btn-sm"
                  onclick="selectTutor(${tutor.id})">
            ${isSelected ? 'Выбран' : 'Выбрать'}
          </button>
        </td>
      </tr>`;
  }).join('');

  updateTutorButton();
}

/* ---------- Репетиторы: выбор ---------- */

function selectTutor(tutorId) {
  selectedTutorId = selectedTutorId === tutorId ? null : tutorId;
  renderTutors();
}

function updateTutorButton() {
  const btn = document.getElementById('request-tutor-btn');
  btn.disabled = !selectedTutorId;
}

/* ---------- Модальное окно: запрос репетитора ---------- */

function openTutorModal() {
  if (!selectedTutorId) return;
  const tutor = allTutors.find(t => t.id === selectedTutorId);
  if (!tutor) return;

  const modal = new bootstrap.Modal(
    document.getElementById('tutorModal')
  );

  const languages = tutor.languages_offered
    ? tutor.languages_offered.join(', ')
    : '';

  document.getElementById('tutor-request-form').innerHTML = `
    <div class="mb-3">
      <label class="form-label">Репетитор</label>
      <input type="text" class="form-control" value="${tutor.name}" readonly>
    </div>
    <div class="mb-3">
      <label class="form-label">Языки</label>
      <input type="text" class="form-control" value="${languages}" readonly>
    </div>
    <div class="mb-3">
      <label class="form-label">Ваше имя</label>
      <input type="text" class="form-control" id="tutor-req-name"
             placeholder="Введите ваше имя" required>
    </div>
    <div class="mb-3">
      <label class="form-label">Email</label>
      <input type="email" class="form-control" id="tutor-req-email"
             placeholder="example@mail.ru" required>
    </div>
    <div class="mb-3">
      <label class="form-label">Сообщение</label>
      <textarea class="form-control" id="tutor-req-message" rows="3"
                placeholder="Расскажите о ваших целях и пожеланиях..."></textarea>
    </div>
  `;

  modal.show();
}

/* ---------- Отправка формы репетитора ---------- */

function submitTutorRequest() {
  const name = document.getElementById('tutor-req-name');
  const email = document.getElementById('tutor-req-email');

  if (!name || !email || !name.value.trim() || !email.value.trim()) {
    showNotification('Пожалуйста, заполните имя и email.', 'warning');
    return;
  }

  const modalEl = document.getElementById('tutorModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  showNotification(
    'Запрос на занятие отправлен! Мы свяжемся с вами.',
    'success'
  );

  selectedTutorId = null;
  renderTutors();
}

/* ======================================================
   Модальное окно заявки на курс
   ====================================================== */

let currentCourse = null;

/* ---------- Открытие модального окна ---------- */

function openCourseModal(courseId) {
  const course = allCourses.find(c => c.id === courseId);
  if (!course) return;
  currentCourse = course;

  document.getElementById('courseModalLabel').textContent
    = 'Оформление заявки';

  /* Извлекаем уникальные даты из start_dates */
  const dateMap = {};
  (course.start_dates || []).forEach(dt => {
    const d = new Date(dt);
    const dateKey = d.toISOString().split('T')[0];
    if (!dateMap[dateKey]) dateMap[dateKey] = [];
    dateMap[dateKey].push(d);
  });

  const uniqueDates = Object.keys(dateMap).sort();
  const dateOptions = uniqueDates.map(d => {
    const formatted = new Date(d + 'T00:00:00').toLocaleDateString('ru-RU');
    return `<option value="${d}">${formatted}</option>`;
  }).join('');

  /* Собираем HTML формы */
  document.getElementById('course-order-form').innerHTML = `
    <!-- Поле 1: Название курса -->
    <div class="mb-3">
      <label class="form-label">Название курса</label>
      <input type="text" class="form-control" value="${course.name}" readonly>
    </div>

    <!-- Поле 2: Преподаватель -->
    <div class="mb-3">
      <label class="form-label">Преподаватель</label>
      <input type="text" class="form-control" value="${course.teacher}" readonly>
    </div>

    <!-- Поле 3: Дата начала -->
    <div class="mb-3">
      <label class="form-label">Дата начала курса</label>
      <select class="form-select" id="course-date"
              onchange="onCourseDateChange()">
        <option value="">Выберите дату...</option>
        ${dateOptions}
      </select>
    </div>

    <!-- Поле 4: Время занятия -->
    <div class="mb-3">
      <label class="form-label">Время занятия</label>
      <select class="form-select" id="course-time" disabled
              onchange="recalculateCost()">
        <option value="">Сначала выберите дату</option>
      </select>
    </div>

    <!-- Поле 5: Продолжительность -->
    <div class="mb-3">
      <label class="form-label">Продолжительность курса</label>
      <input type="text" class="form-control" id="course-duration" readonly
             value="${course.total_length} нед. (${course.week_length} ч/нед)">
    </div>

    <!-- Поле 6: Количество студентов -->
    <div class="mb-3">
      <label class="form-label">Количество студентов</label>
      <input type="number" class="form-control" id="course-students"
             min="1" max="20" value="1"
             onchange="recalculateCost()" oninput="recalculateCost()">
    </div>

    <!-- Автоматические скидки / надбавки (бейджи) -->
    <div class="mb-3" id="auto-options-area"></div>

    <!-- Поле 7: Дополнительные опции -->
    <div class="mb-3">
      <label class="form-label">Дополнительные опции</label>
      <div class="form-check">
        <input class="form-check-input" type="checkbox"
               id="opt-supplementary" onchange="recalculateCost()">
        <label class="form-check-label" for="opt-supplementary">
          Доп. материалы (+2 000 ₽ за студента)
        </label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="checkbox"
               id="opt-personalized" onchange="recalculateCost()">
        <label class="form-check-label" for="opt-personalized">
          Персональный план (+1 500 ₽ за неделю)
        </label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="checkbox"
               id="opt-excursions" onchange="recalculateCost()">
        <label class="form-check-label" for="opt-excursions">
          Экскурсии (+25% к стоимости)
        </label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="checkbox"
               id="opt-assessment" onchange="recalculateCost()">
        <label class="form-check-label" for="opt-assessment">
          Сертификация (+300 ₽)
        </label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="checkbox"
               id="opt-interactive" onchange="recalculateCost()">
        <label class="form-check-label" for="opt-interactive">
          Интерактивные занятия (+50% к стоимости)
        </label>
      </div>
    </div>

    <!-- Поле 8: Общая стоимость -->
    <div class="mb-3">
      <label class="form-label">Общая стоимость</label>
      <div class="input-group">
        <input type="text" class="form-control fw-bold"
               id="course-total-cost" value="0" readonly>
        <span class="input-group-text">₽</span>
      </div>
    </div>
  `;

  recalculateCost();

  const modal = new bootstrap.Modal(
    document.getElementById('courseModal')
  );
  modal.show();
}

/* ---------- Смена даты → обновление времени ---------- */

function onCourseDateChange() {
  const dateSelect = document.getElementById('course-date');
  const timeSelect = document.getElementById('course-time');
  const selectedDate = dateSelect.value;

  if (!selectedDate || !currentCourse) {
    timeSelect.disabled = true;
    timeSelect.innerHTML =
      '<option value="">Сначала выберите дату</option>';
    recalculateCost();
    return;
  }

  /* Фильтруем доступные слоты по дате */
  const times = (currentCourse.start_dates || [])
    .map(dt => new Date(dt))
    .filter(d => d.toISOString().split('T')[0] === selectedDate);

  const wl = currentCourse.week_length || 1;

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

  /* Обновляем поле «Продолжительность» — дата окончания */
  const startD = new Date(selectedDate + 'T00:00:00');
  const endD   = new Date(startD);
  endD.setDate(endD.getDate() + currentCourse.total_length * 7);

  document.getElementById('course-duration').value =
    `${currentCourse.total_length} нед. (${currentCourse.week_length} ч/нед)` +
    ` — до ${endD.toLocaleDateString('ru-RU')}`;

  recalculateCost();
}

/* ---------- Автоматические опции ---------- */

function getAutoOptions(dateVal, students, weekLength) {
  const opts = {
    earlyRegistration: false,
    groupEnrollment:   false,
    intensiveCourse:   false,
  };

  /* earlyRegistration: дата >= 30 дней вперёд */
  if (dateVal) {
    const start = new Date(dateVal + 'T00:00:00');
    const today = new Date();
    const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    if (diffDays >= 30) opts.earlyRegistration = true;
  }

  /* groupEnrollment: >= 5 студентов */
  if (students >= 5) opts.groupEnrollment = true;

  /* intensiveCourse: >= 5 ч/нед */
  if (weekLength >= 5) opts.intensiveCourse = true;

  return opts;
}

function renderAutoOptions(opts) {
  const area = document.getElementById('auto-options-area');
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

/* ---------- Расчёт стоимости ---------- */

function recalculateCost() {
  if (!currentCourse) return;

  const dateVal    = document.getElementById('course-date')?.value;
  const timeVal    = document.getElementById('course-time')?.value;
  const studentsEl = document.getElementById('course-students');
  const students   = studentsEl
    ? Math.max(1, Math.min(20, parseInt(studentsEl.value) || 1))
    : 1;

  const totalHours = currentCourse.total_length * currentCourse.week_length;
  const feePerHour = currentCourse.course_fee_per_hour;

  /* Множитель выходного дня */
  let weekendMul = 1;
  if (dateVal) {
    const day = new Date(dateVal + 'T00:00:00').getDay();
    if (day === 0 || day === 6) weekendMul = 1.5;
  }

  /* Утренняя / вечерняя надбавка */
  let morningSur = 0, eveningSur = 0;
  if (timeVal) {
    const hour = parseInt(timeVal.split(':')[0]);
    if (hour >= 9  && hour < 12)  morningSur  = 400;
    if (hour >= 18 && hour < 20) eveningSur = 1000;
  }

  /* Базовая стоимость */
  let cost = (feePerHour * totalHours * weekendMul
            + morningSur + eveningSur)
            * students;

  /* Автоматические опции */
  const auto = getAutoOptions(
    dateVal, students, currentCourse.week_length
  );
  renderAutoOptions(auto);

  if (auto.earlyRegistration) cost *= 0.9;
  if (auto.groupEnrollment)   cost *= 0.85;
  if (auto.intensiveCourse)   cost *= 1.2;

  /* Ручные опции (чекбоксы) */
  if (document.getElementById('opt-supplementary')?.checked)
    cost += 2000 * students;
  if (document.getElementById('opt-personalized')?.checked)
    cost += 1500 * currentCourse.total_length;
  if (document.getElementById('opt-excursions')?.checked)
    cost *= 1.25;
  if (document.getElementById('opt-assessment')?.checked)
    cost += 300;
  if (document.getElementById('opt-interactive')?.checked)
    cost *= 1.5;

  /* Отображение */
  const el = document.getElementById('course-total-cost');
  if (el) el.value = Math.round(cost);
}

/* ---------- Отправка заявки на курс ---------- */

async function submitCourseOrder() {
  if (!currentCourse) return;

  const dateVal  = document.getElementById('course-date').value;
  const timeVal  = document.getElementById('course-time').value;
  const students = parseInt(
    document.getElementById('course-students').value
  ) || 1;
  const totalCost = parseInt(
    document.getElementById('course-total-cost').value
  ) || 0;

  /* Валидация */
  if (!dateVal) {
    showNotification('Выберите дату начала курса.', 'warning');
    return;
  }
  if (!timeVal) {
    showNotification('Выберите время занятия.', 'warning');
    return;
  }
  if (students < 1 || students > 20) {
    showNotification('Количество студентов: от 1 до 20.', 'warning');
    return;
  }

  const auto = getAutoOptions(
    dateVal, students, currentCourse.week_length
  );

  const tutor = selectedTutorId
    ? allTutors.find(t => t.id === selectedTutorId)
    : null;

  const orderData = {
    course_id:          currentCourse.id,
    date_start:         dateVal,
    time_start:         timeVal,
    duration:           currentCourse.total_length,
    persons:            students,
    price:              totalCost,
    early_registration: auto.earlyRegistration,
    group_enrollment:   auto.groupEnrollment,
    intensive_course:   auto.intensiveCourse,
    supplementary:
      document.getElementById('opt-supplementary')?.checked || false,
    personalized:
      document.getElementById('opt-personalized')?.checked  || false,
    excursions:
      document.getElementById('opt-excursions')?.checked    || false,
    assessment:
      document.getElementById('opt-assessment')?.checked    || false,
    interactive:
      document.getElementById('opt-interactive')?.checked   || false,
  };

  if (tutor) {
    orderData.tutor_id = tutor.id;
  }

  try {
    await createOrder(orderData);

    const modalEl = document.getElementById('courseModal');
    const modal   = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    showNotification(
      'Заявка успешно отправлена! Проверьте личный кабинет.', 'success'
    );
  } catch (err) {
    showNotification(
      'Ошибка при отправке заявки: ' + err.message, 'danger'
    );
  }
}

/* ======================================================
   КАРТА УЧЕБНЫХ РЕСУРСОВ (Яндекс.Карты)
   ====================================================== */

let resourcesMap = null;
let resourcesPlacemarks = [];
let allResources = [];
let filteredResources = [];

// Данные о ресурсах для изучения языков в Москве
const languageResources = [
  {
    id: 1,
    name: 'Языковая школа "Полиглот"',
    type: 'school',
    typeName: 'языковая школа',
    coordinates: [55.7558, 37.6173],
    address: 'ул. Тверская, 12, Москва',
    hours: 'Пн-Пт: 9:00-21:00, Сб: 10:00-18:00',
    phone: '+7 (495) 123-45-67',
    description: 'Курсы английского, немецкого, французского языков. Подготовка к IELTS, TOEFL.'
  },
  {
    id: 2,
    name: 'Библиотека иностранной литературы',
    type: 'library',
    typeName: 'библиотека',
    coordinates: [55.7470, 37.6377],
    address: 'ул. Николоямская, 1, Москва',
    hours: 'Пн-Сб: 10:00-20:00, Вс: выходной',
    phone: '+7 (495) 915-36-36',
    description: 'Богатая коллекция книг на иностранных языках. Разговорные клубы.'
  },
  {
    id: 3,
    name: 'Language Cafe "Speak Up"',
    type: 'cafe',
    typeName: 'языковое кафе',
    coordinates: [55.7612, 37.6084],
    address: 'Камергерский пер., 5, Москва',
    hours: 'Ежедневно: 12:00-23:00',
    phone: '+7 (495) 987-65-43',
    description: 'Разговорная практика с носителями языка. Тематические вечера.'
  },
  {
    id: 4,
    name: 'Британский культурный центр',
    type: 'center',
    typeName: 'культурный центр',
    coordinates: [55.7539, 37.5978],
    address: 'Николоямская ул., 1, Москва',
    hours: 'Пн-Пт: 10:00-19:00',
    phone: '+7 (495) 782-02-00',
    description: 'Культурные мероприятия, лекции, выставки на английском языке.'
  },
  {
    id: 5,
    name: 'Клуб любителей немецкого языка',
    type: 'club',
    typeName: 'языковой клуб',
    coordinates: [55.7650, 37.6200],
    address: 'ул. Петровка, 25, Москва',
    hours: 'Ср, Пт: 18:00-21:00',
    phone: '+7 (495) 111-22-33',
    description: 'Разговорный клуб для изучающих немецкий. Встречи с носителями.'
  },
  {
    id: 6,
    name: 'Институт Сервантеса',
    type: 'center',
    typeName: 'культурный центр',
    coordinates: [55.7580, 37.6100],
    address: 'Новинский бульвар, 20А, Москва',
    hours: 'Пн-Пт: 9:00-20:00, Сб: 10:00-14:00',
    phone: '+7 (495) 937-34-40',
    description: 'Курсы испанского языка, культурные мероприятия, библиотека.'
  },
  {
    id: 7,
    name: 'Французский институт',
    type: 'center',
    typeName: 'культурный центр',
    coordinates: [55.7480, 37.5900],
    address: 'Милютинский пер., 7а, Москва',
    hours: 'Пн-Пт: 10:00-19:00',
    phone: '+7 (495) 937-34-00',
    description: 'Курсы французского, кинопоказы, выставки, медиатека.'
  },
  {
    id: 8,
    name: 'Библиотека им. Достоевского',
    type: 'library',
    typeName: 'библиотека',
    coordinates: [55.7700, 37.6350],
    address: 'Чистопрудный бульвар, 23, Москва',
    hours: 'Пн-Сб: 11:00-21:00',
    phone: '+7 (495) 621-53-01',
    description: 'Отдел иностранной литературы, языковые курсы для читателей.'
  },
  {
    id: 9,
    name: 'English First',
    type: 'school',
    typeName: 'языковая школа',
    coordinates: [55.7520, 37.6250],
    address: 'Покровский бульвар, 11, Москва',
    hours: 'Пн-Пт: 8:00-22:00, Сб-Вс: 9:00-18:00',
    phone: '+7 (495) 926-93-00',
    description: 'Международная сеть языковых школ. Все уровни английского.'
  },
  {
    id: 10,
    name: 'Итальянский культурный центр',
    type: 'center',
    typeName: 'культурный центр',
    coordinates: [55.7450, 37.6050],
    address: 'Малый Козихинский пер., 4, Москва',
    hours: 'Пн-Пт: 10:00-18:00',
    phone: '+7 (495) 916-54-91',
    description: 'Курсы итальянского языка, культурные мероприятия.'
  },
  {
    id: 11,
    name: 'Conversation Club Moscow',
    type: 'club',
    typeName: 'языковой клуб',
    coordinates: [55.7590, 37.5850],
    address: 'Арбат, 35, Москва',
    hours: 'Вт, Чт, Сб: 19:00-22:00',
    phone: '+7 (495) 222-33-44',
    description: 'Мультиязычный разговорный клуб. Английский, испанский, французский.'
  },
  {
    id: 12,
    name: 'Японский культурный центр',
    type: 'center',
    typeName: 'культурный центр',
    coordinates: [55.7400, 37.6150],
    address: 'Грохольский пер., 13, Москва',
    hours: 'Пн-Пт: 10:00-19:00',
    phone: '+7 (495) 626-55-83',
    description: 'Курсы японского языка, каллиграфия, чайные церемонии.'
  }
];

function initResourcesMap() {
  ymaps.ready(function() {
    // Создаём карту с центром в Москве
    resourcesMap = new ymaps.Map('yandex-map', {
      center: [55.7558, 37.6173],
      zoom: 12,
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
    });

    // Загружаем ресурсы
    allResources = [...languageResources];
    filteredResources = [...allResources];

    // Добавляем метки на карту
    addResourcesMarkers();

    // Отображаем список ресурсов
    renderResourcesList();

    console.log('Карта учебных ресурсов инициализирована');
  });
}

function addResourcesMarkers() {
  // Удаляем старые метки
  resourcesPlacemarks.forEach(placemark => {
    resourcesMap.geoObjects.remove(placemark);
  });
  resourcesPlacemarks = [];

  // Цвета для разных типов ресурсов
  const typeColors = {
    school: '#ff4d94',
    library: '#00d4ff',
    cafe: '#ff6b9d',
    center: '#9b59b6',
    club: '#f39c12'
  };

  // Добавляем новые метки
  filteredResources.forEach(resource => {
    const color = typeColors[resource.type] || '#ff4d94';

    const placemark = new ymaps.Placemark(
      resource.coordinates,
      {
        hintContent: resource.name,
        balloonContentHeader: `<strong>${resource.name}</strong>`,
        balloonContentBody: `
          <div style="padding: 10px;">
            <p><strong>Тип:</strong> ${resource.typeName}</p>
            <p><strong>Адрес:</strong> ${resource.address}</p>
            <p><strong>Часы работы:</strong> ${resource.hours}</p>
            <p><strong>Телефон:</strong> ${resource.phone}</p>
            <p>${resource.description}</p>
          </div>
        `
      },
      {
        preset: 'islands#dotIcon',
        iconColor: color
      }
    );

    // Обработчик клика на метку
    placemark.events.add('click', function() {
      highlightResource(resource.id);
    });

    resourcesMap.geoObjects.add(placemark);
    resourcesPlacemarks.push(placemark);
  });
}

function renderResourcesList() {
  const container = document.getElementById('resources-list');
  if (!container) return;

  if (filteredResources.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <p>Ресурсы не найдены</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredResources.map(resource => `
    <div class="resource-item" data-resource-id="${resource.id}" onclick="selectResource(${resource.id})">
      <div class="resource-header">
        <div class="resource-name">${resource.name}</div>
        <span class="resource-type resource-type-${resource.type}">${resource.typeName}</span>
      </div>
      <div class="resource-address">
        📍 ${resource.address}
      </div>
      <div class="resource-hours">
        🕒 ${resource.hours}
      </div>
      <div class="resource-description">${resource.description}</div>
    </div>
  `).join('');
}

function selectResource(resourceId) {
  const resource = allResources.find(r => r.id === resourceId);
  if (!resource || !resourcesMap) return;

  // Центрируем карту на выбранном ресурсе
  resourcesMap.setCenter(resource.coordinates, 15, {
    duration: 300
  });

  // Подсвечиваем элемент в списке
  highlightResource(resourceId);

  // Открываем балун на метке
  const index = filteredResources.findIndex(r => r.id === resourceId);
  if (index >= 0 && resourcesPlacemarks[index]) {
    resourcesPlacemarks[index].balloon.open();
  }
}

function highlightResource(resourceId) {
  // Убираем выделение со всех элементов
  document.querySelectorAll('.resource-item').forEach(item => {
    item.classList.remove('active');
  });

  // Выделяем выбранный элемент
  const selectedItem = document.querySelector(`.resource-item[data-resource-id="${resourceId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
    selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function filterResources() {
  const typeFilter = document.getElementById('resource-type-filter').value;
  const searchQuery = document.getElementById('resource-search').value.toLowerCase().trim();

  filteredResources = allResources.filter(resource => {
    // Фильтр по типу
    const matchesType = !typeFilter || resource.type === typeFilter;

    // Фильтр по поиску
    const matchesSearch = !searchQuery ||
      resource.name.toLowerCase().includes(searchQuery) ||
      resource.address.toLowerCase().includes(searchQuery) ||
      resource.description.toLowerCase().includes(searchQuery);

    return matchesType && matchesSearch;
  });

  // Обновляем метки на карте
  if (resourcesMap) {
    addResourcesMarkers();

    // Подстраиваем масштаб карты под все метки
    if (filteredResources.length > 0) {
      const bounds = resourcesMap.geoObjects.getBounds();
      if (bounds) {
        resourcesMap.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: 50
        });
      }
    }
  }

  // Обновляем список
  renderResourcesList();

  showNotification(`Найдено ресурсов: ${filteredResources.length}`, 'info');
}
