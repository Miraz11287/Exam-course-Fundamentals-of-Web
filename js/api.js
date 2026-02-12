/* ============================================
   api.js — общие функции для работы с API
   ============================================ */

const API_BASE = 'http://exam-api-courses.std-900.ist.mospolytech.ru/api';
const API_KEY  = '4733eaf4-4488-484d-bab6-70863c53ffc9';

/* ---------- Универсальная обёртка fetch ---------- */

async function apiRequest(endpoint, method = 'GET', body = null) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${separator}api_key=${API_KEY}`;

  const options = {
    method,
    headers: {},
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Ошибка ${response.status}`);
  }

  return data;
}

/* ---------- Курсы ---------- */

function getCourses() {
  return apiRequest('/courses');
}

function getCourseById(id) {
  return apiRequest(`/courses/${id}`);
}

/* ---------- Репетиторы ---------- */

function getTutors() {
  return apiRequest('/tutors');
}

function getTutorById(id) {
  return apiRequest(`/tutors/${id}`);
}

/* ---------- Заявки (CRUD) ---------- */

function getOrders() {
  return apiRequest('/orders');
}

function getOrderById(id) {
  return apiRequest(`/orders/${id}`);
}

function createOrder(orderData) {
  return apiRequest('/orders', 'POST', orderData);
}

function updateOrder(id, orderData) {
  return apiRequest(`/orders/${id}`, 'PUT', orderData);
}

function deleteOrder(id) {
  return apiRequest(`/orders/${id}`, 'DELETE');
}

/* ---------- Уведомления (Bootstrap Alert) ---------- */

function showNotification(message, type = 'success') {
  const area = document.getElementById('notification-area');
  if (!area) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  area.appendChild(alert);

  setTimeout(() => {
    if (alert.parentNode) {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }
  }, 5000);
}

/* ---------- Пагинация ---------- */

function renderPagination(containerId, totalItems, itemsPerPage, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<nav><ul class="pagination justify-content-center">';

  html += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">Назад</a>
    </li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>`;
  }

  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">Вперёд</a>
    </li>`;

  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = parseInt(this.dataset.page);
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        onPageChange(page);
      }
    });
  });
}

/* ---------- Утилита: формат даты ---------- */

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU');
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
